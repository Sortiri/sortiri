import http from "node:http";
import { readEvents } from "@sortiri/local";
import type { TimelineEvent } from "@sortiri/local";

export type LocalViewerOptions = {
  host?: string;
  port?: number;
  smoke?: boolean;
};

const SUBTITLE = "Open-source timeline layer for AI-native companies";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDayKey(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderMetadata(metadata: Record<string, unknown> | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) return "";
  const json = escapeHtml(JSON.stringify(metadata, null, 2));
  return `<details class="metadata">
    <summary>Metadata</summary>
    <pre>${json}</pre>
  </details>`;
}

function renderEvent(event: TimelineEvent): string {
  const summary = event.summary ? `<p class="summary">${escapeHtml(event.summary)}</p>` : "";
  const workstream = event.workstream
    ? `<span class="badge badge-workstream">${escapeHtml(event.workstream)}</span>`
    : "";
  return `<article class="event">
    <header>
      <div class="badges">
        <span class="badge badge-source">${escapeHtml(event.source)}</span>
        <span class="badge badge-type">${escapeHtml(event.type)}</span>
        ${workstream}
      </div>
      <time datetime="${event.timestamp}">${escapeHtml(formatTime(event.timestamp))}</time>
    </header>
    <h2>${escapeHtml(event.title)}</h2>
    ${summary}
    ${renderMetadata(event.metadata as Record<string, unknown> | undefined)}
  </article>`;
}

function groupEventsByDay(events: TimelineEvent[]): Array<{ day: string; events: TimelineEvent[] }> {
  const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
  const groups: Array<{ day: string; events: TimelineEvent[] }> = [];
  let currentDay = "";
  for (const event of sorted) {
    const day = formatDayKey(event.timestamp);
    if (day !== currentDay) {
      groups.push({ day, events: [] });
      currentDay = day;
    }
    groups[groups.length - 1]!.events.push(event);
  }
  return groups;
}

function renderPage(events: ReturnType<typeof readEvents>): string {
  const groups = groupEventsByDay(events);
  const body =
    groups.length > 0
      ? groups
          .map(
            (group) => `<section class="day-group">
        <h3 class="day-heading">${escapeHtml(group.day)}</h3>
        ${group.events.map(renderEvent).join("\n")}
      </section>`,
          )
          .join("\n")
      : '<p class="empty">No events yet. Run <code>sortiri record</code> to add one.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sortiri Local Timeline</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 0; background: #0b0d10; color: #e8eaed; }
    main { max-width: 52rem; margin: 0 auto; padding: 2rem 1rem 4rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.35rem; }
    .subtitle { color: #c4c7cc; margin: 0 0 0.5rem; font-size: 0.95rem; }
    .lead { color: #9aa0a6; margin: 0 0 1.5rem; font-size: 0.875rem; }
    .export-cta { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 2rem; padding: 0.75rem 1rem; border: 1px solid #2a2f36; border-radius: 8px; background: #12151a; }
    .export-cta code { font-size: 0.8rem; }
    .export-cta a { color: #8ab4f8; text-decoration: none; font-size: 0.875rem; }
    .day-heading { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9aa0a6; margin: 1.5rem 0 0.75rem; padding-bottom: 0.35rem; border-bottom: 1px solid #2a2f36; }
    .day-group:first-child .day-heading { margin-top: 0; }
    .event { border: 1px solid #2a2f36; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; background: #12151a; }
    .event header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem; }
    .badges { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .badge { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.15rem 0.45rem; border-radius: 4px; border: 1px solid #2a2f36; }
    .badge-source { color: #8ab4f8; background: #1a2332; }
    .badge-type { color: #81c995; background: #1a2e22; }
    .badge-workstream { color: #e8c468; background: #2e2818; }
    time { font-size: 0.75rem; color: #9aa0a6; white-space: nowrap; }
    .event h2 { font-size: 1rem; margin: 0 0 0.35rem; }
    .summary { font-size: 0.875rem; color: #9aa0a6; margin: 0.25rem 0 0; }
    .metadata { margin-top: 0.5rem; font-size: 0.8rem; }
    .metadata summary { cursor: pointer; color: #9aa0a6; }
    .metadata pre { margin: 0.35rem 0 0; padding: 0.5rem; background: #0b0d10; border-radius: 4px; overflow-x: auto; color: #c4c7cc; font-size: 0.75rem; }
    .empty { color: #9aa0a6; font-style: italic; }
  </style>
</head>
<body>
  <main>
    <h1>Sortiri Local Timeline</h1>
    <p class="subtitle">${escapeHtml(SUBTITLE)}</p>
    <p class="lead">Events from <code>.sortiri/events.jsonl</code>. Local mode — no cloud login, API key, or remote account required.</p>
    <div class="export-cta">
      <span>Export:</span>
      <code>sortiri export --out timeline.jsonl</code>
      <a href="#" onclick="navigator.clipboard?.writeText('sortiri export --out timeline.jsonl'); return false;">Copy command</a>
    </div>
    ${body}
  </main>
</body>
</html>`;
}

export async function startLocalViewer(options: LocalViewerOptions = {}): Promise<http.Server> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4317;

  const server = http.createServer((_req, res) => {
    const events = readEvents();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPage(events));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });

  if (options.smoke) {
    server.close();
    return server;
  }

  return server;
}

export function canStartLocalViewer(): boolean {
  try {
    readEvents();
    return true;
  } catch {
    return false;
  }
}

export { SUBTITLE, renderPage };
