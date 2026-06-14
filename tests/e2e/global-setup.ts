import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { chromium, type FullConfig } from "@playwright/test";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { bootstrapE2EUser } from "./helpers/bootstrap";

const authFile = path.join("tests/e2e/.auth/user.json");
const signInPath = ["/", "sign-in"].join("");
const signUpPath = ["/", "sign-up"].join("");

async function waitForApp(baseURL: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL);
      if (response.status < 500) {
        return;
      }
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`App not reachable at ${baseURL}`);
}

async function ensureConvexDev(convexUrl: string): Promise<ChildProcess | null> {
  const isLocal =
    convexUrl.includes("127.0.0.1") || convexUrl.includes("localhost");
  if (!isLocal) {
    return null;
  }

  try {
    await fetch(convexUrl);
    return null;
  } catch {
    // Start local Convex for global setup (runs before Playwright webServer).
  }

  const child = spawn("npx", ["convex", "dev"], {
    cwd: process.cwd(),
    stdio: "ignore",
    detached: true,
    env: process.env,
  });
  await waitForApp(convexUrl);
  return child;
}

async function ensureDevServer(baseURL: string): Promise<ChildProcess | null> {
  try {
    const response = await fetch(baseURL);
    if (response.status < 500) {
      return null;
    }
  } catch {
    // Start a local dev server for global setup (runs before Playwright webServer).
  }

  const child = spawn("npm", ["run", "dev:e2e"], {
    cwd: process.cwd(),
    stdio: "ignore",
    detached: true,
    env: process.env,
  });
  await waitForApp(baseURL);
  return child;
}

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

  await clerkSetup();

  const devServer = await ensureDevServer(baseURL);
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexDev =
    convexUrl !== undefined ? await ensureConvexDev(convexUrl) : null;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${baseURL}${signInPath}`);
    await clerk.signIn({ page, emailAddress: email });
    await page.goto(`${baseURL}/home`);
    await bootstrapE2EUser(page);

    await page.waitForURL(
      (url) => {
        const onAppHost = url.origin === new URL(baseURL).origin;
        const offAuthFlow =
          !url.pathname.startsWith(signInPath) && !url.pathname.startsWith(signUpPath);
        return onAppHost && offAuthFlow;
      },
      { timeout: 60_000 },
    );

    await page.context().storageState({ path: authFile });
  } finally {
    await browser.close();
    if (devServer?.pid) {
      process.kill(-devServer.pid);
    }
    if (convexDev?.pid) {
      process.kill(-convexDev.pid);
    }
  }
}

export default globalSetup;
