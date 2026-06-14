import type { Id } from "../_generated/dataModel";
import type { EventRecord } from "./eventsLib";
import type { WorkstreamRecord } from "./workstreamsLib";

export type EventLinkType =
  | "same_workstream"
  | "same_entity"
  | "same_file"
  | "same_pr"
  | "same_actor"
  | "temporal"
  | "caused_by"
  | "led_to"
  | "related"
  | "manual";

export type LinkCandidate = {
  fromEventId: Id<"events">;
  toEventId: Id<"events">;
  fromWorkstreamId?: Id<"workstreams">;
  toWorkstreamId?: Id<"workstreams">;
  type: EventLinkType;
  confidence: number;
  reason: string;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "been",
  "from",
  "into",
  "that",
  "the",
  "this",
  "with",
  "were",
  "what",
  "when",
  "will",
  "your",
  "have",
  "more",
  "some",
  "than",
  "them",
  "then",
  "they",
  "were",
  "work",
  "stream",
]);

const RULE_CAP = 200;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function extractKeywords(...texts: (string | undefined)[]): Set<string> {
  const keywords = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const token of text.toLowerCase().split(/[^a-z0-9]+/)) {
      if (token.length >= 4 && !STOP_WORDS.has(token)) {
        keywords.add(token);
      }
    }
  }
  return keywords;
}

export function hasKeywordOverlap(
  a: (string | undefined)[],
  b: (string | undefined)[],
): boolean {
  const keywordsA = extractKeywords(...a);
  for (const keyword of extractKeywords(...b)) {
    if (keywordsA.has(keyword)) return true;
  }
  return false;
}

function getEventData(event: EventRecord): Record<string, unknown> {
  if (event.data && typeof event.data === "object" && !Array.isArray(event.data)) {
    return event.data as Record<string, unknown>;
  }
  return {};
}

export function getCustomerId(event: EventRecord): string | null {
  if (event.actor.id) return event.actor.id;
  if (event.entity?.id) return event.entity.id;
  const data = getEventData(event);
  const customerId = data.customerId ?? data.userId;
  return typeof customerId === "string" ? customerId : null;
}

function getFilePath(event: EventRecord): string | null {
  if (event.category !== "code_change") return null;
  if (event.entity?.type === "pull_request" || event.entity?.type === "issue") {
    return null;
  }
  if (event.entity?.type === "file" && event.entity.name) return event.entity.name;
  const path = getEventData(event).path;
  return typeof path === "string" ? path : null;
}

function getGithubRepoNumberKey(event: EventRecord): string | null {
  if (event.source !== "github") return null;
  const data = getEventData(event);
  const repo = data.repo;
  const number = data.number;
  if (typeof repo !== "string" || typeof number !== "number") return null;
  return `${repo}#${number}:${event.entity?.type ?? "unknown"}`;
}

function getWorkstreamText(workstream: WorkstreamRecord): (string | undefined)[] {
  return [workstream.title, workstream.summary];
}

function pushCandidate(
  candidates: LinkCandidate[],
  candidate: LinkCandidate,
  seen: Set<string>,
): void {
  if (candidate.fromEventId === candidate.toEventId) return;
  const key = `${candidate.fromEventId}:${candidate.toEventId}:${candidate.type}`;
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push(candidate);
}

function linkSameWorkstream(
  events: EventRecord[],
  candidates: LinkCandidate[],
  seen: Set<string>,
): void {
  const byWorkstream = new Map<string, EventRecord[]>();
  for (const event of events) {
    if (!event.workstreamId) continue;
    const list = byWorkstream.get(event.workstreamId) ?? [];
    list.push(event);
    byWorkstream.set(event.workstreamId, list);
  }

  let count = 0;
  for (const group of byWorkstream.values()) {
    const sorted = [...group].sort((a, b) => a.occurredAt - b.occurredAt);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (count >= RULE_CAP) return;
      const from = sorted[i]!;
      const to = sorted[i + 1]!;
      pushCandidate(candidates, {
        fromEventId: from.id as Id<"events">,
        toEventId: to.id as Id<"events">,
        fromWorkstreamId: from.workstreamId as Id<"workstreams"> | undefined,
        toWorkstreamId: to.workstreamId as Id<"workstreams"> | undefined,
        type: "same_workstream",
        confidence: 1.0,
        reason: "Events belong to the same workstream and occurred sequentially.",
      }, seen);
      count++;
    }
  }
}

