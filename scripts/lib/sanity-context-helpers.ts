import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { API_KEY_PREFIX } from "../../src/types/api-keys";

export const CONTEXT_SANITY_PASSWORD = "SortiriSanity!context-loop-2026";
export const CONTEXT_OWNER_EMAIL = "sortiri-sanity-context-owner@agentmail.to";
export const CONTEXT_AUDITOR_EMAIL = "sortiri-sanity-context-auditor@agentmail.to";

export type HttpPackResponse = {
  contextPackId?: string;
  summary?: string;
  text?: string;
  counts?: Record<string, number>;
  error?: string;
};

export function loadEnvLocal(): void {
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

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.API_URL ??
    process.env.SANITY_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function maskApiKey(rawKey: string): string {
  const last4 = rawKey.slice(-4);
  return `${API_KEY_PREFIX}_••••${last4}`;
}

export function assertNoSecrets(text: string): void {
  if (/sk_sortiri_[a-f0-9]{8,}/i.test(text)) {
    throw new Error("Raw API key found in context output");
  }
  if (/sk-[a-z0-9]{10,}/i.test(text)) {
    throw new Error("Raw secret-like token found in context output");
  }
}

export function assertContextSections(text: string): void {
  const lower = text.toLowerCase();
  if (!lower.includes("playbook")) {
    throw new Error("Context output missing recommended playbook section");
  }
  if (!lower.includes("lesson")) {
    throw new Error("Context output missing lessons section");
  }
  if (!lower.includes("failure")) {
    throw new Error("Context output missing known failures section");
  }
  if (!lower.includes("validation")) {
    throw new Error("Context output missing validation requirements section");
  }
}

export async function clerkFetch<T>(route: string, init?: RequestInit): Promise<T> {
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

export async function ensureClerkUser(email: string, firstName: string): Promise<string> {
  const listed = await clerkFetch<Array<{ id: string }>>(
    `/users?email_address=${encodeURIComponent(email)}`,
  );
  if (listed.length > 0) {
    await clerkFetch(`/users/${listed[0]!.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        password: CONTEXT_SANITY_PASSWORD,
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
      password: CONTEXT_SANITY_PASSWORD,
      skip_password_checks: true,
      skip_password_requirement: true,
      first_name: firstName,
    }),
  });
  return created.id;
}

export async function getConvexTokenForUser(userId: string): Promise<string> {
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

export function convexClient(token: string): ConvexHttpClient {
  const c = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"));
  c.setAuth(token);
  return c;
}

export async function completeOnboarding(c: ConvexHttpClient): Promise<void> {
  const profile = await c.query(api.onboarding.getProfile, {});
  if (!profile?.completedAt) {
    await c.mutation(api.onboarding.upsert, {
      patch: {
        companyName: "Context Sanity Co",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "What context should agents load?",
        currentStep: 5,
      },
    });
    await c.mutation(api.onboarding.complete, {});
  }
}

export async function requireLocalApp(appUrl: string): Promise<void> {
  if (process.env.ALLOW_CONTEXT_HTTP_SKIP === "true") {
    throw new Error(
      "ALLOW_CONTEXT_HTTP_SKIP=true is set. Sprint 33 completion requires real HTTP tests.",
    );
  }
  if (process.env.ALLOW_AUTONOMY_HTTP_SKIP === "true") {
    throw new Error(
      "ALLOW_AUTONOMY_HTTP_SKIP=true is set. Sprint 34 completion requires real HTTP tests.",
    );
  }
  try {
    const response = await fetch(`${appUrl}/cli/health`, { redirect: "manual" });
    if (response.status >= 500) {
      throw new Error(`Local app unhealthy: HTTP ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Local Next.js app not reachable at ${appUrl} (${message}). Start with: npm run dev`,
    );
  }
}

export async function postContextRoute(
  appUrl: string,
  route: string,
  body: Record<string, unknown>,
  rawKey?: string,
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (rawKey !== undefined) {
    headers.Authorization = `Bearer ${rawKey}`;
  }
  return fetch(`${appUrl}${route}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function getContextPackRoute(
  appUrl: string,
  contextPackId: string,
  workspaceId: string,
  rawKey: string,
): Promise<Response> {
  const params = new URLSearchParams({ workspaceId });
  return fetch(`${appUrl}/cli/context/packs/${contextPackId}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${rawKey}` },
  });
}

export async function createContextPackViaHttp(
  appUrl: string,
  rawKey: string,
  workspaceId: string,
  goal: string,
  projectId?: Id<"projects">,
  workstreamId?: Id<"workstreams">,
): Promise<HttpPackResponse> {
  const response = await postContextRoute(
    appUrl,
    "/cli/context/packs",
    {
      workspaceId,
      goal,
      projectId,
      workstreamId,
      files: ["src/app/checkout/page.tsx"],
      timeWindowDays: 30,
      title: `Sanity: ${goal.slice(0, 60)}`,
    },
    rawKey,
  );
  const payload = (await response.json().catch(() => null)) as HttpPackResponse | null;
  if (!response.ok) {
    throw new Error(
      `HTTP create context pack failed: ${response.status} ${payload?.error ?? ""}`.trim(),
    );
  }
  return payload ?? {};
}
