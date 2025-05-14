import { v } from "convex/values";
import { action, mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Example segment levels for different variables
const SEGMENT_LEVELS = {
  Gender: ["Male", "Female"],
  Region: ["Asia", "Europe", "North America", "Other"],
  AgeGroup: ["18-24", "25-34", "35-44", "45+"],
};

// Define the type for the results
interface VanWestendorpResults {
  data: Array<{
    price: number;
    values: number[];
  }>;
  metrics: {
    pmcPoint: number;
    ipdPoint: number;
    opp: number;
    idp: number;
  };
  range: number[];
  optimal: number;
}

// Internal action for file processing
export const processFileData = action({
  args: {
    fileId: v.id("_storage"),
    mapping: v.object({
      tooCheap: v.string(),
      cheap: v.string(),
      expensive: v.string(),
      tooExpensive: v.string(),
      pricePoints: v.optional(v.array(v.number())),
      purchase: v.optional(v.string())
    }),
    projectId: v.id("projects"),
    analysisType: v.string(),
    segments: v.array(v.string())
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get the file content
    const fileContent = await ctx.storage.get(args.fileId);
    if (!fileContent) throw new Error("File content not found");

    // Parse CSV data
    const csvData = await fileContent.text();
    const rows = csvData.split("\n").map(row => row.split(","));
    const headers = rows[0];

    // Find column indices
    const tooCheapIndex = headers.indexOf(args.mapping.tooCheap);
    const cheapIndex = headers.indexOf(args.mapping.cheap);
    const expensiveIndex = headers.indexOf(args.mapping.expensive);
    const tooExpensiveIndex = headers.indexOf(args.mapping.tooExpensive);

    // Find segment column indices
    const segmentIndices = args.segments.map(segment => headers.indexOf(segment));

    if (tooCheapIndex === -1 || cheapIndex === -1 || expensiveIndex === -1 || tooExpensiveIndex === -1) {
      throw new Error("Missing required columns in CSV");
    }

    if (args.analysisType === "van_westendorp") {
      // Process overall results
      const overallResults = processVanWestendorpData(rows.slice(1), {
        tooCheapIndex,
        cheapIndex,
        expensiveIndex,
        tooExpensiveIndex
      });

      // Process segment results
      const segmentResults = args.segments.map((segment, segmentIndex) => {
        const segmentColumnIndex = segmentIndices[segmentIndex];
        if (segmentColumnIndex === -1) return null;

        // Get unique levels for this segment
        const levels = [...new Set(rows.slice(1).map(row => row[segmentColumnIndex]))];

        // Process data for each level
        const levelResults = levels.map(level => {
          const levelRows = rows.slice(1).filter(row => row[segmentColumnIndex] === level);
          
          // Skip empty levels
          if (levelRows.length === 0) return null;

          const levelData = processVanWestendorpData(levelRows, {
            tooCheapIndex,
            cheapIndex,
            expensiveIndex,
            tooExpensiveIndex
          });

          // Skip levels with no valid data
          if (levelData.data.length === 0) return null;

          return {
            name: level,
            data: levelData.data,
            metrics: levelData.metrics,
            range: levelData.range,
            optimal: levelData.metrics.opp
          };
        }).filter((result): result is {
          name: string;
          data: Array<{ price: number; values: number[] }>;
          metrics: { pmcPoint: number; ipdPoint: number; opp: number; idp: number };
          range: number[];
          optimal: number;
        } => result !== null);

        // Skip segments with no valid levels
        if (levelResults.length === 0) return null;

        return {
          segmentVariable: segment,
          levels: levelResults
        };
      }).filter((result): result is {
        segmentVariable: string;
        levels: Array<{
          name: string;
          data: Array<{ price: number; values: number[] }>;
          metrics: { pmcPoint: number; ipdPoint: number; opp: number; idp: number };
          range: number[];
          optimal: number;
        }>;
      } => result !== null);

      // Save results
      await ctx.runMutation(api.analysis.saveResults, {
        projectId: args.projectId,
        analysisType: args.analysisType,
        overallResults: {
          data: overallResults.data,
          metrics: overallResults.metrics,
          range: overallResults.range,
          optimal: overallResults.metrics.opp
        },
        segmentResults
      });
    }
  }
});

// Helper function to process Van Westendorp data
function processVanWestendorpData(rows: string[][], indices: {
  tooCheapIndex: number;
  cheapIndex: number;
  expensiveIndex: number;
  tooExpensiveIndex: number;
}) {
  // Collect all price points and their frequencies
  const pricePoints = new Map<number, {
    tooCheap: number;
    cheap: number;
    expensive: number;
    tooExpensive: number;
  }>();

  // Process each row
  for (const row of rows) {
    const tooCheap = parseFloat(row[indices.tooCheapIndex]);
    const cheap = parseFloat(row[indices.cheapIndex]);
    const expensive = parseFloat(row[indices.expensiveIndex]);
    const tooExpensive = parseFloat(row[indices.tooExpensiveIndex]);

    if (!isNaN(tooCheap)) {
      const current = pricePoints.get(tooCheap) || { tooCheap: 0, cheap: 0, expensive: 0, tooExpensive: 0 };
      current.tooCheap++;
      pricePoints.set(tooCheap, current);
    }
    if (!isNaN(cheap)) {
      const current = pricePoints.get(cheap) || { tooCheap: 0, cheap: 0, expensive: 0, tooExpensive: 0 };
      current.cheap++;
      pricePoints.set(cheap, current);
    }
    if (!isNaN(expensive)) {
      const current = pricePoints.get(expensive) || { tooCheap: 0, cheap: 0, expensive: 0, tooExpensive: 0 };
      current.expensive++;
      pricePoints.set(expensive, current);
    }
    if (!isNaN(tooExpensive)) {
      const current = pricePoints.get(tooExpensive) || { tooCheap: 0, cheap: 0, expensive: 0, tooExpensive: 0 };
      current.tooExpensive++;
      pricePoints.set(tooExpensive, current);
    }
  }

  // Convert to arrays and sort by price
  const sortedPrices = Array.from(pricePoints.keys()).sort((a, b) => a - b);
  const totalRespondents = rows.length;

  // Calculate cumulative distributions
  const processedData = sortedPrices.map(price => {
    // For Too Cheap and Cheap: inverse cumulative (decreasing from left to right)
    const tooCheapCount = Array.from(pricePoints.entries())
      .filter(([p]) => p >= price)
      .reduce((sum, [, point]) => sum + point.tooCheap, 0);
    
    const cheapCount = Array.from(pricePoints.entries())
      .filter(([p]) => p >= price)
      .reduce((sum, [, point]) => sum + point.cheap, 0);
    
    // For Expensive and Too Expensive: cumulative (increasing from left to right)
    const expensiveCount = Array.from(pricePoints.entries())
      .filter(([p]) => p <= price)
      .reduce((sum, [, point]) => sum + point.expensive, 0);
    
    const tooExpensiveCount = Array.from(pricePoints.entries())
      .filter(([p]) => p <= price)
      .reduce((sum, [, point]) => sum + point.tooExpensive, 0);

    return {
      price,
      values: [
        (tooCheapCount / totalRespondents) * 100,
        (cheapCount / totalRespondents) * 100,
        (expensiveCount / totalRespondents) * 100,
        (tooExpensiveCount / totalRespondents) * 100
      ]
    };
  });

  // Calculate key metrics
  const metrics = {
    pmcPoint: findIntersection(processedData, 0, 2), // Too Cheap vs Expensive
    ipdPoint: findIntersection(processedData, 1, 3), // Cheap vs Too Expensive
    opp: findIntersection(processedData, 1, 2),      // Cheap vs Expensive
    idp: findIntersection(processedData, 0, 3)       // Too Cheap vs Too Expensive
  };

  // Calculate acceptable price range
  const range = [metrics.pmcPoint, metrics.ipdPoint];

  return {
    data: processedData,
    metrics,
    range
  };
}

// Mutation to save settings
export const saveMapping = mutation({
  args: {
    projectId: v.id("projects"),
    mapping: v.object({
      respondentId: v.string(),
      tooCheap: v.optional(v.string()),
      cheap: v.optional(v.string()),
      expensive: v.optional(v.string()),
      tooExpensive: v.optional(v.string()),
      purchase: v.optional(v.string()),
      pricePoints: v.optional(v.array(v.number())),
      purchaseIntents: v.optional(v.record(v.string(), v.string())),
    }),
    segments: v.array(v.string()),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // Validate Gabor-Granger inputs
    if (project.analysisType === "gabor_granger") {
      if (!args.mapping.pricePoints || args.mapping.pricePoints.length === 0) {
        throw new Error("Price points are required for Gabor-Granger analysis");
      }
      if (!args.mapping.purchaseIntents || Object.keys(args.mapping.purchaseIntents).length === 0) {
        throw new Error("Purchase intent mappings are required for Gabor-Granger analysis");
      }
      // Ensure each price point has a corresponding purchase intent mapping
      const missingMappings = args.mapping.pricePoints.filter(
        price => !args.mapping.purchaseIntents?.[price.toString()]
      );
      if (missingMappings.length > 0) {
        throw new Error(`Missing purchase intent mappings for price points: ${missingMappings.join(", ")}`);
      }
    }

    await ctx.db.insert("analysisSettings", {
      projectId: args.projectId,
      analysisType: project.analysisType,
      mappings: args.mapping,
      segments: args.segments,
      userId,
    });

    return null;
  },
});

// Mutation to save results
export const saveResults = mutation({
  args: {
    projectId: v.id("projects"),
    analysisType: v.string(),
    overallResults: v.object({
      optimal: v.number(),
      range: v.array(v.number()),
      data: v.array(v.object({
        price: v.number(),
        values: v.array(v.number())
      })),
      metrics: v.object({
        pmcPoint: v.number(),
        ipdPoint: v.number(),
        opp: v.number(),
        idp: v.number()
      })
    }),
    segmentResults: v.array(v.object({
      segmentVariable: v.string(),
      levels: v.array(v.object({
        name: v.string(),
        data: v.array(v.object({
          price: v.number(),
          values: v.array(v.number())
        })),
        optimal: v.number(),
        range: v.array(v.number()),
        metrics: v.object({
          pmcPoint: v.number(),
          ipdPoint: v.number(),
          opp: v.number(),
          idp: v.number()
        })
      }))
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.insert("results", {
      projectId: args.projectId,
      analysisType: args.analysisType,
      userId,
      createdAt: Date.now(),
      overallResults: args.overallResults,
      segmentResults: args.segmentResults
    });
  }
});

export const getResults = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get the latest result for this project
    const results = await ctx.db
      .query("results")
      .withIndex("by_project_and_time", (q) => 
        q.eq("projectId", args.projectId)
      )
      .order("desc")
      .take(1);

    return results[0] || null;
  },
});

export const getSettings = internalQuery({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("analysisSettings")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .unique();
  },
});