function linkSameFile(
  events: EventRecord[],
  candidates: LinkCandidate[],
  seen: Set<string>,
): void {
  const byPath = new Map<string, EventRecord[]>();
  for (const event of events) {
    const path = getFilePath(event);
    if (!path) continue;
    const list = byPath.get(path) ?? [];
    list.push(event);
    byPath.set(path, list);
  }

  let count = 0;
  for (const [path, group] of byPath) {
    const sorted = [...group].sort((a, b) => a.occurredAt - b.occurredAt);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (count >= RULE_CAP) return;
      const from = sorted[i]!;
      const to = sorted[i + 1]!;
      pushCandidate(candidates, {
        fromEventId: from.id as Id<"events">,
        toEventId: to.id as Id<"events">,
        type: "same_file",
        confidence: 0.85,
        reason: `Both events reference ${path}.`,
      }, seen);
      count++;
    }
  }
}

function linkSameGithubPr(
  events: EventRecord[],
  candidates: LinkCandidate[],
  seen: Set<string>,
): void {
  const byPr = new Map<string, EventRecord[]>();
  for (const event of events) {
    if (event.entity?.type !== "pull_request") continue;
    const key = getGithubRepoNumberKey(event);
    if (!key) continue;
    const list = byPr.get(key) ?? [];
    list.push(event);
    byPr.set(key, list);
  }

  let count = 0;
  for (const group of byPr.values()) {
    const sorted = [...group].sort((a, b) => a.occurredAt - b.occurredAt);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (count >= RULE_CAP) return;
      const from = sorted[i]!;
      const to = sorted[i + 1]!;
      const data = getEventData(from);
      const repo = typeof data.repo === "string" ? data.repo : "repository";
      const number = typeof data.number === "number" ? data.number : "?";
      pushCandidate(candidates, {
        fromEventId: from.id as Id<"events">,
        toEventId: to.id as Id<"events">,
        type: "same_pr",
        confidence: 0.95,
        reason: `Events reference the same GitHub repository and pull request #${number} (${repo}).`,
      }, seen);
      count++;
    }
  }
}

function linkSameGithubIssue(
  events: EventRecord[],
  candidates: LinkCandidate[],
  seen: Set<string>,
): void {
  const byIssue = new Map<string, EventRecord[]>();
  for (const event of events) {
    if (event.entity?.type !== "issue") continue;
    const key = getGithubRepoNumberKey(event);
    if (!key) continue;
    const list = byIssue.get(key) ?? [];
    list.push(event);
    byIssue.set(key, list);
  }

  let count = 0;
  for (const group of byIssue.values()) {
    const sorted = [...group].sort((a, b) => a.occurredAt - b.occurredAt);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (count >= RULE_CAP) return;
      const from = sorted[i]!;
      const to = sorted[i + 1]!;
      const data = getEventData(from);
      const number = typeof data.number === "number" ? data.number : "?";
      pushCandidate(candidates, {
        fromEventId: from.id as Id<"events">,
        toEventId: to.id as Id<"events">,
        type: "same_entity",
        confidence: 0.9,
        reason: `Events reference the same GitHub issue #${number}.`,
      }, seen);
      count++;
    }
  }
}

function linkWorkstreamToPr(
  events: EventRecord[],
  workstreams: WorkstreamRecord[],
  candidates: LinkCandidate[],
  seen: Set<string>,
): void {
  const workstreamById = new Map(workstreams.map((ws) => [ws.id, ws]));
  const completions = events.filter((e) => e.type === "agent.workstream_completed");
  const prOpens = events.filter((e) => e.type === "github.pull_request.opened");

  let count = 0;
  for (const completion of completions) {
    if (!completion.workstreamId) continue;
    const workstream = workstreamById.get(completion.workstreamId);
    if (!workstream) continue;

    for (const pr of prOpens) {
      if (count >= RULE_CAP) return;
      if (pr.occurredAt < completion.occurredAt) continue;
      if (pr.occurredAt - completion.occurredAt > TWO_HOURS_MS) continue;
      if (!hasKeywordOverlap(getWorkstreamText(workstream), [pr.title, pr.summary])) {
        continue;
      }

      pushCandidate(candidates, {
        fromEventId: completion.id as Id<"events">,
        toEventId: pr.id as Id<"events">,
        fromWorkstreamId: completion.workstreamId as Id<"workstreams">,
        type: "led_to",
        confidence: 0.55,
        reason: "A GitHub PR was opened shortly after this workstream completed.",
      }, seen);
      count++;
    }
  }
}

