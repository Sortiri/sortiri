import { describe, expect, it } from "vitest";
import {
  computeWindowFromAnchor,
  resolveWorkstreamAnchorTime,
  presetToMs,
} from "../../convex/lib/impactWindows";
import type { Doc } from "../../convex/_generated/dataModel";

describe("impact windows", () => {
  it("computes baseline and impact bounds", () => {
    const anchor = 1_000_000;
    const beforeMs = 7 * 24 * 60 * 60 * 1000;
    const afterMs = 7 * 24 * 60 * 60 * 1000;
    const window = computeWindowFromAnchor(anchor, beforeMs, afterMs);
    expect(window.baselineStart).toBe(anchor - beforeMs);
    expect(window.baselineEnd).toBe(anchor);
    expect(window.impactStart).toBe(anchor);
    expect(window.impactEnd).toBe(anchor + afterMs);
  });

  it("maps presets to milliseconds", () => {
    expect(presetToMs("24h")).toBe(24 * 60 * 60 * 1000);
    expect(presetToMs("7d")).toBe(7 * 24 * 60 * 60 * 1000);
    expect(presetToMs("30d")).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("resolves workstream anchor from endedAt when completed", () => {
    const workstream = {
      status: "completed",
      startedAt: 100,
      endedAt: 500,
    } as Doc<"workstreams">;
    expect(resolveWorkstreamAnchorTime(workstream)).toBe(500);
  });
});
