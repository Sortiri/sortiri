"use client";

import "./ask.css";

export function AskEmptyState() {
  return (
    <div className="ask-empty-state">
      <p className="ask-empty-state__title">No timeline data yet</p>
      <p className="ask-empty-state__body">
        Install the Sortiri MCP or run the file watcher to capture events. Once your
        timeline has activity, Ask Sortiri can answer questions grounded in your company
        history.
      </p>
    </div>
  );
}
