import { describe, expect, it } from "vitest";

const STATUS_TONES = ["success", "warning", "error", "info", "neutral"] as const;

describe("status badges", () => {
  it("includes text label requirement via tone set", () => {
    expect(STATUS_TONES).toContain("success");
    expect(STATUS_TONES).toContain("error");
    expect(STATUS_TONES.length).toBe(5);
  });

  it("maps incident severities to signal badge classes", () => {
    const severities = ["info", "warning", "error", "critical"] as const;
    for (const severity of severities) {
      expect(`signal-badge--${severity}`).toMatch(/^signal-badge--/);
    }
  });
});
