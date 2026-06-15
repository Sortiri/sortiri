/**
 * Sprint 26 audit export + secure share sanity check.
 *
 * Usage: npx tsx scripts/sanity-audit-export-share.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { exportJsonString } from "../src/lib/audits/exportJson";
import { exportMarkdown } from "../src/lib/audits/exportMarkdown";

const PASSWORD = "SortiriSanity!audit-export-share-2026";
const OWNER_EMAIL = "sortiri-sanity-export-owner@agentmail.to";

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
        companyName: "Audit Export Co",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "Export audit evidence safely",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 26 audit export + share sanity check\n");

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "ExportOwner");
  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  await completeOnboarding(ownerClient);
  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});

  const seeded = await ownerClient.mutation(api.testSeed.seedAuditReportWithEvidence, {});
  const reportId = seeded.reportId as Id<"auditReports">;
  console.log("  [PASS] Finalized audit report seeded");

  const share = await ownerClient.mutation(api.auditSharing.createShareLink, {
    reportId,
    expiresIn: "24h",
  });
  if (!share.rawToken.startsWith("share_sortiri_")) {
    throw new Error("Share token has unexpected format");
  }
  console.log("  [PASS] Owner created 24h share link");

  const payload = await ownerClient.query(api.auditSharing.getExportPayloadForReport, {
    reportId,
  });
  if (!payload) {
    throw new Error("Could not load export payload");
  }

  const markdown = exportMarkdown({ ...payload, exportedAt: Date.now() });
  if (!markdown.includes("E2E Audit Report")) {
    throw new Error("Markdown export missing report title");
  }
  if (/password=blocked-test-secret/i.test(markdown)) {
    throw new Error("Markdown export leaked blocked secret");
  }
  console.log("  [PASS] Markdown export contains safe evidence only");

  const json = exportJsonString({ ...payload, exportedAt: Date.now() });
  if (/password=blocked-test-secret/i.test(json)) {
    throw new Error("JSON manifest leaked blocked secret");
  }
  if (!json.includes('"report"')) {
    throw new Error("JSON manifest missing report section");
  }
  console.log("  [PASS] JSON manifest shape and safety");

  const publicClient = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"));
  const verified = await publicClient.query(api.auditSharing.verifyShareToken, {
    token: share.rawToken,
  });
  if (!verified.ok) {
    throw new Error("Share token verification failed");
  }

  const sharedReport = await publicClient.query(api.auditSharing.getShareableReport, {
    token: share.rawToken,
  });
  if (!sharedReport || sharedReport.report.title !== "E2E Audit Report") {
    throw new Error("Share token did not return expected report");
  }
  console.log("  [PASS] Share token exposes finalized report snapshot");

  await ownerClient.mutation(api.auditSharing.revokeShareLink, {
    shareLinkId: share.shareLinkId,
  });
  const revoked = await publicClient.query(api.auditSharing.verifyShareToken, {
    token: share.rawToken,
  });
  if (revoked.ok) {
    throw new Error("Revoked share token should fail verification");
  }
  console.log("  [PASS] Revoked share link no longer works");

  await ownerClient.mutation(api.auditSharing.recordExport, {
    reportId,
    format: "markdown",
    status: "generated",
    sizeBytes: markdown.length,
  });
  console.log("  [PASS] Export record created");

  console.log(`\nAll checks passed (workspace ${seeded.workspaceId}, report ${reportId}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
