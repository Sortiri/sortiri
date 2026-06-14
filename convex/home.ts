import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { assertWorkspaceAccess } from "./lib/eventsLib";
import { buildCompanyPulse, type CompanyPulseResult } from "./lib/homePulse";

export const getPulse = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<CompanyPulseResult> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceAccess(ctx, args.workspaceId, userId);
    return buildCompanyPulse(ctx, workspace._id);
  },
});

export type { CompanyPulseResult };
