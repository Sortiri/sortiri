import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getUserIdOrNull, requireUserId } from "./lib/auth";
import {
  buildTimelineName,
  docToProfile,
  type OnboardingProfile,
} from "./lib/onboardingDoc";
import { ensureOnboardingWorkspace } from "./lib/workspacesLib";

const profilePatch = v.object({
  companyName: v.optional(v.string()),
  timelineName: v.optional(v.string()),
  companyType: v.optional(v.union(v.string(), v.null())),
  trackTypes: v.optional(v.array(v.string())),
  tools: v.optional(v.array(v.string())),
  exampleQuestion: v.optional(v.union(v.string(), v.null())),
  currentStep: v.optional(v.number()),
});

async function getProfileDoc(ctx: QueryCtx | MutationCtx, userId: string) {
  return ctx.db
    .query("onboardingProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export const getProfile = query({
  args: {},
  handler: async (ctx): Promise<OnboardingProfile | null> => {
    const userId = await getUserIdOrNull(ctx);
    if (!userId) return null;
    const doc = await getProfileDoc(ctx, userId);
    return doc ? docToProfile(doc) : null;
  },
});

export const upsert = mutation({
  args: { patch: profilePatch },
  handler: async (ctx, { patch }): Promise<OnboardingProfile> => {
    const userId = await requireUserId(ctx);
    const now = new Date().toISOString();
    const existing = await getProfileDoc(ctx, userId);

    const companyName = patch.companyName ?? existing?.companyName ?? "";
    const merged: OnboardingProfile = {
      userId,
      companyName,
      timelineName:
        patch.timelineName ??
        existing?.timelineName ??
        buildTimelineName(companyName),
      companyType:
        patch.companyType !== undefined
          ? patch.companyType
          : (existing?.companyType ?? null),
      trackTypes: patch.trackTypes ?? existing?.trackTypes ?? [],
      tools: patch.tools ?? existing?.tools ?? [],
      exampleQuestion:
        patch.exampleQuestion !== undefined
          ? patch.exampleQuestion
          : (existing?.exampleQuestion ?? null),
      currentStep: patch.currentStep ?? existing?.currentStep ?? 0,
      completedAt: existing?.completedAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        companyName: merged.companyName,
        timelineName: merged.timelineName,
        companyType: merged.companyType ?? undefined,
        trackTypes: merged.trackTypes,
        tools: merged.tools,
        exampleQuestion: merged.exampleQuestion ?? undefined,
        currentStep: merged.currentStep,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("onboardingProfiles", {
        userId,
        companyName: merged.companyName,
        timelineName: merged.timelineName,
        companyType: merged.companyType ?? undefined,
        trackTypes: merged.trackTypes,
        tools: merged.tools,
        exampleQuestion: merged.exampleQuestion ?? undefined,
        currentStep: merged.currentStep,
        createdAt: now,
        updatedAt: now,
      });
    }

    const saved = await getProfileDoc(ctx, userId);
    return docToProfile(saved!);
  },
});

export const complete = mutation({
  args: {},
  handler: async (ctx): Promise<OnboardingProfile> => {
    const userId = await requireUserId(ctx);
    const now = new Date().toISOString();
    const existing = await getProfileDoc(ctx, userId);

    if (!existing) {
      throw new Error("Complete your onboarding before continuing.");
    }

    if (!existing.companyName.trim()) {
      throw new Error("Company name is required.");
    }
    if (!existing.companyType) {
      throw new Error("Company type is required.");
    }
    if (existing.trackTypes.length === 0) {
      throw new Error("Select at least one item to track.");
    }
    if (existing.tools.length === 0) {
      throw new Error("Select at least one tool.");
    }
    if (!existing.exampleQuestion) {
      throw new Error("Select an example question.");
    }

    const timelineName = buildTimelineName(existing.companyName);

    await ctx.db.patch(existing._id, {
      timelineName,
      completedAt: now,
      currentStep: Math.max(existing.currentStep, 5),
      updatedAt: now,
    });

    await ensureOnboardingWorkspace(ctx, userId, existing.companyName);

    const saved = await getProfileDoc(ctx, userId);
    return docToProfile(saved!);
  },
});
