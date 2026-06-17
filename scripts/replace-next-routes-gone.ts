#!/usr/bin/env tsx
/**
 * Replace migrated Next.js API routes with 410 Gone responses pointing at Convex HTTP.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const ROUTE_MAP: Array<{ file: string; convexPath: string; methods: string[] }> = [
  { file: "src/app/api/ingest/events/route.ts", convexPath: "ingest/events", methods: ["POST"] },
  { file: "src/app/api/ingest/artifacts/route.ts", convexPath: "ingest/artifacts", methods: ["POST"] },
  { file: "src/app/api/ingest/workstreams/start/route.ts", convexPath: "ingest/workstreams/start", methods: ["POST"] },
  { file: "src/app/api/ingest/workstreams/finish/route.ts", convexPath: "ingest/workstreams/finish", methods: ["POST"] },
  { file: "src/app/api/integrations/github/webhook/route.ts", convexPath: "webhooks/github", methods: ["POST"] },
  { file: "src/app/api/integrations/stripe/webhook/route.ts", convexPath: "webhooks/stripe", methods: ["POST"] },
  { file: "src/app/api/integrations/posthog/webhook/route.ts", convexPath: "webhooks/posthog", methods: ["POST"] },
  { file: "src/app/api/reliability/replay/route.ts", convexPath: "cli/reliability/replay", methods: ["POST"] },
  { file: "src/app/api/cli/health/route.ts", convexPath: "health", methods: ["GET"] },
  { file: "src/app/api/cli/setup/consume/route.ts", convexPath: "cli/setup/consume", methods: ["POST"] },
  { file: "src/app/api/cli/context/packs/route.ts", convexPath: "cli/context/packs", methods: ["GET", "POST"] },
  { file: "src/app/api/cli/context/packs/[id]/route.ts", convexPath: "cli/context/packs/:id", methods: ["GET"] },
  { file: "src/app/api/cli/context/project-memory/route.ts", convexPath: "cli/context/project-memory", methods: ["POST"] },
  { file: "src/app/api/cli/context/entity-memory/route.ts", convexPath: "cli/context/entity-memory", methods: ["POST"] },
  { file: "src/app/api/cli/context/known-failures/route.ts", convexPath: "cli/context/known-failures", methods: ["POST"] },
  { file: "src/app/api/cli/context/validation-requirements/route.ts", convexPath: "cli/context/validation-requirements", methods: ["POST"] },
  { file: "src/app/api/cli/context/recommended-playbook/route.ts", convexPath: "cli/context/recommended-playbook", methods: ["POST"] },
  { file: "src/app/api/cli/recommendations/route.ts", convexPath: "cli/recommendations", methods: ["GET"] },
  { file: "src/app/api/cli/recommendations/generate/route.ts", convexPath: "cli/recommendations/generate", methods: ["POST"] },
  { file: "src/app/api/cli/recommendations/[id]/route.ts", convexPath: "cli/recommendations/:id", methods: ["GET"] },
  { file: "src/app/api/cli/recommendations/[id]/convert/route.ts", convexPath: "cli/recommendations/:id/convert", methods: ["POST"] },
  { file: "src/app/api/cli/recommendations/[id]/context-pack/route.ts", convexPath: "cli/recommendations/:id/context-pack", methods: ["POST"] },
  { file: "src/app/api/cli/evals/route.ts", convexPath: "cli/evals", methods: ["GET"] },
  { file: "src/app/api/cli/evals/generate/route.ts", convexPath: "cli/evals/generate", methods: ["POST"] },
  { file: "src/app/api/cli/evals/[suiteId]/route.ts", convexPath: "cli/evals/:suiteId", methods: ["GET"] },
  { file: "src/app/api/cli/evals/[suiteId]/run/route.ts", convexPath: "cli/evals/:suiteId/run", methods: ["POST"] },
  { file: "src/app/api/cli/evals/runs/[runId]/route.ts", convexPath: "cli/evals/runs/:runId", methods: ["GET"] },
  { file: "src/app/api/cli/evals/runs/[runId]/results/route.ts", convexPath: "cli/evals/runs/:runId/results", methods: ["POST"] },
  { file: "src/app/api/cli/evals/runs/[runId]/finalize/route.ts", convexPath: "cli/evals/runs/:runId/finalize", methods: ["POST"] },
  { file: "src/app/api/cli/evals/runs/[runId]/mark-running/route.ts", convexPath: "cli/evals/runs/:runId/mark-running", methods: ["POST"] },
  { file: "src/app/api/cli/evals/recommend/workstream/[workstreamId]/route.ts", convexPath: "cli/evals/recommend/workstream/:workstreamId", methods: ["GET"] },
  { file: "src/app/api/cli/evals/remediation/route.ts", convexPath: "cli/evals/remediation", methods: ["GET"] },
  { file: "src/app/api/cli/evals/remediation/generate/route.ts", convexPath: "cli/evals/remediation/generate", methods: ["POST"] },
  { file: "src/app/api/cli/evals/remediation/[recommendationId]/route.ts", convexPath: "cli/evals/remediation/:recommendationId", methods: ["GET"] },
  { file: "src/app/api/cli/evals/remediation/rerun/route.ts", convexPath: "cli/evals/remediation/rerun", methods: ["POST"] },
  { file: "src/app/api/cli/reliability/route.ts", convexPath: "cli/reliability", methods: ["GET"] },
  { file: "src/app/api/cli/reliability/dead-letters/route.ts", convexPath: "cli/reliability/dead-letters", methods: ["GET"] },
  { file: "src/app/api/cli/reliability/health/route.ts", convexPath: "cli/reliability/health", methods: ["GET"] },
  { file: "src/app/api/cli/reliability/journal/list/route.ts", convexPath: "cli/reliability/journal/list", methods: ["GET"] },
  { file: "src/app/api/cli/reliability/replay/route.ts", convexPath: "cli/reliability/replay", methods: ["POST"] },
];

function renderRoute(convexPath: string, methods: string[]): string {
  const exports = methods
    .map(
      (method) =>
        `export async function ${method}(req: Request) {\n  void req;\n  return goneResponse("${convexPath}");\n}`,
    )
    .join("\n\n");
  return `import { goneResponse } from "@/lib/api/compatGone";\n\n${exports}\n`;
}

for (const entry of ROUTE_MAP) {
  const fullPath = path.join(ROOT, entry.file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, renderRoute(entry.convexPath, entry.methods), "utf8");
  console.log(`Updated ${entry.file}`);
}

console.log(`\nReplaced ${ROUTE_MAP.length} Next.js API routes with 410 Gone shims.`);
