import { describe, expect, it } from "vitest";
import { buildEventSearchText, buildWorkstreamSearchText } from "../../convex/lib/search";

describe("event search text", () => {
  it("includes title, type, and actor in search text", () => {
    const text = buildEventSearchText({
      title: "Updated homepage",
      type: "file.changed",
      category: "code_change",
      source: "watcher",
      actor: { name: "Cursor Agent", type: "agent" },
      entity: { type: "file", name: "app/page.tsx" },
    });
    expect(text).toContain("updated homepage");
    expect(text).toContain("file.changed");
    expect(text).toContain("cursor agent");
    expect(text).toContain("app/page.tsx");
  });

  it("includes workstream title in search text", () => {
    const text = buildWorkstreamSearchText({
      title: "Homepage hero refresh",
      summary: "Update hero copy",
      status: "active",
      createdBy: { name: "Cursor Agent", type: "agent" },
    });
    expect(text).toContain("homepage hero refresh");
    expect(text).toContain("update hero copy");
  });
});
