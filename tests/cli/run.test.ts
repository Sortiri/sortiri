import { describe, expect, it } from "vitest";
import { mergeCommandOutput } from "../../packages/cli/src/lib/commandCapture";

describe("command capture", () => {
  it("merges stdout and stderr", () => {
    expect(mergeCommandOutput("hello", "world")).toContain("hello");
    expect(mergeCommandOutput("hello", "world")).toContain("world");
  });
});
