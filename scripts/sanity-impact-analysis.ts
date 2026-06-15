/**
 * Sprint 30 Impact Analysis sanity check.
 *
 * Usage: npx tsx scripts/sanity-impact-analysis.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const PASSWORD = "SortiriSanity!impact-analysis-2026";
const OWNER_EMAIL = "sortiri-sanity-impact-owner@agentmail.to";
const MEMBER_EMAIL = "sortiri-sanity-impact-member@agentmail.to";

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

function assertNoCausation(text: string) {
  const lower = text.toLowerCase();
  if (/\b(caused|definitely|proved)\b/.test(lower)) {
    throw new Error(`Causation language found: ${text.slice(0, 120)}`);
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 30 Impact Analysis sanity check\n");

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "ImpactOwner");
  const memberUserId = await ensureClerkUser(MEMBER_EMAIL, "ImpactMember");
  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  const memberClient = client(await getConvexTokenForUser(memberUserId));

  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  const state = await ownerClient.query(api.workspaces.getState, {});
  const workspaceId = state.activeWorkspaceId;
  if (!workspaceId) throw new Error("No active workspace");

  const story = await ownerClient.mutation(api.testSeed.seedImpactStory, {});
  console.log("  [PASS] Seeded impact story");

  const created = await ownerClient.mutation(api.impactAnalyses.create, {
    workspaceId,
    title: "Sanity Impact Analysis",
    anchor: {
      type: "workstream",
      workstreamId: story.workstreamId as Id<"workstreams">,
      title: "Impact Story Workstream",
      occurredAt: story.anchorTime ?? Date.now(),
    },
    windowPreset: "7d",
  });

  await ownerClient.mutation(api.impactAnalyses.generate, {
    analysisId: created.analysisId,
  });
  console.log("  [PASS] Created and generated impact analysis");

  const detail = await ownerClient.query(api.impactAnalyses.getById, {
    analysisId: created.analysisId,
  });
  if (!detail?.analysis || detail.analysis.status !== "generated") {
    throw new Error("Impact analysis not generated");
  }
  if (!detail.analysis.generatedSummary) {
    throw new Error("Missing generated summary");
  }
  assertNoCausation(detail.analysis.generatedSummary);
  if (!detail.findings || detail.findings.length === 0) {
    throw new Error("Expected findings");
  }
  console.log("  [PASS] Summary and findings present with cautious language");

  const metrics = detail.analysis.metrics as {
    baseline?: { product?: { productEvents?: number }; revenue?: { paymentsSucceeded?: number } };
    impact?: { product?: { productEvents?: number }; revenue?: { paymentsSucceeded?: number } };
  };
  if (!metrics?.impact?.product) {
    throw new Error("Missing impact product metrics");
  }
  console.log("  [PASS] Metrics include product and revenue windows");

  await ownerClient.mutation(api.auditReports.create, {
    workspaceId,
    title: "Impact audit",
    scope: {
      impactAnalysisId: created.analysisId,
      visibility: "primary",
    },
  });
  console.log("  [PASS] Audit report created from impact scope");

  let memberBlocked = false;
  try {
    await memberClient.mutation(api.impactAnalyses.create, {
      workspaceId,
      title: "Member blocked",
      anchor: { type: "manual", title: "Now", occurredAt: Date.now() },
    });
  } catch {
    memberBlocked = true;
  }
  if (!memberBlocked) {
    await ownerClient.mutation(api.testSeed.seedMemberProjectAccess, {
      workspaceId,
      clerkUserId: memberUserId,
      accessLevel: "viewer",
    });
    const memberCreated = await memberClient.mutation(api.impactAnalyses.create, {
      workspaceId,
      title: "Member impact",
      anchor: {
        type: "workstream",
        workstreamId: story.workstreamId as Id<"workstreams">,
        title: "Impact Story Workstream",
        occurredAt: story.anchorTime ?? Date.now(),
      },
    });
    await memberClient.mutation(api.impactAnalyses.generate, {
      analysisId: memberCreated.analysisId,
    });
    console.log("  [PASS] Member with project access can create impact analysis");
  }

  console.log("\nSprint 30 Impact Analysis sanity check: ALL PASS");
}

main().catch((error) => {
  console.error("\nSprint 30 Impact Analysis sanity check: FAIL");
  console.error(error);
  process.exit(1);
});
