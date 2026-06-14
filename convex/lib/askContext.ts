import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  filterPrimaryEventRecords,
  questionRequestsDebugEvents,
} from "./eventDisplay";
import {
  docToEntity,
  getEntityTimelineEvents,
  searchEntitiesForWorkspace,
  type EntityRecord,
} from "./entitiesLib";
import {
  getConfidenceLabel,
  listLinksForEventIds,
  type LinkWithEvents,
} from "./eventLinksLib";
import {
  listEventsByWorkstream,
  listEventsForWorkspace,
  searchEventsForWorkspace,
  type EventRecord,
} from "./eventsLib";
import {
  listWorkstreamsForWorkspace,
  searchWorkstreamsForWorkspace,
  docToWorkstream,
  type WorkstreamRecord,
} from "./workstreamsLib";
import { listEntitiesByProject } from "./projectPulse";
import { docToProjectRecord } from "./projectsLib";
import { applySavedViewFilters } from "./savedViewEvents";
import { assertSavedViewAccess } from "./savedViewsLib";
import { getWorkspaceMembership } from "./authz";

type DbReadCtx = Pick<QueryCtx, "db">;

type RetrieveAskContextOptions = {
  workstreamId?: Id<"workstreams">;
  entityId?: Id<"entities">;
  projectId?: Id<"projects">;
  viewId?: Id<"savedViews">;
  clerkUserId?: string;
};

export type AskContextResult = {
  contextText: string;
  eventIds: Id<"events">[];
  workstreamIds: Id<"workstreams">[];
  events: EventRecord[];
  workstreams: WorkstreamRecord[];
};

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function getActorName(actor: EventRecord["actor"]): string {
  return actor.name ?? actor.id ?? actor.type;
}

function isMetaAskEvent(event: EventRecord): boolean {
  if (event.type.startsWith("ask.")) return true;
  if (event.tags?.includes("meta")) return true;
  return false;
}

function filterAskContextEvents(events: EventRecord[]): EventRecord[] {
  return events.filter((event) => !isMetaAskEvent(event));
}

export function formatAskContext(args: {
  events: EventRecord[];
  workstreams: WorkstreamRecord[];
  relatedLinks?: LinkWithEvents[];
  entityContexts?: Array<{ entity: EntityRecord; events: EventRecord[] }>;
  projectName?: string;
  viewName?: string;
  viewDescription?: string;
}): string {
  const eventLines = args.events.map((event) => {
    const lines = [
      `[${event.id}]`,
      `Time: ${formatTimestamp(event.occurredAt)}`,
      `Category: ${event.category}`,
      `Source: ${event.source}`,
      `Actor: ${getActorName(event.actor)}`,
      `Title: ${event.title}`,
    ];
    if (event.summary) {
      lines.push(`Summary: ${event.summary}`);
    }
    if (event.visibility === "debug") {
      lines.push("Visibility: DEBUG");
    }
    if (event.workstreamId) {
      lines.push(`WorkstreamId: ${event.workstreamId}`);
    }
    return lines.join("\n");
  });

  const workstreamLines = args.workstreams.map((workstream) => {
    const lines = [
      `[${workstream.id}]`,
      `Title: ${workstream.title}`,
      `Status: ${workstream.status}`,
    ];
    if (workstream.summary) {
      lines.push(`Summary: ${workstream.summary}`);
    }
    return lines.join("\n");
  });

  const relatedLines =
    args.relatedLinks?.map((item) => {
      const fromTitle = item.fromEvent?.title ?? item.link.fromEventId ?? "Unknown";
      const toTitle = item.toEvent?.title ?? item.link.toEventId ?? "Unknown";
      const confidence = getConfidenceLabel(item.link.confidence);
      return [
        `Event [${item.link.fromEventId}] (${fromTitle}) → Event [${item.link.toEventId}] (${toTitle})`,
        `Type: ${item.link.type}`,
        `Reason: ${item.link.reason}`,
        `Confidence: ${confidence}`,
      ].join("\n");
    }) ?? [];

  const entityBlocks =
    args.entityContexts?.map(({ entity, events }) => {
      const lines = [
        `Entity: ${entity.name}`,
        `Type: ${entity.type}`,
        `Key: ${entity.key}`,
        "Events:",
        events.length > 0
          ? events
              .slice(0, 15)
              .map(
                (event) =>
                  `- [${formatTimestamp(event.occurredAt)}] ${event.title}`,
              )
              .join("\n")
          : "(none)",
      ];
      return lines.join("\n");
    }) ?? [];

  return [
    ...(args.viewName
      ? [
          "VIEW CONTEXT",
          `View: ${args.viewName}`,
          ...(args.viewDescription ? [`Description: ${args.viewDescription}`] : []),
          "",
        ]
      : []),
    ...(args.projectName ? [`PROJECT: ${args.projectName}`, ""] : []),
    "EVENTS",
    "",
    eventLines.length > 0 ? eventLines.join("\n\n") : "(none)",
    "",
    "WORKSTREAMS",
    "",
    workstreamLines.length > 0 ? workstreamLines.join("\n\n") : "(none)",
    "",
    "RELATED HISTORY",
    "",
    relatedLines.length > 0 ? relatedLines.join("\n\n") : "(none)",
    "",
    "ENTITY CONTEXT",
    "",
    entityBlocks.length > 0 ? entityBlocks.join("\n\n") : "(none)",
  ].join("\n");
}

