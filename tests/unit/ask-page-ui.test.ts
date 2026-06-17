import { describe, expect, it } from "vitest";
import { ASK_SUGGESTION_GROUPS } from "@/lib/platform/suggestion-groups";

describe("ask page ui", () => {
  it("defines grouped suggestion categories", () => {
    expect(ASK_SUGGESTION_GROUPS.length).toBeGreaterThanOrEqual(5);
    const titles = ASK_SUGGESTION_GROUPS.map((g) => g.title);
    expect(titles).toContain("Replay");
    expect(titles).toContain("Decisions");
    expect(titles).toContain("Engineering");
    expect(titles).toContain("Product + Revenue");
    expect(titles).toContain("Intelligence");
  });

  it("includes replay questions", () => {
    const replay = ASK_SUGGESTION_GROUPS.find((g) => g.id === "replay");
    expect(replay?.questions).toContain("What happened today?");
  });
});
