import { BookOpen } from "pixelarticons/react/BookOpen";
import { Coins } from "pixelarticons/react/Coins";
import { File } from "pixelarticons/react/File";
import { Grid3x3 } from "pixelarticons/react/Grid3x3";
import { Play } from "pixelarticons/react/Play";
import { Scale } from "pixelarticons/react/Scale";
import type { PixelIconComponent } from "@/components/ui/pixel-icon";

export type UseCaseId =
  | "agent-fleet-visibility"
  | "incident-rollback-replay"
  | "product-impact-analysis"
  | "audit-evidence-rooms"
  | "private-model-evals"
  | "enterprise-spend-control";

export type UseCase = {
  id: UseCaseId;
  label: string;
  description: string;
  icon: PixelIconComponent;
};

export const USE_CASES: UseCase[] = [
  {
    id: "agent-fleet-visibility",
    label: "Agent fleet visibility",
    description:
      "See what agents are doing across every team, repo, project, and workstream.",
    icon: Grid3x3,
  },
  {
    id: "incident-rollback-replay",
    label: "Incident + rollback replay",
    description:
      "Reconstruct the decisions, diffs, deployments, failures, and rollbacks behind an incident.",
    icon: Play,
  },
  {
    id: "product-impact-analysis",
    label: "Product impact analysis",
    description:
      "Connect shipped work to product metrics, revenue movement, activation, and customer behavior.",
    icon: Scale,
  },
  {
    id: "audit-evidence-rooms",
    label: "Audit evidence rooms",
    description:
      "Freeze the relevant timeline, redact sensitive data, and share proof with auditors.",
    icon: File,
  },
  {
    id: "private-model-evals",
    label: "Private model evals",
    description:
      "Turn real company work into private evals for agents, models, and routing decisions.",
    icon: BookOpen,
  },
  {
    id: "enterprise-spend-control",
    label: "Enterprise spend control",
    description:
      "Track token spend, duplicated work, failed retries, risky changes, and value created.",
    icon: Coins,
  },
];

export const DEFAULT_USE_CASE_ID: UseCaseId = "agent-fleet-visibility";
