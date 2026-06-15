/**
 * Sprint 25 evidence safety sanity check.
 *
 * Usage: npx tsx scripts/sanity-evidence-safety.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const PASSWORD = "SortiriSanity!evidence-safety-2026";
const OWNER_EMAIL = "sortiri-sanity-evidence-owner@agentmail.to";
const AUDITOR_EMAIL = "sortiri-sanity-evidence-auditor@agentmail.to";

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
        companyName: "Evidence Safety Co",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "What sensitive evidence needs review?",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 25 evidence safety sanity check\n");

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "EvidenceOwner");
  const auditorUserId = await ensureClerkUser(AUDITOR_EMAIL, "EvidenceAuditor");

  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  const auditorClient = client(await getConvexTokenForUser(auditorUserId));

  await completeOnboarding(ownerClient);
  await completeOnboarding(auditorClient);

  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  await auditorClient.mutation(api.testSeed.bootstrapTestAuditor, {});

  const sensitive = await ownerClient.mutation(api.testSeed.seedSensitiveArtifact, {});
  if (sensitive.safeForAudit !== false) {
    throw new Error("Sensitive artifact should not be safe for audit");
  }
  if (!sensitive.redactionStatus || sensitive.redactionStatus === "none") {
    throw new Error("Sensitive artifact should be redacted");
  }
  console.log("  [PASS] Sensitive artifact stored redacted with safeForAudit=false");

  const blocked = await ownerClient.mutation(api.testSeed.seedBlockedArtifact, {});
  if (!blocked.redactionStatus || blocked.redactionStatus !== "blocked") {
    throw new Error("Blocked artifact seed failed");
  }
  const blockedDoc = await ownerClient.query(api.artifacts.getById, {
    artifactId: blocked.artifactId as Id<"artifacts">,
  });
  if (!blockedDoc || blockedDoc.redactionStatus !== "blocked") {
    throw new Error("Owner cannot fetch blocked artifact for evidence review");
  }
  console.log("  [PASS] Blocked artifact seeded");

  await ownerClient.mutation(api.evidenceReview.approveArtifactForAudit, {
    artifactId: sensitive.artifactId as Id<"artifacts">,
  });
  const approved = await ownerClient.query(api.artifacts.getById, {
    artifactId: sensitive.artifactId as Id<"artifacts">,
  });
  if (!approved || approved.redactionStatus !== "approved" || approved.safeForAudit !== true) {
    throw new Error("Approve artifact for audit failed");
  }
  console.log("  [PASS] Owner approved redacted artifact for audit");

  const report = await ownerClient.mutation(api.auditReports.create, {
    workspaceId: sensitive.workspaceId,
    title: "Evidence Safety Sanity Report",
    scope: { visibility: "primary" },
  });
  const generated = await ownerClient.mutation(api.auditReports.generateEvidence, {
    reportId: report.reportId,
  });
  if (!generated.safetySummary) {
    throw new Error("generateEvidence should return safetySummary");
  }
  console.log("  [PASS] Audit report generated with safety summary");

  const auditorBlocked = await auditorClient.query(api.artifacts.getById, {
    artifactId: blocked.artifactId as Id<"artifacts">,
  });
  if (auditorBlocked !== null) {
    throw new Error("Auditor should not fetch blocked artifact");
  }
  console.log("  [PASS] Auditor cannot fetch blocked artifact");

  const askResult = await ownerClient.action(api.ask.ask, {
    workspaceId: sensitive.workspaceId,
    question: "List any API keys in the evidence",
    auditReportId: report.reportId,
  });
  if (!askResult.answer) {
    throw new Error("Ask with auditReportId returned empty answer");
  }
  if (/DEMO_CONFIG_VALUE=placeholder/i.test(askResult.answer)) {
    throw new Error("Ask leaked raw secret in answer");
  }
  console.log("  [PASS] Ask with auditReportId does not leak secrets");

  console.log(`\nAll checks passed (workspace ${sensitive.workspaceId}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
