import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  onboardingProfiles: defineTable({
    userId: v.string(),
    companyName: v.string(),
    timelineName: v.string(),
    companyType: v.optional(v.string()),
    trackTypes: v.array(v.string()),
    tools: v.array(v.string()),
    exampleQuestion: v.optional(v.string()),
    currentStep: v.number(),
    completedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),

  workspaces: defineTable({
    externalId: v.string(),
    userId: v.string(),
    name: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_externalId", ["externalId"]),

  userWorkspacePrefs: defineTable({
    userId: v.string(),
    activeWorkspaceExternalId: v.string(),
    updatedAt: v.string(),
  }).index("by_userId", ["userId"]),
});
