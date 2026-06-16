export const HERO_CODE_TABS = [
  {
    id: "typescript",
    label: "TypeScript",
    language: "typescript" as const,
    code: `import { Sortiri } from "sortiri";

const client = new Sortiri({
  apiKey: process.env.SORTIRI_API_KEY,
});

await client.events.create({
  source: "cursor",
  type: "agent.action",
  title: "Updated onboarding flow",
  entityKey: "proj_acme_web",
  metadata: {
    actor: "Cursor Agent",
    file: "src/app/onboarding/page.tsx",
  },
});`,
  },
  {
    id: "python",
    label: "Python",
    language: "python" as const,
    code: `from sortiri import Sortiri

client = Sortiri()

client.events.create(
    source="cursor",
    type="agent.action",
    title="Updated onboarding flow",
    entity_key="proj_acme_web",
    metadata={
        "actor": "Cursor Agent",
        "file": "src/app/onboarding/page.tsx",
    },
)`,
  },
  {
    id: "curl",
    label: "cURL",
    language: "bash" as const,
    code: `curl -X POST https://api.sortiri.com/events \\
  -H "Authorization: Bearer $SORTIRI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "cursor",
    "type": "agent.action",
    "title": "Updated onboarding flow",
    "entityKey": "proj_acme_web"
  }'`,
  },
  {
    id: "cli",
    label: "CLI",
    language: "bash" as const,
    code: `sortiri events create \\
  --source cursor \\
  --type agent.action \\
  --title "Updated onboarding flow" \\
  --entity proj_acme_web`,
  },
] as const;

export const INSTALL_CODE_TABS = [
  {
    id: "npm",
    label: "npm",
    language: "bash" as const,
    code: "npm install sortiri",
  },
  {
    id: "pnpm",
    label: "pnpm",
    language: "bash" as const,
    code: "pnpm add sortiri",
  },
  {
    id: "pip",
    label: "pip",
    language: "bash" as const,
    code: "pip install sortiri",
  },
  {
    id: "cli",
    label: "cli",
    language: "bash" as const,
    code: "npm install -g sortiri",
  },
] as const;
