import { describe, expect, it, vi } from "vitest";

describe("sortiri context cli", () => {
  it("requires goal when pack id is absent", async () => {
    const { runContext } = await import("../../packages/cli/src/commands/context.js");
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(runContext({ goal: "" })).rejects.toThrow("exit");

    expect(error).toHaveBeenCalled();
    exit.mockRestore();
    error.mockRestore();
  });
});
