/**
 * Sprint 31 Lessons + Playbooks sanity check.
 *
 * Usage: npx tsx scripts/sanity-lessons-playbooks.ts
 */

import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const PASSWORD = "SortiriSanity!lessons-playbooks-2026";
const OWNER_EMAIL = "sortiri-sanity-lessons-owner@agentmail.to";
const MEMBER_EMAIL = "sortiri-sanity-lessons-member@agentmail.to";
const AUDITOR_EMAIL = "sortiri-sanity-lessons-auditor@agentmail.to";

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
        companyName: "Lessons Sanity Co",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "What did we learn recently?",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

function assertNoCausation(text: string) {
  const lower = text.toLowerCase();
  if (/\b(caused|definitely|proved|guarantees)\b/.test(lower)) {
    throw new Error(`Causation language found: ${text.slice(0, 120)}`);
  }
}

async function main() {
  loadEnvLocal();
  console.log("Sprint 31 Lessons + Playbooks sanity check\n");

  const ownerUserId = await ensureClerkUser(OWNER_EMAIL, "LessonsOwner");
  const memberUserId = await ensureClerkUser(MEMBER_EMAIL, "LessonsMember");
  const auditorUserId = await ensureClerkUser(AUDITOR_EMAIL, "LessonsAuditor");
  const ownerClient = client(await getConvexTokenForUser(ownerUserId));
  const memberClient = client(await getConvexTokenForUser(memberUserId));
  const auditorClient = client(await getConvexTokenForUser(auditorUserId));

  await completeOnboarding(ownerClient);
  await completeOnboarding(memberClient);
  await completeOnboarding(auditorClient);

  await ownerClient.mutation(api.testSeed.seedTestWorkspace, {});
  await auditorClient.mutation(api.testSeed.bootstrapTestAuditor, {});
  const state = await ownerClient.query(api.workspaces.getState, {});
  const workspaceId = state.activeWorkspaceId;
  if (!workspaceId) throw new Error("No active workspace");

  await ownerClient.mutation(api.testSeed.seedImpactStory, {});
  const story = await ownerClient.mutation(api.testSeed.seedLessonsPlaybooksStory, {});
  console.log("  [PASS] Seeded lessons/playbooks story");

  const lessons = await ownerClient.query(api.lessons.listByImpactAnalysis, {
    impactAnalysisId: story.impactAnalysisId as Id<"impactAnalyses">,
  });
  if (!lessons || lessons.length === 0) {
    throw new Error("Expected lessons from impact analysis");
  }
  for (const lesson of lessons) {
    assertNoCausation(lesson.summary);
    if (lesson.recommendation) assertNoCausation(lesson.recommendation);
  }
  console.log("  [PASS] Lessons created with cautious copy");

  const playbookDetail = await ownerClient.query(api.playbooks.getById, {
    playbookId: story.playbookId as Id<"playbooks">,
  });
  if (!playbookDetail?.playbook?.steps?.length) {
    throw new Error("Expected playbook steps");
  }
  if (!playbookDetail.playbook.validationRequirements?.length) {
    throw new Error("Expected playbook validation requirements");
  }
  console.log("  [PASS] Playbook has steps and validation");

  const lessonAsk = await ownerClient.action(api.ask.ask, {
    workspaceId,
    question: "What does this lesson recommend?",
    lessonId: lessons[0]!.id as Id<"lessons">,
  });
  assertNoCausation(lessonAsk.answer);
  console.log("  [PASS] Ask with lessonId — no causation");

  const playbookAsk = await ownerClient.action(api.ask.ask, {
    workspaceId,
    question: "What validation should I run?",
    playbookId: story.playbookId as Id<"playbooks">,
  });
  assertNoCausation(playbookAsk.answer);
  console.log("  [PASS] Ask with playbookId — no causation");

  const audit = await ownerClient.mutation(api.auditReports.create, {
    workspaceId,
    title: "Lessons playbook audit",
    scope: {
      lessonIds: lessons.slice(0, 1).map((l) => l.id as Id<"lessons">),
      playbookIds: [story.playbookId as Id<"playbooks">],
      visibility: "primary",
    },
  });
  await ownerClient.mutation(api.auditReports.generateEvidence, {
    reportId: audit.reportId,
  });
  const auditDetail = await ownerClient.query(api.auditReports.getById, {
    reportId: audit.reportId,
  });
  if (!auditDetail || (auditDetail.itemCount ?? 0) === 0) {
    throw new Error("Audit report missing items");
  }
  console.log("  [PASS] Audit report with lesson + playbook scope");

  await memberClient.mutation(api.testSeed.bootstrapTestMember, {});
  await ownerClient.mutation(api.testSeed.seedMemberProjectAccess, {
    workspaceId,
    clerkUserId: memberUserId,
    accessLevel: "viewer",
  });
  const memberLessons = await memberClient.query(api.lessons.listByWorkspace, {
    workspaceId,
  });
  if (!memberLessons || memberLessons.length === 0) {
    throw new Error("Member should see scoped lessons");
  }
  console.log("  [PASS] Member sees scoped lessons");

  let auditorBlocked = false;
  try {
    await auditorClient.query(api.lessons.listByWorkspace, { workspaceId });
  } catch {
    auditorBlocked = true;
  }
  if (!auditorBlocked) {
    throw new Error("Auditor should be blocked from lessons browse");
  }
  console.log("  [PASS] Auditor blocked from lessons list");

  await ownerClient.mutation(api.testSeed.seedLegacyGithubWebhookSecret, {});
  await ownerClient.mutation(api.testSeed.seedPostHogWebhookSecret, {});
  await ownerClient.mutation(api.testSeed.seedStripeWebhookSecret, {});

  console.log("\nSprint 31 Lessons + Playbooks sanity: ALL PASSED");
  console.log(`WORKSPACE_ID=${workspaceId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
