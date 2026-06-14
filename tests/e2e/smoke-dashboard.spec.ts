import { test, expect } from "@playwright/test";
import { describeE2E } from "./helpers/auth";

const pages = [
  { path: "/home", heading: /Company Pulse|Home/i },
  { path: "/timeline", heading: /Timeline/i },
  { path: "/projects", heading: /Projects/i },
  { path: "/workstreams", heading: /Workstreams/i },
  { path: "/entities", heading: /Entities/i },
  { path: "/views", heading: /Views/i },
  { path: "/ask", heading: /Ask/i },
  { path: "/insights", heading: /Insights/i },
  { path: "/sources", heading: /Sources/i },
  { path: "/settings/team", heading: /Team/i },
];

describeE2E("dashboard smoke", () => {
  for (const { path, heading } of pages) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.locator("nav, aside").first()).toBeVisible();
    });
  }
});