function linkDecisionToCode(
  events: EventRecord[],
  candidates: LinkCandidate[],
  seen: Set<string>,
): void {
  const decisions = events.filter(
    (e) => e.type === "decision.made" && e.category === "company_decision",
  );
  const codeChanges = events.filter((e) => e.category === "code_change");

  let count = 0;
  for (const decision of decisions) {
    for (const code of codeChanges) {
      if (count >= RULE_CAP) return;
      if (code.occurredAt < decision.occurredAt) continue;
      if (code.occurredAt - decision.occurredAt > TWENTY_FOUR_HOURS_MS) continue;
      if (
        !hasKeywordOverlap(
          [decision.title, decision.summary],
          [code.title, code.summary, getFilePath(code) ?? undefined],
        )
      ) {
        continue;
      }

      pushCandidate(candidates, {
        fromEventId: decision.id as Id<"events">,
        toEventId: code.id as Id<"events">,
        type: "led_to",
        confidence: 0.6,
        reason: "Decision and code change share keywords and occurred close together.",
      }, seen);
      count++;
    }
  }
}

function linkWorkstreamToProduct(
  events: EventRecord[],
  candidates: LinkCandidate[],
  seen: Set<string>,
): void {
  const completions = events.filter((e) => e.type === "agent.workstream_completed");
  const productEvents = events.filter((e) => e.category === "product_event");

  let count = 0;
  for (const completion of completions) {
    for (const product of productEvents) {
      if (count >= RULE_CAP) return;
      if (product.occurredAt < completion.occurredAt) continue;
      if (product.occurredAt - completion.occurredAt > TWENTY_FOUR_HOURS_MS) continue;

      pushCandidate(candidates, {
        fromEventId: completion.id as Id<"events">,
        toEventId: product.id as Id<"events">,
        fromWorkstreamId: completion.workstreamId as Id<"workstreams"> | undefined,
        type: "led_to",
        confidence: 0.45,
        reason: "Product event happened after this workstream completed.",
      }, seen);
      count++;
    }
  }
}

function linkProductToRevenue(
  events: EventRecord[],
  candidates: LinkCandidate[],
  seen: Set<string>,
): void {
  const productEvents = events.filter((e) => e.category === "product_event");
  const revenueEvents = events.filter((e) => e.category === "revenue_event");

  let count = 0;
  for (const product of productEvents) {
    const productCustomerId = getCustomerId(product);
    if (!productCustomerId) continue;

    for (const revenue of revenueEvents) {
      if (count >= RULE_CAP) return;
      if (revenue.occurredAt < product.occurredAt) continue;
      const revenueCustomerId = getCustomerId(revenue);
      if (!revenueCustomerId || revenueCustomerId !== productCustomerId) continue;

      pushCandidate(candidates, {
        fromEventId: product.id as Id<"events">,
        toEventId: revenue.id as Id<"events">,
        type: "led_to",
        confidence: 0.75,
        reason: "Revenue event and product event reference the same customer/user.",
      }, seen);
      count++;
    }
  }
}

export function generateLinksForEvents(
  events: EventRecord[],
  workstreams: WorkstreamRecord[],
): LinkCandidate[] {
  const candidates: LinkCandidate[] = [];
  const seen = new Set<string>();

  const sorted = [...events].sort((a, b) => a.occurredAt - b.occurredAt);

  linkSameWorkstream(sorted, candidates, seen);
  linkSameFile(sorted, candidates, seen);
  linkSameGithubPr(sorted, candidates, seen);
  linkSameGithubIssue(sorted, candidates, seen);
  linkWorkstreamToPr(sorted, workstreams, candidates, seen);
  linkDecisionToCode(sorted, candidates, seen);
  linkWorkstreamToProduct(sorted, candidates, seen);
  linkProductToRevenue(sorted, candidates, seen);

  return candidates.filter((candidate) => {
    const from = events.find((e) => e.id === candidate.fromEventId);
    const to = events.find((e) => e.id === candidate.toEventId);
    if (!from || !to) return false;
    return to.occurredAt >= from.occurredAt;
  });
}

export function windowToMs(window: "24h" | "7d" | "30d"): number {
  switch (window) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}
