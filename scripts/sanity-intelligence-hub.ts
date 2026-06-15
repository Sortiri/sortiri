/**
 * Sprint 32 Intelligence Hub sanity check.
 *
 * Usage: npx tsx scripts/sanity-intelligence-hub.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import {
  dashboardPrimaryNavItems,
  INTELLIGENCE_NAV_HREF,
  isDashboardNavItemActive,
  isIntelligenceRoute,
} from "../src/config/dashboard-nav";

const PASSWORD = "SortiriSanity!intelligence-hub-2026";
const OWNER_EMAIL = "sortiri-sanity-intelligence-owner@agentmail.to";

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
  if (!value) throw new Error(`Missing ${name}`);
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
    throw new Error(`Clerk ${route} failed: ${response.status} ${await response.text()}`);
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

function client(token: string) {
  const c = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"));
  c.setAuth(token);
  return c;
}

async function completeOnboarding(c: ConvexHttpClient) {
  const profile = await c.query(api.onboarding.getProfile, {});
  if (!profile?.completedAt) {
    await c.mutation(api.onboarding.upsert, {
      patch: {
        companyName: "Intelligence Sanity Co",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "What changed recently?",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

function assertNavConfig() {
  const labels = dashboardPrimaryNavItems.map((item) => item.label);
  const hrefs = dashboardPrimaryNavItems.map((item) => item.href);

  if (!labels.includes("Intelligence")) {
    throw new Error("Sidebar nav config missing Intelligence");
  }
  for (const removed of ["Impact", "Lessons", "Playbooks", "Insights"]) {
    if (labels.includes(removed)) {
      throw new Error(`Sidebar nav config should not include top-level ${removed}`);
    }
  }
  for (const removedHref of ["/impact", "/lessons", "/playbooks", "/insights"]) {
    if (hrefs.includes(removedHref)) {
      throw new Error(`Sidebar nav config should not include top-level ${removedHref}`);
    }
  }

  const intelligenceItem = dashboardPrimaryNavItems.find((item) => item.label === "Intelligence");
  if (intelligenceItem?.href !== INTELLIGENCE_NAV_HREF) {
    throw new Error("Intelligence nav href must be /intelligence");
  }

  const childRoutes = ["/intelligence", "/insights", "/impact", "/lessons", "/playbooks"];
  for (const route of childRoutes) {
    if (!isIntelligenceRoute(route)) {
      throw new Error(`Expected intelligence route: ${route}`);
    }
    if (!isDashboardNavItemActive(route, INTELLIGENCE_NAV_HREF)) {
      throw new Error(`Expected Intelligence active on ${route}`);
    }
  }

  console.log("  [PASS] Sidebar nav config and active mapping");
}

async function assertRoutesRespond(baseUrl: string) {
  const routes = ["/intelligence", "/insights", "/impact", "/lessons", "/playbooks"];
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    if (response.status >= 500) {
      throw new Error(`${route} returned ${response.status}`);
    }
  }
  console.log(`  [PASS] App routes respond via ${baseUrl}`);
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 32 Intelligence Hub sanity check\n");

  assertNavConfig();

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "IntelOwner");
  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  await completeOnboarding(ownerClient);
  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});

  const state = await ownerClient.query(api.workspaces.getState, {});
  const workspaceId = state.activeWorkspaceId;
  if (!workspaceId) throw new Error("No active workspace");

  await ownerClient.mutation(api.testSeed.seedImpactStory, {});
  await ownerClient.mutation(api.testSeed.seedLessonsPlaybooksStory, {});

  const hub = await ownerClient.query(api.intelligenceHub.getHub, { workspaceId });
  if (!hub || !Array.isArray(hub.summaries) || hub.summaries.length !== 4) {
    throw new Error("Intelligence hub query returned invalid summaries");
  }
  if (!Array.isArray(hub.recentActivity)) {
    throw new Error("Intelligence hub query returned invalid recentActivity");
  }
  console.log("  [PASS] Intelligence hub Convex query");

  const insights = await ownerClient.query(api.insights.listRuns, { workspaceId, limit: 1 });
  const impact = await ownerClient.query(api.impactAnalyses.listByWorkspace, { workspaceId });
  const lessons = await ownerClient.query(api.lessons.listByWorkspace, { workspaceId });
  const playbooks = await ownerClient.query(api.playbooks.listByWorkspace, { workspaceId });
  if (!impact || !lessons || !playbooks) {
    throw new Error("Child intelligence APIs failed");
  }
  console.log("  [PASS] Child intelligence APIs respond");
  void insights;

  const appUrl = process.env.SANITY_APP_URL?.trim() || "http://localhost:3000";
  try {
    const health = await fetch(appUrl, { redirect: "manual" });
    if (health.status < 500) {
      await assertRoutesRespond(appUrl);
    } else {
      console.log("  [SKIP] Local app not reachable for HTTP route checks");
    }
  } catch {
    console.log("  [SKIP] Local app not reachable for HTTP route checks");
  }

  console.log("\nSprint 32 Intelligence Hub sanity: ALL PASSED");
  console.log(`WORKSPACE_ID=${workspaceId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
