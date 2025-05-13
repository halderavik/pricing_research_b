import { v } from "convex/values";
import { action, mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Example segment levels for different variables
const SEGMENT_LEVELS = {
  Gender: ["Male", "Female"],
  Region: ["Asia", "Europe", "North America", "Other"],
  AgeGroup: ["18-24", "25-34", "35-44", "45+"],
};

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

    // Example analysis results - in real app, this would do actual calculations
    const isVanWestendorp = project.analysisType === "van_westendorp";
    
    if (isVanWestendorp) {
      const segmentResults = args.segments.map(segment => {
        const levels = SEGMENT_LEVELS[segment as keyof typeof SEGMENT_LEVELS] || [];
        return {
          segmentVariable: segment,
          levels: levels.map((level, i) => {
            // Generate slightly different data for each level
            const offset = (i - 1) * 0.1;
            return {
              name: level,
              data: [
                { price: 10, values: [0.8 + offset, 0.9 + offset, 0.2 + offset, 0.1 + offset] },
                { price: 20, values: [0.6 + offset, 0.7 + offset, 0.3 + offset, 0.2 + offset] },
                { price: 30, values: [0.4 + offset, 0.5 + offset, 0.5 + offset, 0.4 + offset] },
                { price: 40, values: [0.2 + offset, 0.3 + offset, 0.7 + offset, 0.6 + offset] },
                { price: 50, values: [0.1 + offset, 0.2 + offset, 0.9 + offset, 0.8 + offset] },
              ],
              optimal: 27.99 + (i * 2),
              range: [17.99 + (i * 2), 37.99 + (i * 2)],
              metrics: {
                pmcPoint: 17.99 + (i * 2),
                ipdPoint: 37.99 + (i * 2),
                opp: 27.99 + (i * 2),
                idp: 32.99 + (i * 2),
              },
            };
          }),
        };
      });

      await ctx.db.insert("results", {
        projectId: args.projectId,
        analysisType: project.analysisType,
        userId,
        createdAt: Date.now(),
        overallResults: {
          optimal: 29.99,
          range: [19.99, 39.99],
          data: [
            { price: 10, values: [0.8, 0.9, 0.2, 0.1] },
            { price: 20, values: [0.6, 0.7, 0.3, 0.2] },
            { price: 30, values: [0.4, 0.5, 0.5, 0.4] },
            { price: 40, values: [0.2, 0.3, 0.7, 0.6] },
            { price: 50, values: [0.1, 0.2, 0.9, 0.8] },
          ],
          metrics: {
            pmcPoint: 19.99,
            ipdPoint: 39.99,
            opp: 29.99,
            idp: 34.99,
          },
        },
        segmentResults,
      });
    } else {
      // Gabor-Granger analysis
      const segmentResults = args.segments.map(segment => {
        const levels = SEGMENT_LEVELS[segment as keyof typeof SEGMENT_LEVELS] || [];
        return {
          segmentVariable: segment,
          levels: levels.map((level, i) => {
            // Generate slightly different data for each level
            const offset = (i - 1) * 0.1;
            const pricePoints = args.mapping.pricePoints || [];
            return {
              name: level,
              data: pricePoints.map((price, index) => {
                // Generate purchase intent and revenue data for each price point
                const purchaseIntent = 0.9 - (index * 0.1) + offset;
                const revenue = price * purchaseIntent;
                return {
                  price,
                  values: [purchaseIntent, revenue],
                };
              }),
              optimal: pricePoints[Math.floor(pricePoints.length / 2)] + (i * 2),
              range: [
                pricePoints[0] + (i * 2),
                pricePoints[pricePoints.length - 1] + (i * 2)
              ],
            };
          }),
        };
      });

      // Calculate overall results
      const pricePoints = args.mapping.pricePoints || [];
      const overallData = pricePoints.map((price, index) => {
        const purchaseIntent = 0.9 - (index * 0.1);
        const revenue = price * purchaseIntent;
        return {
          price,
          values: [purchaseIntent, revenue],
        };
      });

      // Find optimal price point (price with highest revenue)
      const optimalPriceIndex = overallData.reduce((maxIndex, current, currentIndex, array) => {
        return current.values[1] > array[maxIndex].values[1] ? currentIndex : maxIndex;
      }, 0);

      await ctx.db.insert("results", {
        projectId: args.projectId,
        analysisType: project.analysisType,
        userId,
        createdAt: Date.now(),
        overallResults: {
          optimal: pricePoints[optimalPriceIndex],
          range: [pricePoints[0], pricePoints[pricePoints.length - 1]],
          data: overallData,
        },
        segmentResults,
      });
    }
  },
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