// Helper function to calculate intersection points
function calculateIntersection(data: { price: number; values: number[] }[], index1: number, index2: number): number {
  if (data.length < 2) return 0;

  // Find the point where the two curves cross
  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i + 1];
    
    const value1Diff = next.values[index1] - current.values[index1];
    const value2Diff = next.values[index2] - current.values[index2];
    
    if ((value1Diff > 0 && value2Diff < 0) || (value1Diff < 0 && value2Diff > 0)) {
      // Linear interpolation to find the exact intersection point
      const t = (current.values[index2] - current.values[index1]) / 
                ((next.values[index1] - current.values[index1]) - (next.values[index2] - current.values[index2]));
      return current.price + t * (next.price - current.price);
    }
  }
  
  // If no intersection found, return the midpoint of the price range
  return (data[0].price + data[data.length - 1].price) / 2;
}

// Helper function to find intersection points
function findIntersection(data: { price: number; values: number[] }[], index1: number, index2: number): number {
  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i + 1];
    
    // Check if the curves intersect between these points
    if ((current.values[index1] - current.values[index2]) * 
        (next.values[index1] - next.values[index2]) <= 0) {
      // Linear interpolation to find the intersection point
      const t = (current.values[index1] - current.values[index2]) / 
                ((current.values[index1] - current.values[index2]) - 
                 (next.values[index1] - next.values[index2]));
      return current.price + t * (next.price - current.price);
    }
  }
  return 0; // Return 0 if no intersection found
}

// Add a new mutation for saving Van Westendorp results
export const saveVanWestendorpResults = mutation({
  args: {
    projectId: v.id("projects"),
    data: v.array(v.object({
      price: v.number(),
      values: v.array(v.number())
    })),
    metrics: v.object({
      pmcPoint: v.number(),
      ipdPoint: v.number(),
      opp: v.number(),
      idp: v.number()
    }),
    range: v.array(v.number())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Insert the results with the correct structure
    await ctx.db.insert("results", {
      projectId: args.projectId,
      userId,
      analysisType: "van_westendorp",
      createdAt: Date.now(),
      overallResults: {
        data: args.data,
        metrics: args.metrics,
        range: args.range,
        optimal: args.metrics.opp
      },
      segmentResults: []
    });
  }
});
