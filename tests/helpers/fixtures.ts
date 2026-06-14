export function buildSampleEventInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Sample event",
    type: "file.changed",
    category: "code_change",
    source: "watcher",
    actor: { type: "agent", name: "Cursor Agent" },
    ...overrides,
  };
}

export function buildSampleWorkstreamInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Sample workstream",
    summary: "Sample summary",
    status: "active",
    createdBy: { type: "agent", name: "Cursor Agent" },
    ...overrides,
  };
}
