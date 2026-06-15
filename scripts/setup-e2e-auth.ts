/**
 * Provisions (or reuses) an AgentMail inbox and Clerk test user for Playwright E2E.
 *
 * Usage:
 *   AGENTMAIL_API_KEY=am_us_... npx tsx scripts/setup-e2e-auth.ts
 *
 * Writes tests/e2e/.env.e2e with E2E_EMAIL and E2E_PASSWORD.
 */

import fs from "node:fs";
import path from "node:path";

const AGENTMAIL_BASE = "https://api.agentmail.to/v0";
const DEFAULT_INBOX_USERNAME = "sortiri-e2e";
const DEFAULT_MEMBER_INBOX_USERNAME = "sortiri-e2e-member";
const DEFAULT_AUDITOR_INBOX_USERNAME = "sortiri-e2e-auditor";
const DEFAULT_PASSWORD = "SortiriE2E!sortiri-timeline-2026";

function clerkIssuerFromPublishableKey(publishableKey: string): string {
  const encoded = publishableKey.split("_")[2];
  if (!encoded) {
    throw new Error("Could not parse Clerk publishable key");
  }
  const host = Buffer.from(encoded, "base64").toString().replace(/\$$/, "");
  return `https://${host}`;
}

async function syncConvexAuthEnv(issuerDomain: string) {
  const { execSync } = await import("node:child_process");
  execSync(`npx convex env set CLERK_JWT_ISSUER_DOMAIN "${issuerDomain}"`, {
    stdio: "inherit",
  });
  execSync('npx convex env set SORTIRI_TEST_MODE "true"', { stdio: "inherit" });
}

type AgentMailInbox = {
  inbox_id: string;
  email: string;
};

type AgentMailInboxList = {
  inboxes: AgentMailInbox[];
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function agentMailFetch<T>(
  apiKey: string,
  route: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${AGENTMAIL_BASE}${route}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AgentMail ${route} failed: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
}

async function resolveInbox(
  apiKey: string,
  username = DEFAULT_INBOX_USERNAME,
): Promise<AgentMailInbox> {
  const preferredEmail = `${username}@agentmail.to`;
  const listed = await agentMailFetch<AgentMailInboxList>(apiKey, "/inboxes");
  const existing = listed.inboxes.find((inbox) => inbox.email === preferredEmail);

  if (existing) {
    return existing;
  }

  const displayName =
    username === DEFAULT_MEMBER_INBOX_USERNAME
      ? "Sortiri E2E Member"
      : username === DEFAULT_AUDITOR_INBOX_USERNAME
        ? "Sortiri E2E Auditor"
        : "Sortiri E2E";

  try {
    return await agentMailFetch<AgentMailInbox>(apiKey, "/inboxes", {
      method: "POST",
      body: JSON.stringify({
        username,
        display_name: displayName,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const limitExceeded = message.includes("LimitExceeded") || message.includes("403");

    // Owner: reuse first inbox when account is at inbox limit.
    if (limitExceeded && username === DEFAULT_INBOX_USERNAME && listed.inboxes[0]) {
      console.warn(
        `AgentMail inbox limit reached — using ${listed.inboxes[0]!.email} for owner.`,
      );
      return listed.inboxes[0]!;
    }

    // Member/auditor: Clerk testing sign-in does not need a real inbox.
    if (limitExceeded) {
      console.warn(
        `AgentMail inbox limit reached — using Clerk-only email ${preferredEmail}.`,
      );
      return { inbox_id: "clerk-only", email: preferredEmail };
    }

    throw error;
  }
}

async function ensureClerkConvexJwtTemplate() {
  const clerkSecret = requireEnv("CLERK_SECRET_KEY");
  const listResponse = await fetch("https://api.clerk.com/v1/jwt_templates", {
    headers: { Authorization: `Bearer ${clerkSecret}` },
  });
  if (!listResponse.ok) {
    throw new Error(`Clerk JWT template lookup failed: ${listResponse.status}`);
  }

  const templates = (await listResponse.json()) as Array<{ name: string }>;
  if (templates.some((template) => template.name === "convex")) {
    return;
  }

  const createResponse = await fetch("https://api.clerk.com/v1/jwt_templates", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "convex",
      claims: { aud: "convex" },
    }),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text();
    throw new Error(`Clerk JWT template create failed: ${createResponse.status} ${body}`);
  }
}

async function ensureClerkUser(email: string, password: string) {
  const clerkSecret = requireEnv("CLERK_SECRET_KEY");

  const listResponse = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${clerkSecret}` } },
  );
  if (!listResponse.ok) {
    throw new Error(`Clerk user lookup failed: ${listResponse.status}`);
  }

  const users = (await listResponse.json()) as Array<{ id: string }>;
  if (users.length > 0) {
    const updateResponse = await fetch(`https://api.clerk.com/v1/users/${users[0]!.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${clerkSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
        skip_password_checks: true,
      }),
    });
    if (!updateResponse.ok) {
      const body = await updateResponse.text();
      throw new Error(`Clerk user update failed: ${updateResponse.status} ${body}`);
    }
    return;
  }

  const createResponse = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: true,
      skip_password_requirement: true,
    }),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text();
    throw new Error(`Clerk user create failed: ${createResponse.status} ${body}`);
  }
}

