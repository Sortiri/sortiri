import { test } from "@playwright/test";

export const hasE2eAuth = Boolean(
  process.env.E2E_EMAIL?.trim() && process.env.E2E_PASSWORD?.trim(),
);

export const describeE2E = hasE2eAuth ? test.describe : test.describe.skip;
