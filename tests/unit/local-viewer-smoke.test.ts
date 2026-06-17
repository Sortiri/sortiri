import { describe, expect, it } from "vitest";
import { renderPage, SUBTITLE } from "../../packages/cli/src/localViewer";
import type { TimelineEvent } from "@sortiri/local";

describe("local viewer smoke", () => {
  const sample: TimelineEvent[] = [
    {
      id: "evt_example",
      timestamp: 1780000000000,
      source: "cursor",
      type: "agent.action",
      title: "Updated onboarding flow",
      summary: "Test",
    },
  ];

  it("renders subtitle and timeline positioning", () => {
    const html = renderPage(sample);
    expect(html).toContain("Sortiri Local Timeline");
    expect(html).toContain(SUBTITLE);
    expect(html).toContain("sortiri export");
  });

  it("renders event badges and metadata details", () => {
    const withMeta: TimelineEvent[] = [
      {
        ...sample[0]!,
        metadata: { files: ["src/a.ts"] },
      },
    ];
    const html = renderPage(withMeta);
    expect(html).toContain("agent.action");
    expect(html).toContain("cursor");
    expect(html).toContain("Metadata");
  });
});
