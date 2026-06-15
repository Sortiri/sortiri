import type { Id } from "../../../convex/_generated/dataModel";

type CreateFromAnchorArgs = {
  workspaceId: string;
  title: string;
  anchor: {
    type: "event" | "workstream" | "project" | "view" | "entity" | "manual";
    eventId?: string;
    workstreamId?: string;
    projectId?: string;
    viewId?: string;
    entityId?: string;
    title: string;
    occurredAt?: number;
  };
  windowPreset?: "24h" | "7d" | "30d";
  projectId?: string;
  viewId?: string;
};

type ImpactMutations = {
  create: (args: {
    workspaceId: string;
    title: string;
    anchor: CreateFromAnchorArgs["anchor"] & {
      eventId?: Id<"events">;
      workstreamId?: Id<"workstreams">;
      projectId?: Id<"projects">;
      viewId?: Id<"savedViews">;
      entityId?: Id<"entities">;
    };
    windowPreset?: "24h" | "7d" | "30d";
    projectId?: Id<"projects">;
    viewId?: Id<"savedViews">;
  }) => Promise<{ analysisId: Id<"impactAnalyses"> }>;
  generate: (args: { analysisId: Id<"impactAnalyses"> }) => Promise<unknown>;
};

export async function createImpactFromAnchor(
  mutations: ImpactMutations,
  args: CreateFromAnchorArgs,
): Promise<string> {
  const result = await mutations.create({
    workspaceId: args.workspaceId,
    title: args.title,
    anchor: {
      ...args.anchor,
      eventId: args.anchor.eventId as Id<"events"> | undefined,
      workstreamId: args.anchor.workstreamId as Id<"workstreams"> | undefined,
      projectId: args.anchor.projectId as Id<"projects"> | undefined,
      viewId: args.anchor.viewId as Id<"savedViews"> | undefined,
      entityId: args.anchor.entityId as Id<"entities"> | undefined,
    },
    windowPreset: args.windowPreset ?? "7d",
    projectId: args.projectId as Id<"projects"> | undefined,
    viewId: args.viewId as Id<"savedViews"> | undefined,
  });
  await mutations.generate({ analysisId: result.analysisId });
  return result.analysisId;
}
