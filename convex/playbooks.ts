import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  getCurrentUser,
  requireWorkspaceRole,
} from "./lib/authz";
import { assertWorkspaceBrowseAccess, insertEvent } from "./lib/eventsLib";
import {
  generatePlaybookFromLessons,
  playbookInputFromTemplate,
} from "./lib/playbookGeneration";
import { getDefaultPlaybookTemplates } from "./lib/playbookTemplates";
import {
  createPlaybookDoc,
  docToPlaybook,
  findPlaybookByTitle,
  listPlaybooksByProject,
  listPlaybooksForWorkspace,
  patchPlaybookDoc,
  suggestPlaybooksForGoal,
} from "./lib/playbooksLib";
import { docToLesson } from "./lib/lessonsLib";
import {
  playbookStatusValidator,
  playbookStepValidator,
  playbookTypeValidator,
  playbookValidationRequirementValidator,
} from "./lib/validators";

async function recordPlaybookEvent(
  ctx: Parameters<typeof insertEvent>[0],
  input: {
    workspaceId: Id<"workspaces">;
    playbookId: Id<"playbooks">;
    type: "playbook.generated" | "playbook.created" | "playbook.updated" | "playbook.archived";
    title: string;
    actor: { type: "human"; name?: string; email?: string; id?: string };
  },
): Promise<void> {
  await insertEvent(ctx, {
    workspaceId: input.workspaceId,
    source: "system",
    category: "system_event",
    type: input.type,
    actor: input.actor,
    title: input.title,
    summary: `Playbook ${input.type.replace("playbook.", "")}.`,
    entity: { type: "other", id: input.playbookId, name: input.title },
    visibility: "primary",
    importance: "normal",
    occurredAt: Date.now(),
  });
}

