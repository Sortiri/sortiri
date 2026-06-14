import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join("tests/e2e/.auth/user.json");

async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  if (!email || !password) {
    console.warn(
      "E2E_EMAIL and E2E_PASSWORD not set — writing empty storage state. Authenticated specs may fail.",
    );
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/sign-in`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /continue|sign in/i }).click();

  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
    timeout: 60_000,
  });

  await page.context().storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
