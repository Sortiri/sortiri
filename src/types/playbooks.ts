export type PlaybookType =
  | "engineering"
  | "product"
  | "revenue"
  | "security"
  | "audit"
  | "integration"
  | "growth"
  | "support"
  | "custom";

export type PlaybookStatus = "draft" | "active" | "archived";

export type PlaybookStep = {
  title: string;
  description?: string;
  required?: boolean;
  order?: number;
};

export type PlaybookValidationRequirement = {
  title: string;
  command?: string;
  reason?: string;
  required?: boolean;
};

export type PlaybookRecord = {
  id: string;
  workspaceId: string;
  projectId?: string;
  viewId?: string;
  title: string;
  summary: string;
  type: PlaybookType;
  status: PlaybookStatus;
  trigger?: string;
  steps: PlaybookStep[];
  validationRequirements?: PlaybookValidationRequirement[];
  lessonIds?: string[];
  evidenceEventIds?: string[];
  evidenceWorkstreamIds?: string[];
  evidenceImpactAnalysisIds?: string[];
  tags?: string[];
  createdBy?: {
    clerkUserId?: string;
    email?: string;
    name?: string;
  };
  createdAt: number;
  updatedAt: number;
};

export const PLAYBOOK_TYPE_LABELS: Record<PlaybookType, string> = {
  engineering: "Engineering",
  product: "Product",
  revenue: "Revenue",
  security: "Security",
  audit: "Audit",
  integration: "Integration",
  growth: "Growth",
  support: "Support",
  custom: "Custom",
};
