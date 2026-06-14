import { z } from "zod";

export const startWorkstreamSchema = z.object({
  title: z.string().describe("Short title for the task or investigation"),
  summary: z.string().optional().describe("Optional context for why this workstream started"),
});

export const recordEventSchema = z.object({
  workstreamId: z.string().optional().describe("Current workstream ID if one is active"),
  category: z
    .enum(["agent_action", "code_change", "company_decision", "system_event"])
    .describe("Event category"),
  type: z
    .string()
    .describe(
      "Event type such as agent.plan_created, file.changed, build.passed, decision.made",
    ),
  title: z.string().describe("Short event title"),
  summary: z.string().optional().describe("Why this event mattered"),
  entity: z
    .object({
      type: z.string().optional(),
      id: z.string().optional(),
      name: z.string().optional(),
      url: z.string().optional(),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
  severity: z.enum(["info", "warning", "error", "critical"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const attachArtifactSchema = z.object({
  workstreamId: z.string().optional().describe("Current workstream ID if one is active"),
  type: z.enum([
    "diff",
    "file",
    "url",
    "screenshot",
    "document",
    "log",
    "command_output",
    "other",
  ]),
  title: z.string(),
  summary: z.string().optional(),
  url: z.string().optional(),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  filePath: z.string().optional(),
  language: z.string().optional(),
  truncated: z.boolean().optional(),
});

export const finishWorkstreamSchema = z.object({
  workstreamId: z.string(),
  outcome: z.string().optional(),
  summary: z.string().optional(),
});
