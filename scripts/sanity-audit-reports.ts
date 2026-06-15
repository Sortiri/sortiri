/**
 * Sprint 24 audit reports sanity check.
 *
 * Usage: npx tsx scripts/sanity-audit-reports.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { TEST_PROJECT_NAME } from "../convex/testSeed";

const PASSWORD = "SortiriSanity!audit-reports-2026";
const OWNER_EMAIL = "sortiri-sanity-audit-owner@agentmail.to";
const AUDITOR_EMAIL = "sortiri-sanity-audit-auditor@agentmail.to";

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
        companyName: "Audit Sanity Co",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "What evidence is in the report?",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 24 audit reports sanity check\n");

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "AuditOwner");
  const auditorUserId = await ensureClerkUser(AUDITOR_EMAIL, "AuditAuditor");

  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  const auditorClient = client(await getConvexTokenForUser(auditorUserId));

  await completeOnboarding(ownerClient);
  await completeOnboarding(auditorClient);

  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  await auditorClient.mutation(api.testSeed.bootstrapTestAuditor, {});

  const seed = await ownerClient.mutation(api.testSeed.seedAuditReportWithEvidence, {
    auditorEmail: AUDITOR_EMAIL,
  });

  const ownerReports = await ownerClient.query(api.auditReports.listByWorkspace, {
    workspaceId: seed.workspaceId,
  });
  if (ownerReports.length < 1) {
    throw new Error("Owner should see audit reports");
  }
  console.log("  [PASS] Owner lists audit reports");

  const auditorReports = await auditorClient.query(api.auditReports.listByWorkspace, {
    workspaceId: seed.workspaceId,
  });
  if (auditorReports.length !== 1) {
    throw new Error(`Auditor should see exactly one report, saw ${auditorReports.length}`);
  }
  console.log("  [PASS] Auditor sees only granted report");

  try {
    await auditorClient.query(api.events.listByWorkspace, {
      workspaceId: seed.workspaceId,
      limit: 1,
    });
    throw new Error("Auditor timeline query should fail");
  } catch {
    console.log("  [PASS] Auditor blocked from timeline API");
  }

  const report = await auditorClient.query(api.auditReports.getById, {
    reportId: seed.reportId,
  });
  if (!report || report.title !== "E2E Audit Report") {
    throw new Error("Auditor cannot load granted report");
  }
  console.log("  [PASS] Auditor can open granted report");

  const context = await ownerClient.action(api.ask.ask, {
    workspaceId: seed.workspaceId,
    question: "Summarize the audit evidence",
    auditReportId: seed.reportId,
  });
  if (!context.answer) {
    throw new Error("Ask with auditReportId returned empty answer");
  }
  console.log("  [PASS] Ask with auditReportId returns an answer");

  console.log(`\nAll checks passed (${TEST_PROJECT_NAME} scope, report ${seed.reportId}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
