import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    analysisType: v.string(),
    userId: v.id("users"),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  dataFiles: defineTable({
    projectId: v.id("projects"),
    fileName: v.string(),
    fileId: v.id("_storage"),
    variables: v.array(v.string()),
    userId: v.id("users"),
  }).index("by_project", ["projectId"]),

  analysisSettings: defineTable({
    projectId: v.id("projects"),
    analysisType: v.string(),
    mappings: v.object({
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
    userId: v.id("users"),
  }).index("by_project", ["projectId"]),

  results: defineTable({
    projectId: v.id("projects"),
    analysisType: v.string(),
    createdAt: v.optional(v.number()),
    overallResults: v.object({
      optimal: v.number(),
      range: v.array(v.number()),
      data: v.array(v.object({
        price: v.number(),
        values: v.array(v.number()),
      })),
      metrics: v.optional(v.object({
        pmcPoint: v.optional(v.number()),
        ipdPoint: v.optional(v.number()),
        opp: v.optional(v.number()),
        idp: v.optional(v.number()),
      })),
    }),
    segmentResults: v.array(v.object({
      segmentVariable: v.string(),
      levels: v.array(v.object({
        name: v.string(),
        data: v.array(v.object({
          price: v.number(),
          values: v.array(v.number()),
        })),
        optimal: v.number(),
        range: v.array(v.number()),
        metrics: v.optional(v.object({
          pmcPoint: v.optional(v.number()),
          ipdPoint: v.optional(v.number()),
          opp: v.optional(v.number()),
          idp: v.optional(v.number()),
        })),
      })),
    })),
    userId: v.id("users"),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_time", ["projectId", "createdAt"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
