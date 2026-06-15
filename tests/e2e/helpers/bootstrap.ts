import { ConvexHttpClient } from "convex/browser";
import type { Page } from "@playwright/test";
import { api } from "../../../convex/_generated/api";

export async function getConvexAuthToken(page: Page): Promise<string> {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const token = await page.evaluate(async () => {
      const clerk = (
        window as Window & {
          Clerk?: {
            session?: {
              getToken: (opts?: { template?: string }) => Promise<string | null>;
            };
          };
        }
      ).Clerk;
      return clerk?.session?.getToken({ template: "convex" });
    });

    if (token) {
      return token;
    }

    await page.waitForTimeout(500);
  }

  throw new Error("Could not read Convex auth token from Clerk session");
}

export async function waitForConvexAuth(page: Page, timeoutMs = 60_000) {
  await page.waitForFunction(
    () => {
      const main = document.querySelector("main");
      return (
        main !== null &&
        !main.textContent?.includes("Could not connect your session to Convex")
      );
    },
    { timeout: timeoutMs },
  );
}

export async function bootstrapE2EUser(page: Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for E2E bootstrap");
  }

  await waitForConvexAuth(page);

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(await getConvexAuthToken(page));

  const profile = await client.query(api.onboarding.getProfile, {});
  if (!profile?.completedAt) {
    await client.mutation(api.onboarding.upsert, {
      patch: {
        companyName: "Sortiri E2E",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "What did the agent do yesterday?",
        currentStep: 5,
      },
    });
    await client.mutation(api.onboarding.complete, {});
  }

  await client.mutation(api.testSeed.seedTestWorkspace, {});
}

export async function bootstrapE2EMember(page: Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for E2E bootstrap");
  }

  await waitForConvexAuth(page);

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(await getConvexAuthToken(page));

  const profile = await client.query(api.onboarding.getProfile, {});
  if (!profile?.completedAt) {
    await client.mutation(api.onboarding.upsert, {
      patch: {
        companyName: "Sortiri E2E Member",
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion: "What changed in my assigned project?",
        currentStep: 5,
      },
    });
    await client.mutation(api.onboarding.complete, {});
  }

  await client.mutation(api.testSeed.bootstrapTestMember, {});
}

async function completeOnboardingIfNeeded(
  client: ConvexHttpClient,
  companyName: string,
  exampleQuestion: string,
) {
  const profile = await client.query(api.onboarding.getProfile, {});
  if (!profile?.completedAt) {
    await client.mutation(api.onboarding.upsert, {
      patch: {
        companyName,
        companyType: "SaaS",
        trackTypes: ["Agent Actions"],
        tools: ["Cursor"],
        exampleQuestion,
        currentStep: 5,
      },
    });
    await client.mutation(api.onboarding.complete, {});
  }
}

export async function bootstrapE2EAdmin(page: Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for E2E bootstrap");
  }

  await waitForConvexAuth(page);
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(await getConvexAuthToken(page));
  await completeOnboardingIfNeeded(
    client,
    "Sortiri E2E Admin",
    "What changed across all projects?",
  );
  await client.mutation(api.testSeed.seedTestWorkspace, {});
  await client.mutation(api.testSeed.bootstrapTestAdmin, {});
}

export async function bootstrapE2EViewer(page: Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for E2E bootstrap");
  }

  await waitForConvexAuth(page);
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(await getConvexAuthToken(page));
  await completeOnboardingIfNeeded(
    client,
    "Sortiri E2E Viewer",
    "What can I see in my project?",
  );
  await client.mutation(api.testSeed.bootstrapTestViewer, {});
}

export async function bootstrapE2EAuditor(page: Page) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required for E2E bootstrap");
  }

  await waitForConvexAuth(page);
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(await getConvexAuthToken(page));
  await completeOnboardingIfNeeded(
    client,
    "Sortiri E2E Auditor",
    "What evidence is in my audit report?",
  );
  await client.mutation(api.testSeed.bootstrapTestAuditor, {});
}
