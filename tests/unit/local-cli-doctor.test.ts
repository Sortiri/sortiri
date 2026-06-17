import { describe, expect, it } from "vitest";
import { runDoctor } from "../../packages/cli/src/commands/doctor";
import { runInit } from "../../packages/cli/src/commands/init";
import { createTempProject } from "../helpers/tempProject";

describe("local cli doctor", () => {
  it("passes after local init", async () => {
    const { root, cleanup } = createTempProject();
    const prev = process.cwd();
    const exit = process.exit;

    let exitCode: number | null = null;
    process.exit = ((code?: number) => {
      exitCode = code ?? 0;
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit;

    try {
      process.chdir(root);
      await runInit({ yes: true });
      await runDoctor({ record: false });
      expect(exitCode).toBeNull();
    } catch (error) {
      if (!(error instanceof Error && error.message.startsWith("exit:"))) {
        throw error;
      }
      expect.fail(`doctor exited with ${error.message}`);
    } finally {
      process.exit = exit;
      process.chdir(prev);
      cleanup();
    }
  });
});