export const generateFromLessons = mutation({
  args: {
    workspaceId: v.string(),
    lessonIds: v.array(v.id("lessons")),
    title: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);

    if (args.lessonIds.length === 0) {
      throw new Error("At least one lesson is required");
    }

    const lessons = [];
    for (const lessonId of args.lessonIds) {
      const doc = await ctx.db.get(lessonId);
      if (!doc || doc.workspaceId !== workspace._id) {
        throw new Error("Lesson not found in workspace");
      }
      lessons.push(docToLesson(doc));
    }

    const input = generatePlaybookFromLessons({
      workspaceId: workspace._id,
      projectId: args.projectId,
      lessons,
      lessonIds: args.lessonIds,
      title: args.title,
    });

    const playbookId = await createPlaybookDoc(ctx, input);
    await recordPlaybookEvent(ctx, {
      workspaceId: workspace._id,
      playbookId,
      type: "playbook.generated",
      title: input.title,
      actor: {
        type: "human",
        id: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    return { playbookId };
  },
});

export const createManualPlaybook = mutation({
  args: {
    workspaceId: v.string(),
    title: v.string(),
    summary: v.string(),
    type: playbookTypeValidator,
    trigger: v.optional(v.string()),
    steps: v.array(playbookStepValidator),
    validationRequirements: v.optional(v.array(playbookValidationRequirementValidator)),
    projectId: v.optional(v.id("projects")),
    lessonIds: v.optional(v.array(v.id("lessons"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);

    const playbookId = await createPlaybookDoc(ctx, {
      workspaceId: workspace._id,
      projectId: args.projectId,
      title: args.title.trim(),
      summary: args.summary.trim(),
      type: args.type,
      status: "draft",
      trigger: args.trigger,
      steps: args.steps,
      validationRequirements: args.validationRequirements,
      lessonIds: args.lessonIds,
      createdBy: {
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    await recordPlaybookEvent(ctx, {
      workspaceId: workspace._id,
      playbookId,
      type: "playbook.created",
      title: args.title,
      actor: {
        type: "human",
        id: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });

    return { playbookId };
  },
});

export const createDefaults = mutation({
  args: {
    workspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { workspace } = await requireWorkspaceRole(ctx, args.workspaceId, [
      "owner",
      "admin",
      "member",
    ]);

    const createdIds: Id<"playbooks">[] = [];
    for (const template of getDefaultPlaybookTemplates()) {
      const existing = await findPlaybookByTitle(ctx, workspace._id, template.title);
      if (existing) {
        continue;
      }
      const input = playbookInputFromTemplate(workspace._id, template);
      const playbookId = await createPlaybookDoc(ctx, input);
      createdIds.push(playbookId);
      await recordPlaybookEvent(ctx, {
        workspaceId: workspace._id,
        playbookId,
        type: "playbook.created",
        title: input.title,
        actor: {
          type: "human",
          id: user.clerkUserId,
          email: user.email,
          name: user.name,
        },
      });
    }

    return { playbookIds: createdIds };
  },
});

export const getById = query({
  args: {
    playbookId: v.id("playbooks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const playbook = await ctx.db.get(args.playbookId);
    if (!playbook) {
      return null;
    }

    const workspace = await ctx.db.get(playbook.workspaceId);
    if (!workspace) {
      return null;
    }

    await assertWorkspaceBrowseAccess(ctx, workspace.externalId, user.clerkUserId);

    const lessons = [];
    for (const lessonId of playbook.lessonIds ?? []) {
      const lesson = await ctx.db.get(lessonId);
      if (lesson) {
        lessons.push(docToLesson(lesson));
      }
    }

    return {
      playbook: docToPlaybook(playbook),
      lessons,
    };
  },
});

export const listByWorkspace = query({
  args: {
    workspaceId: v.string(),
    type: v.optional(playbookTypeValidator),
    status: v.optional(playbookStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    return listPlaybooksForWorkspace(ctx, workspace._id, {
      type: args.type,
      status: args.status,
      limit: args.limit,
    });
  },
});

export const listByProject = query({
  args: {
    workspaceId: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const playbooks = await listPlaybooksByProject(ctx, args.projectId);
    return playbooks.filter((p) => p.workspaceId === workspace._id);
  },
});

export const update = mutation({
  args: {
    playbookId: v.id("playbooks"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    trigger: v.optional(v.string()),
    steps: v.optional(v.array(playbookStepValidator)),
    validationRequirements: v.optional(v.array(playbookValidationRequirementValidator)),
    lessonIds: v.optional(v.array(v.id("lessons"))),
    status: v.optional(playbookStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const playbook = await ctx.db.get(args.playbookId);
    if (!playbook) {
      throw new Error("Playbook not found");
    }

    const workspace = await ctx.db.get(playbook.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const { membership } = await requireWorkspaceRole(ctx, workspace.externalId, [
      "owner",
      "admin",
      "member",
    ]);

    if (
      membership.role === "member" &&
      playbook.createdBy?.clerkUserId !== user.clerkUserId
    ) {
      throw new Error("Members can only update their own playbooks");
    }

    const { playbookId, ...patch } = args;
    await patchPlaybookDoc(ctx, playbookId, patch);

    await recordPlaybookEvent(ctx, {
      workspaceId: playbook.workspaceId,
      playbookId,
      type: "playbook.updated",
      title: args.title ?? playbook.title,
      actor: {
        type: "human",
        id: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });
  },
});

export const archive = mutation({
  args: {
    playbookId: v.id("playbooks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const playbook = await ctx.db.get(args.playbookId);
    if (!playbook) {
      throw new Error("Playbook not found");
    }

    const workspace = await ctx.db.get(playbook.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    await patchPlaybookDoc(ctx, args.playbookId, { status: "archived" });

    await recordPlaybookEvent(ctx, {
      workspaceId: playbook.workspaceId,
      playbookId: args.playbookId,
      type: "playbook.archived",
      title: playbook.title,
      actor: {
        type: "human",
        id: user.clerkUserId,
        email: user.email,
        name: user.name,
      },
    });
  },
});

export const activate = mutation({
  args: {
    playbookId: v.id("playbooks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const playbook = await ctx.db.get(args.playbookId);
    if (!playbook) {
      throw new Error("Playbook not found");
    }

    const workspace = await ctx.db.get(playbook.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    await requireWorkspaceRole(ctx, workspace.externalId, ["owner", "admin"]);
    await patchPlaybookDoc(ctx, args.playbookId, { status: "active" });
    return { playbookId: args.playbookId };
  },
});

export const suggestForGoal = query({
  args: {
    workspaceId: v.string(),
    goal: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const workspace = await assertWorkspaceBrowseAccess(
      ctx,
      args.workspaceId,
      user.clerkUserId,
    );
    const playbooks = await listPlaybooksForWorkspace(ctx, workspace._id, {
      status: "active",
      limit: 100,
    });
    return suggestPlaybooksForGoal(playbooks, args.goal);
  },
});
