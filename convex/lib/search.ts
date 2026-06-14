type EventSearchInput = {
  title?: string;
  summary?: string;
  type?: string;
  category?: string;
  source?: string;
  actor?: {
    name?: string;
    email?: string;
    type?: string;
    id?: string;
  };
  entity?: {
    name?: string;
    type?: string;
    id?: string;
    url?: string;
  };
  tags?: string[];
  data?: Record<string, unknown>;
};

type WorkstreamSearchInput = {
  title?: string;
  summary?: string;
  status?: string;
  createdBy?: {
    name?: string;
    type?: string;
    id?: string;
  };
};

function extractDataSearchTerms(data?: Record<string, unknown>): string[] {
  if (!data) {
    return [];
  }

  const terms: string[] = [];
  const scalarKeys = ["repo", "branch", "base", "ref", "tagName", "name"] as const;

  for (const key of scalarKeys) {
    const value = data[key];
    if (typeof value === "string") {
      terms.push(value);
    }
  }

  const commits = data.commits;
  if (Array.isArray(commits)) {
    for (const commit of commits.slice(0, 10)) {
      if (typeof commit === "object" && commit !== null) {
        const message = (commit as { message?: string }).message;
        const author = (commit as { author?: string }).author;
        if (message) terms.push(message);
        if (author) terms.push(author);
      }
    }
  }

  return terms;
}

export function buildEventSearchText(event: EventSearchInput): string {
  return [
    event.title,
    event.summary,
    event.type,
    event.category,
    event.source,
    event.actor?.name,
    event.actor?.email,
    event.actor?.type,
    event.actor?.id,
    event.entity?.name,
    event.entity?.type,
    event.entity?.id,
    event.entity?.url,
    ...extractDataSearchTerms(event.data),
    ...(event.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function buildWorkstreamSearchText(workstream: WorkstreamSearchInput): string {
  return [
    workstream.title,
    workstream.summary,
    workstream.status,
    workstream.createdBy?.name,
    workstream.createdBy?.type,
    workstream.createdBy?.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
