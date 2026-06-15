import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { assertWorkspaceBrowseAccess } from "./lib/eventsLib";
import { buildIntelligenceHub, type IntelligenceHubResult } from "./lib/intelligenceHubLib";

export const getHub = query({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args): Promise<IntelligenceHubResult> => {
    const userId = await requireUserId(ctx);
    const workspace = await assertWorkspaceBrowseAccess(ctx, args.workspaceId, userId);
    return buildIntelligenceHub(ctx, workspace._id);
  },
});

export type { IntelligenceHubResult };
