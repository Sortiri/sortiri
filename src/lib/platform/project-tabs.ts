export const PROJECT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "workstreams", label: "Workstreams" },
  { id: "decisions", label: "Decisions" },
  { id: "incidents", label: "Incidents" },
  { id: "entities", label: "Entities" },
  { id: "sources", label: "Sources" },
  { id: "evals", label: "Evals" },
  { id: "audits", label: "Audits" },
  { id: "settings", label: "Settings" },
] as const;

export type ProjectTabId = (typeof PROJECT_TABS)[number]["id"];
