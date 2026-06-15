export type ValidationRequirement = {
  title: string;
  command?: string;
  reason?: string;
  required?: boolean;
};

function haystackFrom(input: {
  goal: string;
  files?: string[];
  sources?: string[];
}): string {
  return [
    input.goal,
    ...(input.files ?? []),
    ...(input.sources ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function includesFrontendPath(files: string[]): boolean {
  return files.some((file) =>
    /(^|\/)src\/|(^|\/)app\/|\.tsx$|\.jsx$|components\//i.test(file),
  );
}

export function generateValidationRequirements(input: {
  goal: string;
  files?: string[];
  sources?: string[];
}): ValidationRequirement[] {
  const text = haystackFrom(input);
  const files = input.files ?? [];
  const requirements: ValidationRequirement[] = [];

  if (includesFrontendPath(files) || includesAny(text, ["ui", "frontend", "component", "page"])) {
    requirements.push(
      {
        title: "Run typecheck",
        command: "npm run typecheck",
        required: true,
      },
      {
        title: "Run lint",
        command: "npm run lint",
        required: true,
      },
      {
        title: "Run relevant e2e tests",
        command: "npm run test:e2e",
        required: true,
      },
      {
        title: "Run full test suite for shared UI changes",
        command: "npm run test:all",
        reason: "Shared UI surfaces should pass the full gate.",
        required: false,
      },
    );
  }

  if (includesAny(text, ["stripe", "checkout", "payment", "billing", "revenue"])) {
    requirements.push(
      {
        title: "Run Stripe webhook tests",
        command: "npx tsx scripts/test-stripe-webhook.ts",
        required: true,
      },
      {
        title: "Verify revenue events remain revenue_event",
        reason: "Confirm payment events ingest without raw Stripe payload storage.",
        required: true,
      },
    );
  }

  if (includesAny(text, ["posthog", "product event", "activation", "onboarding", "analytics"])) {
    requirements.push(
      {
        title: "Run PostHog webhook tests",
        command: "npx tsx scripts/test-posthog-webhook.ts",
        required: true,
      },
      {
        title: "Verify unsafe product properties are dropped",
        required: true,
      },
    );
  }

  if (includesAny(text, ["github", "webhook", "pr", "pull request", "signature", "delivery"])) {
    requirements.push(
      {
        title: "Run GitHub webhook tests",
        command: "npx tsx scripts/test-github-webhook.ts",
        required: true,
      },
      {
        title: "Verify signature verification and delivery dedupe",
        required: true,
      },
    );
  }

  if (includesAny(text, ["audit", "evidence", "sharing", "export", "redaction", "sensitivity"])) {
    requirements.push(
      {
        title: "Run evidence safety sanity",
        command: "npx tsx scripts/sanity-evidence-safety.ts",
        required: true,
      },
      {
        title: "Run audit export/share sanity",
        command: "npx tsx scripts/sanity-audit-export-share.ts",
        required: true,
      },
    );
  }

  if (includesAny(text, ["team", "project access", "role", "auditor", "viewer", "member", "permission"])) {
    requirements.push({
      title: "Run permissions e2e tests",
      command: "npm run test:e2e",
      reason: "Verify owner/admin/member/viewer/auditor behavior.",
      required: true,
    });
  }

  if (requirements.length === 0) {
    requirements.push({
      title: "Run typecheck and unit tests",
      command: "npm run typecheck && npm run test:unit",
      required: true,
    });
  }

  const seen = new Set<string>();
  return requirements.filter((req) => {
    const key = `${req.title}:${req.command ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
