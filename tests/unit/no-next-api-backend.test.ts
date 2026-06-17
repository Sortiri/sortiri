import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("no-next-api-backend guard", () => {
  it("migrated ingest route returns 410 shim only", () => {
    const file = path.join(
      process.cwd(),
      "src/app/api/ingest/events/route.ts",
    );
    const content = fs.readFileSync(file, "utf8");
    expect(content).toContain("goneResponse");
    expect(content).not.toContain("runIngestPipeline");
  });

  it("SDK uses Convex ingest path", () => {
    const file = path.join(process.cwd(), "packages/sdk/src/client.ts");
    const content = fs.readFileSync(file, "utf8");
    expect(content).toContain("/ingest/events");
    expect(content).not.toContain("/api/ingest/events");
  });
});
