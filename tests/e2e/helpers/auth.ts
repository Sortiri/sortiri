import { test } from "@playwright/test";

export const hasE2eAuth = Boolean(
  process.env.E2E_EMAIL?.trim() && process.env.E2E_PASSWORD?.trim(),
);

export const hasE2eMemberAuth = Boolean(
  process.env.E2E_MEMBER_EMAIL?.trim() &&
    (process.env.E2E_MEMBER_PASSWORD?.trim() || process.env.E2E_PASSWORD?.trim()),
);

export const hasE2eAuditorAuth = Boolean(
  process.env.E2E_AUDITOR_EMAIL?.trim() &&
    (process.env.E2E_AUDITOR_PASSWORD?.trim() || process.env.E2E_PASSWORD?.trim()),
);

export const describeE2E = hasE2eAuth ? test.describe : test.describe.skip;

export function skipForAuditor(
  testInfo: { project: { name: string } },
  reason = "auditors have audit-scoped access only",
) {
  test.skip(testInfo.project.name === "auditor", reason);
}
