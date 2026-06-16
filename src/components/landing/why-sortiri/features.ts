import { BookOpen } from "pixelarticons/react/BookOpen";
import { File } from "pixelarticons/react/File";
import { Grid3x3 } from "pixelarticons/react/Grid3x3";
import { Play } from "pixelarticons/react/Play";
import { Scale } from "pixelarticons/react/Scale";
import { ScrollVertical } from "pixelarticons/react/ScrollVertical";
import { Sparkles } from "pixelarticons/react/Sparkles";
import type { PixelIconComponent } from "@/components/ui/pixel-icon";

export type WhyFeatureId =
  | "timeline"
  | "replay"
  | "impact"
  | "agent-context"
  | "enterprise"
  | "audits"
  | "private-evals";

export type WhyFeature = {
  id: WhyFeatureId;
  label: string;
  description: string;
  icon: PixelIconComponent;
};

export const WHY_FEATURES: WhyFeature[] = [
  {
    id: "timeline",
    label: "Timeline",
    description:
      "One searchable history for agent actions, product events, revenue movement, and decisions.",
    icon: ScrollVertical,
  },
  {
    id: "replay",
    label: "Replay",
    description:
      "Ask what happened and get the linked events, decisions, diffs, and evidence.",
    icon: Play,
  },
  {
    id: "impact",
    label: "Impact",
    description:
      "See what changed after a workstream, PR, decision, or product update.",
    icon: Scale,
  },
  {
    id: "agent-context",
    label: "Agent context",
    description:
      "Give Cursor and coding agents the company memory they need before they work.",
    icon: Sparkles,
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description:
      "Track agent activity, spend, duplicated work, risk, and impact across teams.",
    icon: Grid3x3,
  },
  {
    id: "audits",
    label: "Audits",
    description:
      "Turn company history into redacted, shareable, audit-ready evidence.",
    icon: File,
  },
  {
    id: "private-evals",
    label: "Private evals",
    description:
      "Create company-specific evals from playbooks, lessons, failures, and workstreams.",
    icon: BookOpen,
  },
];

export const DEFAULT_WHY_FEATURE_ID: WhyFeatureId = "timeline";
