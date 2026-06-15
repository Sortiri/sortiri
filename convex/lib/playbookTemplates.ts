import type { Doc } from "../_generated/dataModel";
import type { PlaybookStep, PlaybookValidationRequirement } from "./playbooksLib";

export type PlaybookTemplate = {
  title: string;
  summary: string;
  type: Doc<"playbooks">["type"];
  trigger: string;
  steps: PlaybookStep[];
  validationRequirements: PlaybookValidationRequirement[];
  tags: string[];
};

export const DEFAULT_PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  {
    title: "Checkout & Stripe Changes",
    summary:
      "Use when shipping billing, checkout, or Stripe integration work. Validates payment flows without claiming causation.",
    type: "revenue",
    trigger: "checkout stripe payment billing",
    steps: [
      {
        title: "Review recent payment and checkout events",
        description: "Scan timeline for payment_intent, checkout, and subscription events near the change.",
        required: true,
        order: 1,
      },
      {
        title: "Confirm Stripe webhook configuration",
        description: "Verify endpoint URL, signing secret, and event types match the deployment.",
        required: true,
        order: 2,
      },
      {
        title: "Run Stripe webhook validation script",
        description: "Execute the workspace Stripe webhook test before and after deploy.",
        required: true,
        order: 3,
      },
      {
        title: "Document lessons from this change",
        description: "Capture what moved in metrics and what validation passed.",
        order: 4,
      },
    ],
    validationRequirements: [
      {
        title: "Stripe webhook test",
        command: "npx tsx scripts/test-stripe-webhook.ts",
        reason: "Confirms webhook signature and event handling",
        required: true,
      },
    ],
    tags: ["stripe", "checkout", "revenue"],
  },
  {
    title: "Onboarding & Activation",
    summary: "Use when changing onboarding flows, signup, or activation metrics.",
    type: "product",
    trigger: "onboarding activation signup",
    steps: [
      {
        title: "Baseline activation metrics",
        description: "Note activation counts in the window before the change.",
        required: true,
        order: 1,
      },
      {
        title: "Ship behind feature flag if possible",
        description: "Limit blast radius for onboarding experiments.",
        order: 2,
      },
      {
        title: "Monitor product events post-deploy",
        description: "Watch signup, onboarding_step, and activation events.",
        required: true,
        order: 3,
      },
      {
        title: "Generate impact analysis",
        description: "Anchor on the deploy event and compare before/after windows.",
        order: 4,
      },
    ],
    validationRequirements: [
      {
        title: "PostHog webhook test",
        command: "npx tsx scripts/test-posthog-webhook.ts",
        reason: "Confirms product event ingestion",
      },
    ],
    tags: ["onboarding", "activation", "product"],
  },
  {
    title: "Integration & Webhook Work",
    summary: "Use when adding or modifying external integrations and webhooks.",
    type: "integration",
    trigger: "webhook integration github posthog",
    steps: [
      {
        title: "List affected integrations",
        description: "Identify GitHub, PostHog, Stripe, or custom webhook sources.",
        required: true,
        order: 1,
      },
      {
        title: "Rotate secrets if endpoint changes",
        description: "Update signing secrets in provider dashboards and env.",
        required: true,
        order: 2,
      },
      {
        title: "Run provider webhook tests",
        description: "Execute each relevant webhook validation script.",
        required: true,
        order: 3,
      },
      {
        title: "Watch for signature failure events",
        description: "Monitor timeline for webhook signature failures after deploy.",
        order: 4,
      },
    ],
    validationRequirements: [
      {
        title: "GitHub webhook test",
        command: "npx tsx scripts/test-github-webhook.ts",
        required: true,
      },
      {
        title: "PostHog webhook test",
        command: "npx tsx scripts/test-posthog-webhook.ts",
      },
      {
        title: "Stripe webhook test",
        command: "npx tsx scripts/test-stripe-webhook.ts",
      },
    ],
    tags: ["webhook", "integration"],
  },
  {
    title: "Audit & Evidence Export",
    summary: "Use when preparing audit reports or exporting evidence packages.",
    type: "audit",
    trigger: "audit evidence export redaction",
    steps: [
      {
        title: "Define audit scope",
        description: "Select projects, entities, lessons, or playbooks to include.",
        required: true,
        order: 1,
      },
      {
        title: "Review evidence safety",
        description: "Exclude blocked or unsafe artifacts; redact sensitive content.",
        required: true,
        order: 2,
      },
      {
        title: "Collect and finalize report",
        description: "Generate report, review items, then finalize.",
        required: true,
        order: 3,
      },
      {
        title: "Share with auditor access only",
        description: "Grant viewer/reviewer access — not full workspace browse.",
        order: 4,
      },
    ],
    validationRequirements: [
      {
        title: "Evidence safety review",
        reason: "Confirm no blocked items in export",
        required: true,
      },
    ],
    tags: ["audit", "evidence"],
  },
  {
    title: "Permissions & Access Changes",
    summary: "Use when changing roles, project access, or auditor permissions.",
    type: "security",
    trigger: "permissions role access auditor",
    steps: [
      {
        title: "Document intended access model",
        description: "List who should see which projects and evidence.",
        required: true,
        order: 1,
      },
      {
        title: "Apply least-privilege roles",
        description: "Prefer viewer/auditor over admin where possible.",
        required: true,
        order: 2,
      },
      {
        title: "Verify with member test account",
        description: "Confirm scoped members cannot see restricted projects.",
        order: 3,
      },
      {
        title: "Capture security lesson",
        description: "Record any permission errors or blocked evidence patterns.",
        order: 4,
      },
    ],
    validationRequirements: [
      {
        title: "Permission spot-check",
        reason: "Member and auditor roles see expected scope only",
        required: true,
      },
    ],
    tags: ["permissions", "security"],
  },
];

export function getDefaultPlaybookTemplates(): PlaybookTemplate[] {
  return DEFAULT_PLAYBOOK_TEMPLATES;
}
