import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const authFile = "tests/e2e/.auth/user.json";
const e2eEnvFile = path.join("tests/e2e/.env.e2e");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });
loadEnvFile(e2eEnvFile);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    storageState: authFile,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: "npm run dev:e2e",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