async function main() {
  const apiKey = requireEnv("AGENTMAIL_API_KEY");
  const password = process.env.E2E_PASSWORD?.trim() ?? DEFAULT_PASSWORD;

  console.log("Resolving AgentMail inbox…");
  const inbox = await resolveInbox(apiKey, DEFAULT_INBOX_USERNAME);
  console.log(`AgentMail inbox: ${inbox.email}`);

  console.log("Resolving member AgentMail inbox…");
  const memberInbox = await resolveInbox(apiKey, DEFAULT_MEMBER_INBOX_USERNAME);
  console.log(`Member inbox: ${memberInbox.email}`);

  console.log("Resolving auditor AgentMail inbox…");
  const auditorInbox = await resolveInbox(apiKey, DEFAULT_AUDITOR_INBOX_USERNAME);
  console.log(`Auditor inbox: ${auditorInbox.email}`);

  console.log("Ensuring Clerk E2E user…");
  await ensureClerkConvexJwtTemplate();
  await ensureClerkUser(inbox.email, password);
  await ensureClerkUser(memberInbox.email, password);
  await ensureClerkUser(auditorInbox.email, password);

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (publishableKey) {
    const issuerDomain = clerkIssuerFromPublishableKey(publishableKey);
    console.log(`Syncing Convex auth env (${issuerDomain})…`);
    await syncConvexAuthEnv(issuerDomain);
  } else {
    console.warn(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set — skipping Convex auth env sync.",
    );
  }

  const envFile = path.join("tests/e2e/.env.e2e");
  const contents = [
    `E2E_EMAIL=${inbox.email}`,
    `E2E_PASSWORD=${password}`,
    `E2E_MEMBER_EMAIL=${memberInbox.email}`,
    `E2E_MEMBER_PASSWORD=${password}`,
    `E2E_AUDITOR_EMAIL=${auditorInbox.email}`,
    `E2E_AUDITOR_PASSWORD=${password}`,
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(envFile), { recursive: true });
  fs.writeFileSync(envFile, contents, { encoding: "utf8" });

  console.log("");
  console.log("E2E credentials ready:");
  console.log(`  E2E_EMAIL=${inbox.email}`);
  console.log(`  E2E_MEMBER_EMAIL=${memberInbox.email}`);
  console.log(`  E2E_AUDITOR_EMAIL=${auditorInbox.email}`);
  console.log(`  wrote ${envFile}`);
  console.log("");
  console.log("Run:");
  console.log("  npm run test:ui");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