export async function retrieveAskContext(
  ctx: DbReadCtx,
  workspaceDocId: Id<"workspaces">,
  question: string,
  options: RetrieveAskContextOptions = {},
): Promise<AskContextResult> {
  const includeDebug = questionRequestsDebugEvents(question);
  let projectName: string | undefined;
  let viewName: string | undefined;
  let viewDescription: string | undefined;

  if (options.viewId && options.clerkUserId) {
    const membership = await getWorkspaceMembership(
      ctx,
      workspaceDocId,
      options.clerkUserId,
    );
    if (membership) {
      const view = await assertSavedViewAccess(ctx, options.viewId, membership);
      viewName = view.name;
      viewDescription = view.description;

      const viewEvents = await applySavedViewFilters(ctx, workspaceDocId, view.filters, {
        limit: 40,
      });

      const workstreamMap = new Map<string, WorkstreamRecord>();
      for (const event of viewEvents) {
        if (event.workstreamId) {
          const workstreamDoc = await ctx.db.get(event.workstreamId as Id<"workstreams">);
          if (workstreamDoc && workstreamDoc.workspaceId === workspaceDocId) {
            workstreamMap.set(workstreamDoc._id, docToWorkstream(workstreamDoc));
          }
        }
      }

      const entityContexts: Array<{ entity: EntityRecord; events: EventRecord[] }> = [];
      const entityKeys = new Set<string>();
      for (const event of viewEvents) {
        if (!event.entity?.type) continue;
        const key = `${event.entity.type}:${event.entity.id ?? event.entity.name ?? ""}`;
        if (entityKeys.has(key)) continue;
        entityKeys.add(key);

        const entityDoc = await ctx.db
          .query("entities")
          .withIndex("by_workspace_type_key", (q) =>
            q
              .eq("workspaceId", workspaceDocId)
              .eq("type", event.entity!.type as EntityRecord["type"])
              .eq("key", event.entity!.id ?? event.entity!.name ?? ""),
          )
          .unique();

        if (entityDoc) {
          const record = docToEntity(entityDoc);
          entityContexts.push({
            entity: record,
            events: viewEvents.filter(
              (item) =>
                item.entity?.type === record.type &&
                (item.entity.id === record.key || item.entity.name === record.name),
            ),
          });
        }
      }

      let events = filterAskContextEvents(viewEvents);
      if (!includeDebug) {
        events = filterPrimaryEventRecords(events);
      }
      const workstreams = Array.from(workstreamMap.values()).sort(
        (a, b) => b.startedAt - a.startedAt,
      );

      const primaryEventIds = events.slice(0, 10).map((event) => event.id as Id<"events">);
      const relatedLinks = await listLinksForEventIds(ctx, primaryEventIds, 3);

      return {
        contextText: formatAskContext({
          events,
          workstreams,
          relatedLinks,
          entityContexts,
          viewName,
          viewDescription,
        }),
        eventIds: events.map((event) => event.id as Id<"events">),
        workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
        events,
        workstreams,
      };
    }
  }

  if (options.projectId) {
    const projectDoc = await ctx.db.get(options.projectId);
    if (projectDoc && projectDoc.workspaceId === workspaceDocId) {
      const workspace = await ctx.db.get(workspaceDocId);
      if (workspace) {
        projectName = docToProjectRecord(projectDoc, workspace.externalId).name;
      }

      const projectEvents = await listEventsForWorkspace(ctx, workspaceDocId, {
        projectId: options.projectId,
        limit: 30,
        visibility: includeDebug ? "all" : "primary",
        includeDebug,
      });
      const projectWorkstreams = await listWorkstreamsForWorkspace(ctx, workspaceDocId, {
        projectId: options.projectId,
        limit: 10,
      });
      const projectEntities = await listEntitiesByProject(
        ctx,
        workspaceDocId,
        options.projectId,
        { limit: 5 },
      );

      const eventMap = new Map<string, EventRecord>();
      for (const event of projectEvents) {
        eventMap.set(event.id, event);
      }

      const workstreamMap = new Map<string, WorkstreamRecord>();
      for (const workstream of projectWorkstreams) {
        workstreamMap.set(workstream.id, workstream);
      }

      const entityContexts: Array<{ entity: EntityRecord; events: EventRecord[] }> = [];
      for (const entity of projectEntities) {
        const timelineEvents = (
          await getEntityTimelineEvents(ctx, workspaceDocId, entity, {
            visibility: includeDebug ? "all" : "primary",
            limit: 20,
          })
        ).filter((event) => event.projectId === options.projectId);

        entityContexts.push({ entity, events: timelineEvents });
        for (const event of timelineEvents) {
          eventMap.set(event.id, event);
        }
      }

      let events = filterAskContextEvents(
        Array.from(eventMap.values()).sort((a, b) => b.occurredAt - a.occurredAt),
      );
      if (!includeDebug) {
        events = filterPrimaryEventRecords(events);
      }
      const workstreams = Array.from(workstreamMap.values()).sort(
        (a, b) => b.startedAt - a.startedAt,
      );

      const primaryEventIds = events.slice(0, 10).map((event) => event.id as Id<"events">);
      const relatedLinks = await listLinksForEventIds(ctx, primaryEventIds, 3);

      return {
        contextText: formatAskContext({
          events,
          workstreams,
          relatedLinks,
          entityContexts,
          projectName,
          viewName,
          viewDescription,
        }),
        eventIds: events.map((event) => event.id as Id<"events">),
        workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
        events,
        workstreams,
      };
    }
  }

  const searchedEvents = await searchEventsForWorkspace(ctx, workspaceDocId, {
    query: question,
    limit: 30,
    includeDebug: true,
    includeHidden: false,
  });

  const searchedWorkstreams = await searchWorkstreamsForWorkspace(ctx, workspaceDocId, {
    query: question,
    limit: 10,
  });

  const eventMap = new Map<string, EventRecord>();
  for (const event of searchedEvents) {
    eventMap.set(event.id, event);
  }

  const workstreamMap = new Map<string, WorkstreamRecord>();
  for (const workstream of searchedWorkstreams) {
    workstreamMap.set(workstream.id, workstream);
  }

  const entityMap = new Map<string, EntityRecord>();
  const entityContexts: Array<{ entity: EntityRecord; events: EventRecord[] }> = [];

  if (options.entityId) {
    const focusedEntity = await ctx.db.get(options.entityId);
    if (focusedEntity && focusedEntity.workspaceId === workspaceDocId) {
      const record = docToEntity(focusedEntity);
      entityMap.set(record.id, record);
      const timelineEvents = await getEntityTimelineEvents(
        ctx,
        workspaceDocId,
        record,
        { visibility: includeDebug ? "all" : "primary", limit: 30 },
      );
      entityContexts.push({ entity: record, events: timelineEvents });
      for (const event of timelineEvents) {
        eventMap.set(event.id, event);
      }
    }
  } else {
    const matchedEntities = await searchEntitiesForWorkspace(ctx, workspaceDocId, {
      query: question,
      limit: 3,
      includeDebug: includeDebug,
    });
    for (const entity of matchedEntities) {
      entityMap.set(entity.id, entity);
      const timelineEvents = await getEntityTimelineEvents(
        ctx,
        workspaceDocId,
        entity,
        { visibility: includeDebug ? "all" : "primary", limit: 15 },
      );
      entityContexts.push({ entity, events: timelineEvents });
      for (const event of timelineEvents) {
        eventMap.set(event.id, event);
      }
    }
  }

  if (options.workstreamId) {
    const focusedWorkstream = await ctx.db.get(options.workstreamId);
    if (focusedWorkstream && focusedWorkstream.workspaceId === workspaceDocId) {
      workstreamMap.set(focusedWorkstream._id, docToWorkstream(focusedWorkstream));

      const focusedEvents = await listEventsByWorkstream(ctx, options.workstreamId, {
        limit: 100,
      });
      for (const event of focusedEvents) {
        eventMap.set(event.id, event);
      }
    }
  }

  if (eventMap.size < 5) {
    const recentEvents = await listEventsForWorkspace(ctx, workspaceDocId, {
      limit: 20,
      visibility: includeDebug ? "all" : "primary",
      includeDebug,
    });
    for (const event of recentEvents) {
      eventMap.set(event.id, event);
    }
  }

  let events = filterAskContextEvents(
    Array.from(eventMap.values()).sort((a, b) => b.occurredAt - a.occurredAt),
  );
  if (!includeDebug) {
    events = filterPrimaryEventRecords(events);
  }
  const workstreams = Array.from(workstreamMap.values()).sort(
    (a, b) => b.startedAt - a.startedAt,
  );

  const primaryEventIds = events.slice(0, 10).map((event) => event.id as Id<"events">);
  const relatedLinks = await listLinksForEventIds(ctx, primaryEventIds, 3);

  for (const item of relatedLinks) {
    if (item.fromEvent && !eventMap.has(item.fromEvent.id)) {
      eventMap.set(item.fromEvent.id, item.fromEvent);
    }
    if (item.toEvent && !eventMap.has(item.toEvent.id)) {
      eventMap.set(item.toEvent.id, item.toEvent);
    }
  }

  const allEvents = includeDebug
    ? filterAskContextEvents(
        Array.from(eventMap.values()).sort((a, b) => b.occurredAt - a.occurredAt),
      )
    : filterPrimaryEventRecords(
        filterAskContextEvents(
          Array.from(eventMap.values()).sort((a, b) => b.occurredAt - a.occurredAt),
        ),
      );

  return {
    contextText: formatAskContext({
      events: allEvents,
      workstreams,
      relatedLinks,
      entityContexts,
      viewName,
      viewDescription,
    }),
    eventIds: allEvents.map((event) => event.id as Id<"events">),
    workstreamIds: workstreams.map((ws) => ws.id as Id<"workstreams">),
    events: allEvents,
    workstreams,
  };
}
