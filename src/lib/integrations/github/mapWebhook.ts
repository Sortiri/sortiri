import type { EventActor, EventCategory } from "@/types/events";

export type GithubSortiriEventInput = {
  source: "github";
  category: EventCategory;
  type: string;
  actor: EventActor;
  title: string;
  summary?: string;
  entity?: {
    type: "file" | "user" | "customer" | "feature" | "project" | "workspace" | "pull_request" | "issue" | "payment" | "subscription" | "other";
    id?: string;
    name?: string;
    url?: string;
  };
  data?: Record<string, unknown>;
  occurredAt?: number;
};

type GithubUser = {
  id?: number;
  login?: string;
};

type GithubRepository = {
  full_name?: string;
  html_url?: string;
};

type GithubPullRequest = {
  id?: number;
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  merged?: boolean;
  html_url?: string;
  head?: { ref?: string };
  base?: { ref?: string };
};

type GithubIssue = {
  id?: number;
  number?: number;
  title?: string;
  body?: string | null;
  html_url?: string;
  labels?: Array<{ name?: string }>;
};

type GithubCommit = {
  id?: string;
  message?: string;
  url?: string;
  author?: { name?: string; email?: string };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function getSender(payload: Record<string, unknown>): GithubUser {
  return (payload.sender as GithubUser | undefined) ?? {};
}

function getRepository(payload: Record<string, unknown>): GithubRepository {
  return (payload.repository as GithubRepository | undefined) ?? {};
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function humanActor(sender: GithubUser): EventActor {
  return {
    type: "human",
    id: sender.id !== undefined ? String(sender.id) : undefined,
    name: sender.login,
  };
}

function mapPullRequestEvent(payload: Record<string, unknown>): GithubSortiriEventInput | null {
  const action = typeof payload.action === "string" ? payload.action : "";
  const pullRequest = (payload.pull_request as GithubPullRequest | undefined) ?? {};
  const sender = getSender(payload);
  const repo = getRepository(payload);
  const number = pullRequest.number;
  const title = pullRequest.title ?? "Untitled PR";

  if (action === "opened") {
    return {
      source: "github",
      category: "code_change",
      type: "github.pull_request.opened",
      actor: humanActor(sender),
      title: `Opened PR #${number}: ${title}`,
      summary: pullRequest.body ?? undefined,
      entity: {
        type: "pull_request",
        id: pullRequest.id !== undefined ? String(pullRequest.id) : undefined,
        name: `#${number} ${title}`,
        url: pullRequest.html_url,
      },
      data: {
        repo: repo.full_name,
        branch: pullRequest.head?.ref,
        base: pullRequest.base?.ref,
        number,
        state: pullRequest.state,
      },
    };
  }

  if (action === "closed") {
    const merged = pullRequest.merged === true;
    return {
      source: "github",
      category: "code_change",
      type: merged ? "github.pull_request.merged" : "github.pull_request.closed",
      actor: humanActor(sender),
      title: merged
        ? `Merged PR #${number}: ${title}`
        : `Closed PR #${number}: ${title}`,
      summary: pullRequest.body ?? undefined,
      entity: {
        type: "pull_request",
        id: pullRequest.id !== undefined ? String(pullRequest.id) : undefined,
        name: `#${number} ${title}`,
        url: pullRequest.html_url,
      },
      data: {
        repo: repo.full_name,
        branch: pullRequest.head?.ref,
        base: pullRequest.base?.ref,
        number,
        state: pullRequest.state,
        merged,
      },
    };
  }

  return null;
}

function mapPushEvent(payload: Record<string, unknown>): GithubSortiriEventInput | null {
  const sender = getSender(payload);
  const repo = getRepository(payload);
  const commits = Array.isArray(payload.commits) ? (payload.commits as GithubCommit[]) : [];
  const commitCount = commits.length;
  const latestCommitMessage = commits[commits.length - 1]?.message;
  const ref = typeof payload.ref === "string" ? payload.ref : undefined;

  const title =
    commitCount === 1 && latestCommitMessage
      ? `Pushed commit: ${latestCommitMessage.split("\n")[0]}`
      : `Pushed ${commitCount} commit(s) to ${repo.full_name ?? "repository"}`;

  return {
    source: "github",
    category: "code_change",
    type: "github.push",
    actor: humanActor(sender),
    title,
    summary: latestCommitMessage,
    entity: {
      type: "project",
      name: repo.full_name,
      url: repo.html_url,
    },
    data: {
      repo: repo.full_name,
      ref,
      commitCount,
      commits: commits.slice(0, 10).map((commit) => ({
        id: commit.id,
        message: commit.message,
        url: commit.url,
        author: commit.author?.name,
      })),
    },
  };
}

function mapIssueEvent(payload: Record<string, unknown>): GithubSortiriEventInput | null {
  const action = typeof payload.action === "string" ? payload.action : "";
  if (!["opened", "closed", "reopened"].includes(action)) {
    return null;
  }

  const issue = (payload.issue as GithubIssue | undefined) ?? {};
  const sender = getSender(payload);
  const repo = getRepository(payload);
  const number = issue.number;
  const title = issue.title ?? "Untitled issue";
  const labels = issue.labels?.map((label) => label.name).filter(Boolean);

  return {
    source: "github",
    category: "company_decision",
    type: `github.issue.${action}`,
    actor: humanActor(sender),
    title: `${capitalize(action)} issue #${number}: ${title}`,
    summary: issue.body ?? undefined,
    entity: {
      type: "issue",
      id: issue.id !== undefined ? String(issue.id) : undefined,
      name: `#${number} ${title}`,
      url: issue.html_url,
    },
    data: {
      repo: repo.full_name,
      number,
      labels,
    },
  };
}

function mapReleaseEvent(payload: Record<string, unknown>): GithubSortiriEventInput | null {
  const action = typeof payload.action === "string" ? payload.action : "";
  if (action !== "published") {
    return null;
  }

  const release = (payload.release as Record<string, unknown> | undefined) ?? {};
  const sender = getSender(payload);
  const repo = getRepository(payload);
  const tagName = typeof release.tag_name === "string" ? release.tag_name : "release";

  return {
    source: "github",
    category: "system_event",
    type: "github.release.published",
    actor: humanActor(sender),
    title: `Published release ${tagName}`,
    summary: typeof release.body === "string" ? release.body : undefined,
    entity: {
      type: "project",
      name: repo.full_name,
      url: typeof release.html_url === "string" ? release.html_url : repo.html_url,
    },
    data: {
      repo: repo.full_name,
      tagName,
      name: release.name,
    },
  };
}

export function mapWebhookPayload(
  eventType: string,
  payload: unknown,
): GithubSortiriEventInput | null {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  switch (eventType) {
    case "pull_request":
      return mapPullRequestEvent(record);
    case "push":
      return mapPushEvent(record);
    case "issues":
      return mapIssueEvent(record);
    case "release":
      return mapReleaseEvent(record);
    default:
      return null;
  }
}
