import { describe, expect, it } from "vitest";
import { getSortiriApiUrl, buildWebhookUrl } from "../../src/lib/sortiri/apiUrl";

describe("apiUrl helpers", () => {
  it("prefers SORTIRI_API_URL", () => {
    const prev = process.env.SORTIRI_API_URL;
    process.env.SORTIRI_API_URL = "https://example.convex.site/";
    expect(getSortiriApiUrl()).toBe("https://example.convex.site");
    process.env.SORTIRI_API_URL = prev;
  });

  it("builds webhook URLs without /api prefix", () => {
    const prev = process.env.SORTIRI_API_URL;
    process.env.SORTIRI_API_URL = "https://example.convex.site";
    expect(buildWebhookUrl("github", "ws_ext")).toBe(
      "https://example.convex.site/webhooks/github?workspaceId=ws_ext",
    );
    process.env.SORTIRI_API_URL = prev;
  });
});
