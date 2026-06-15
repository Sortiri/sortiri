import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { chromium, type FullConfig } from "@playwright/test";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { waitForConvexAuth, bootstrapE2EUser, bootstrapE2EMember, bootstrapE2EAuditor } from "./helpers/bootstrap";

const ownerAuthFile = path.join("tests/e2e/.auth/user.json");
const memberAuthFile = path.join("tests/e2e/.auth/member.json");
const auditorAuthFile = path.join("tests/e2e/.auth/auditor.json");
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

async function signInAndBootstrap(args: {
  baseURL: string;
  email: string;
  password: string;
  authFile: string;
  bootstrap: (page: import("@playwright/test").Page) => Promise<void>;
}) {
  fs.mkdirSync(path.dirname(args.authFile), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(`${args.baseURL}${signInPath}`);
    await clerk.signIn({ page, emailAddress: args.email });
    await page.goto(`${args.baseURL}/home`);
    await args.bootstrap(page);

    await page.waitForURL(
      (url) => {
        const onAppHost = url.origin === new URL(args.baseURL).origin;
        const offAuthFlow =
          !url.pathname.startsWith(signInPath) && !url.pathname.startsWith(signUpPath);
        return onAppHost && offAuthFlow;
      },
      { timeout: 60_000 },
    );

    await page.context().storageState({ path: args.authFile });
  } finally {
    await browser.close();
  }
}

async function globalSetup(config: FullConfig) {
  const ownerEmail = process.env.E2E_EMAIL;
  const ownerPassword = process.env.E2E_PASSWORD;
  const memberEmail = process.env.E2E_MEMBER_EMAIL;
  const memberPassword = process.env.E2E_MEMBER_PASSWORD ?? ownerPassword;
  const auditorEmail = process.env.E2E_AUDITOR_EMAIL;
  const auditorPassword = process.env.E2E_AUDITOR_PASSWORD ?? ownerPassword;
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  fs.mkdirSync(path.dirname(ownerAuthFile), { recursive: true });

  if (!ownerEmail || !ownerPassword) {
    console.warn(
      "E2E_EMAIL and E2E_PASSWORD not set — writing empty storage states. Authenticated specs may fail.",
    );
    const empty = JSON.stringify({ cookies: [], origins: [] });
    fs.writeFileSync(ownerAuthFile, empty);
    fs.writeFileSync(memberAuthFile, empty);
    fs.writeFileSync(auditorAuthFile, empty);
    return;
  }

  await clerkSetup();

  const devServer = await ensureDevServer(baseURL);
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexDev =
    convexUrl !== undefined ? await ensureConvexDev(convexUrl) : null;

  try {
    await signInAndBootstrap({
      baseURL,
      email: ownerEmail,
      password: ownerPassword,
      authFile: ownerAuthFile,
      bootstrap: bootstrapE2EUser,
    });

    if (memberEmail?.trim()) {
      await signInAndBootstrap({
        baseURL,
        email: memberEmail,
        password: memberPassword ?? ownerPassword,
        authFile: memberAuthFile,
        bootstrap: bootstrapE2EMember,
      });
    } else {
      console.warn(
        "E2E_MEMBER_EMAIL not set — writing empty member storage state. Member permission specs will skip.",
      );
      fs.writeFileSync(memberAuthFile, JSON.stringify({ cookies: [], origins: [] }));
    }

    if (auditorEmail?.trim()) {
      await signInAndBootstrap({
        baseURL,
        email: auditorEmail,
        password: auditorPassword ?? ownerPassword,
        authFile: auditorAuthFile,
        bootstrap: bootstrapE2EAuditor,
      });
    } else {
      console.warn(
        "E2E_AUDITOR_EMAIL not set — writing empty auditor storage state. Auditor specs will skip.",
      );
      fs.writeFileSync(auditorAuthFile, JSON.stringify({ cookies: [], origins: [] }));
    }
  } finally {
    if (devServer?.pid) {
      process.kill(-devServer.pid);
    }
    if (convexDev?.pid) {
      process.kill(-convexDev.pid);
    }
  }
}

export default globalSetup;
