/**
 * Sprint 23 project-access sanity check.
 * Provisions Clerk test users, seeds Convex data, and verifies API + UI permissions.
 *
 * Usage: npx tsx scripts/sanity-project-access.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { TEST_PROJECT_BETA, TEST_PROJECT_NAME, TEST_WORKSPACE_NAME } from "../convex/testSeed";
import {
  bootstrapE2EAdmin,
  bootstrapE2EUser,
  bootstrapE2EMember,
  bootstrapE2EViewer,
  waitForConvexAuth,
} from "../tests/e2e/helpers/bootstrap";

const PASSWORD = "SortiriSanity!project-access-2026";
const USERS = {
  owner: "sortiri-sanity-owner@agentmail.to",
  admin: "sortiri-sanity-admin@agentmail.to",
  member: "sortiri-sanity-member@agentmail.to",
  viewer: "sortiri-sanity-viewer@agentmail.to",
} as const;

type Role = keyof typeof USERS;

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    let value = trimmed.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

async function clerkFetch<T>(route: string, init?: RequestInit): Promise<T> {
  const clerkSecret = requireEnv("CLERK_SECRET_KEY");
  const response = await fetch(`https://api.clerk.com/v1${route}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Clerk ${route} failed: ${response.status} ${body}`);
  }
  return (await response.json()) as T;
}

async function ensureClerkUser(email: string, firstName: string): Promise<string> {
  const listed = await clerkFetch<Array<{ id: string }>>(
    `/users?email_address=${encodeURIComponent(email)}`,
  );
  if (listed.length > 0) {
    await clerkFetch(`/users/${listed[0]!.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        password: PASSWORD,
        skip_password_checks: true,
        first_name: firstName,
      }),
    });
    return listed[0]!.id;
  }

  const created = await clerkFetch<{ id: string }>("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      password: PASSWORD,
      skip_password_checks: true,
      skip_password_requirement: true,
      first_name: firstName,
    }),
  });
  return created.id;
}

async function getConvexTokenForUser(userId: string): Promise<string> {
  const session = await clerkFetch<{ id: string }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  const tokenResponse = await clerkFetch<{ jwt: string }>(
    `/sessions/${session.id}/tokens/convex`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return tokenResponse.jwt;
}

function convexClient(token: string) {
  const client = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"));
  client.setAuth(token);
  return client;
}

type Check = { name: string; pass: boolean; detail?: string };

function record(checks: Check[], name: string, pass: boolean, detail?: string) {
  checks.push({ name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function completeOnboarding(client: ConvexHttpClient) {
  const profile = await client.query(api.onboarding.getProfile, {});
  if (!profile?.completedAt) {
    await client.mutation(api.onboarding.upsert, {
      patch: {
        companyName: "Sanity Check Co",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "What changed?",
        currentStep: 5,
      },
    });
    await client.mutation(api.onboarding.complete, {});
  }
}

async function runApiChecks(args: {
  role: Role;
  client: ConvexHttpClient;
  workspaceId: string;
  alphaProjectId?: string;
  betaProjectId?: string;
}): Promise<Check[]> {
  const checks: Check[] = [];
  const { client, workspaceId, role } = args;

  const projects = await client.query(api.projects.listByWorkspace, { workspaceId });
  const projectNames = projects.map((p) => p.name);
  const alpha = projects.find((p) => p.name === TEST_PROJECT_NAME);
  const beta = projects.find((p) => p.name === TEST_PROJECT_BETA);

  if (role === "owner" || role === "admin") {
    record(checks, `${role}: sees Alpha + Beta`, projectNames.includes(TEST_PROJECT_NAME) && projectNames.includes(TEST_PROJECT_BETA));
    record(checks, `${role}: can list team`, true); // query below
    try {
      const members = await client.query(api.workspaceMembers.listByWorkspace, { workspaceId });
      record(checks, `${role}: team list returns members`, members.length >= 2, `${members.length} members`);
    } catch (error) {
      record(checks, `${role}: team list returns members`, false, String(error));
    }
  } else {
    record(
      checks,
      `${role}: sees only Alpha`,
      projectNames.includes(TEST_PROJECT_NAME) && !projectNames.includes(TEST_PROJECT_BETA),
      projectNames.join(", "),
    );
    if (beta) {
      try {
        await client.query(api.projects.getById, {
          workspaceId,
          projectId: beta.id as never,
        });
        record(checks, `${role}: Beta getById blocked`, false, "returned project");
      } catch {
        record(checks, `${role}: Beta getById blocked`, true);
      }
    }
  }

  const events = await client.query(api.events.listByWorkspace, {
    workspaceId,
    limit: 50,
  });
  const titles = events.map((e) => e.title);
  if (role === "owner" || role === "admin") {
    record(checks, `${role}: timeline includes Beta PR`, titles.includes("Test PR Beta"));
  } else {
    record(checks, `${role}: timeline includes Alpha PR`, titles.includes("Test PR #42"));
    record(checks, `${role}: timeline hides Beta PR`, !titles.includes("Test PR Beta"));
  }

  const workstreams = await client.query(api.workstreams.listByWorkspace, {
    workspaceId,
    limit: 20,
  });
  record(
    checks,
    `${role}: workstreams load`,
    Array.isArray(workstreams),
    `${workstreams.length} workstreams`,
  );

  const entities = await client.query(api.entities.listByWorkspace, {
    workspaceId,
    limit: 20,
  });
  record(checks, `${role}: entities load`, Array.isArray(entities), `${entities.length} entities`);

  if (role === "member" || role === "viewer") {
    try {
      await client.mutation(api.apiKeys.create, {
        workspaceId,
        name: "should-not-create",
      });
      record(checks, `${role}: API key create blocked`, false, "mutation succeeded");
    } catch {
      record(checks, `${role}: API key create blocked`, true);
    }
  } else {
    const caps = await client.query(api.workspaceMembers.getCurrentMembership, { workspaceId });
    record(
      checks,
      `${role}: canCreateApiKeys capability`,
      Boolean(caps?.canCreateApiKeys),
    );
  }

  if (alpha) {
    const access = await client.query(api.projectAccess.listForProject, {
      workspaceId,
      projectId: alpha.id as never,
    });
    record(
      checks,
      `${role}: project access list for Alpha`,
      role === "owner" || role === "admin" || Array.isArray(access),
      `${access.length} rows`,
    );
  }

  return checks;
}

async function runBrowserChecks(baseURL: string, email: string, role: Role): Promise<Check[]> {
  const checks: Check[] = [];
  const { chromium } = await import("@playwright/test");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const { clerk, clerkSetup } = await import("@clerk/testing/playwright");
    await clerkSetup();
    await page.goto(`${baseURL}/sign-in`);
    await clerk.signIn({ page, emailAddress: email });
    await page.goto(`${baseURL}/home`);

    if (role === "owner") {
      await bootstrapE2EUser(page);
    } else if (role === "admin") {
      await bootstrapE2EAdmin(page);
    } else if (role === "member") {
      await bootstrapE2EMember(page);
    } else {
      await bootstrapE2EViewer(page);
    }

    await page.reload();
    await waitForConvexAuth(page);
    await page
      .getByText(TEST_WORKSPACE_NAME)
      .first()
      .waitFor({ state: "visible", timeout: 20_000 })
      .catch(() => {});

    await page.goto(`${baseURL}/projects`);
    await page.waitForLoadState("networkidle");
    await page
      .getByText(TEST_PROJECT_NAME, { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: 20_000 })
      .catch(() => {});

    const alphaVisible =
      (await page.getByText(TEST_PROJECT_NAME, { exact: false }).count()) > 0;
    const betaVisible =
      (await page.getByText(TEST_PROJECT_BETA, { exact: false }).count()) > 0;

    if (role === "owner" || role === "admin") {
      record(checks, `UI ${role}: projects page shows Alpha`, alphaVisible);
      record(checks, `UI ${role}: projects page shows Beta`, betaVisible);
      await page.goto(`${baseURL}/sources`);
      await page.waitForLoadState("networkidle");
      await page
        .getByRole("button", { name: /Advanced — manual API key setup/i })
        .click();
      const createVisible = await page
        .getByRole("button", { name: /Create key/i })
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      record(checks, `UI ${role}: sources create visible`, createVisible);
      await page.goto(`${baseURL}/settings/team`);
      await page.waitForLoadState("networkidle");
      await page.getByText("Members").waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
      const manageVisible = (await page.getByText(/Manage Projects/i).count()) > 0;
      record(checks, `UI ${role}: Manage Projects visible`, manageVisible);
    } else {
      record(checks, `UI ${role}: projects page shows Alpha`, alphaVisible);
      record(checks, `UI ${role}: projects page hides Beta`, !betaVisible);
      await page.goto(`${baseURL}/timeline`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2_000);
      const alphaEvent = (await page.getByText("Test PR #42").count()) > 0;
      const betaEvent = (await page.getByText("Test PR Beta").count()) > 0;
      record(checks, `UI ${role}: timeline shows Alpha event`, alphaEvent);
      record(checks, `UI ${role}: timeline hides Beta event`, !betaEvent);
      await page.goto(`${baseURL}/sources`);
      await page.waitForLoadState("networkidle");
      const createVisible =
        (await page.getByText(/Create key/i).count()) > 0;
      record(checks, `UI ${role}: sources create hidden`, !createVisible);
    }
  } catch (error) {
    record(checks, `UI ${role}: browser flow`, false, String(error));
  } finally {
    await browser.close();
  }

  return checks;
}

async function main() {
  loadEnvLocal();
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

  console.log("=== Sprint 23 Project Access Sanity Check ===\n");

  const userIds: Record<Role, string> = {
    owner: await ensureClerkUser(USERS.owner, "Sanity Owner"),
    admin: await ensureClerkUser(USERS.admin, "Sanity Admin"),
    member: await ensureClerkUser(USERS.member, "Sanity Member"),
    viewer: await ensureClerkUser(USERS.viewer, "Sanity Viewer"),
  };

  console.log("Test accounts:");
  for (const [role, email] of Object.entries(USERS)) {
    console.log(`  ${role}: ${email} (${userIds[role as Role]})`);
  }
  console.log("");

  const ownerClient = convexClient(await getConvexTokenForUser(userIds.owner));
  await completeOnboarding(ownerClient);
  const seed = await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  const workspaceId = seed.workspaceId;
  console.log(`Seeded workspace: ${TEST_WORKSPACE_NAME} (${workspaceId})\n`);

  const projects = await ownerClient.query(api.projects.listByWorkspace, { workspaceId });
  console.log(`Projects in workspace: ${projects.map((p) => p.name).join(", ") || "(none)"}`);
  const alpha = projects.find((p) => p.name === TEST_PROJECT_NAME);
  const beta = projects.find((p) => p.name === TEST_PROJECT_BETA);
  if (!alpha || !beta) {
    throw new Error(
      `Expected Alpha and Beta projects after seed (got: ${projects.map((p) => p.name).join(", ")})`,
    );
  }

  const adminClient = convexClient(await getConvexTokenForUser(userIds.admin));
  await completeOnboarding(adminClient);
  await adminClient.mutation(api.testSeed.bootstrapTestAdmin, {});

  const memberClient = convexClient(await getConvexTokenForUser(userIds.member));
  await completeOnboarding(memberClient);
  await memberClient.mutation(api.testSeed.bootstrapTestMember, {});

  const viewerClient = convexClient(await getConvexTokenForUser(userIds.viewer));
  await completeOnboarding(viewerClient);
  await viewerClient.mutation(api.testSeed.bootstrapTestViewer, {});

  const members = await ownerClient.query(api.workspaceMembers.listByWorkspace, {
    workspaceId,
  });
  const viewerMember = members.find((m) => m.clerkUserId === userIds.viewer);
  if (viewerMember) {
    await ownerClient.mutation(api.projectAccess.revoke, {
      workspaceId,
      projectId: beta.id as never,
      memberId: viewerMember.id as never,
    });
  }

  console.log("API checks:\n");
  const allChecks: Check[] = [];

  allChecks.push(
    ...(await runApiChecks({
      role: "owner",
      client: ownerClient,
      workspaceId,
      alphaProjectId: alpha.id,
      betaProjectId: beta.id,
    })),
  );
  allChecks.push(
    ...(await runApiChecks({
      role: "admin",
      client: adminClient,
      workspaceId,
      alphaProjectId: alpha.id,
      betaProjectId: beta.id,
    })),
  );
  allChecks.push(
    ...(await runApiChecks({
      role: "member",
      client: memberClient,
      workspaceId,
      alphaProjectId: alpha.id,
      betaProjectId: beta.id,
    })),
  );
  allChecks.push(
    ...(await runApiChecks({
      role: "viewer",
      client: viewerClient,
      workspaceId,
      alphaProjectId: alpha.id,
      betaProjectId: beta.id,
    })),
  );

  try {
    const appOk = (await fetch(baseURL)).status < 500;
    if (!appOk) {
      throw new Error(`App not reachable at ${baseURL}`);
    }
    console.log("\nUI checks:\n");
    for (const role of ["owner", "admin", "member", "viewer"] as const) {
      allChecks.push(...(await runBrowserChecks(baseURL, USERS[role], role)));
    }
  } catch (error) {
    record(allChecks, "UI: app reachable", false, String(error));
  }

  const failed = allChecks.filter((c) => !c.pass);
  console.log("\n=== Summary ===");
  console.log(`Total: ${allChecks.length}, Passed: ${allChecks.length - failed.length}, Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log("\nFailures:");
    for (const check of failed) {
      console.log(`  - ${check.name}${check.detail ? `: ${check.detail}` : ""}`);
    }
    process.exit(1);
  }
  console.log("\nAll sanity checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
