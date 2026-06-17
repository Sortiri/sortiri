import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mapObservabilityWebhook } from "../../convex/lib/integrations/observabilityMapWebhook";
import { parseObservabilityConfig } from "../../convex/lib/integrations/observabilityCaptureRules";

const FIXTURES = path.join(process.cwd(), "tests/fixtures/observability");

describe("convex observability webhook routing", () => {
  const config = parseObservabilityConfig({});

  it("maps signed fixture payloads to observability events", () => {
    for (const fixture of [
      "incident_opened.json",
      "deploy_failed.json",
      "rollback_completed.json",
      "incident_resolved.json",
    ]) {
      const payload = JSON.parse(fs.readFileSync(path.join(FIXTURES, fixture), "utf8"));
      const mapped = mapObservabilityWebhook(payload, config);
      expect(mapped).not.toBeNull();
      expect(mapped && "blocked" in mapped).toBe(false);
      if (mapped && !("blocked" in mapped)) {
        expect(mapped.category).toBe("observability");
        expect(mapped.sourceEventId).toBeTruthy();
      }
    }
  });

  it("blocks signals filtered by capture rules", () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(FIXTURES, "deploy_failed.json"), "utf8"),
    );
    const restricted = parseObservabilityConfig({ allowedServices: ["billing"] });
    const mapped = mapObservabilityWebhook(payload, restricted);
    expect(mapped).toEqual({ blocked: true });
  });

  it("rejects non-object payloads", () => {
    expect(mapObservabilityWebhook("not-json", config)).toBeNull();
    expect(mapObservabilityWebhook(null, config)).toBeNull();
  });

  it("uses generic source for unknown source values", () => {
    const mapped = mapObservabilityWebhook(
      { source: "unknown_vendor", title: "Alert", severity: "warning" },
      config,
    );
    expect(mapped && !("blocked" in mapped) ? mapped.source : null).toBe("generic");
  });
});
