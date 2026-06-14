import type { SavedViewFilters } from "./viewFilters";

export type SavedViewTemplateType =
  | "engineering"
  | "product"
  | "revenue"
  | "growth"
  | "support"
  | "executive";

export type SavedViewTemplate = {
  name: string;
  type: SavedViewTemplateType;
  description: string;
  filters: SavedViewFilters;
};

export const DEFAULT_VIEW_TEMPLATES: SavedViewTemplate[] = [
  {
    name: "Engineering",
    type: "engineering",
    description:
      "Code changes, agent workstreams, GitHub activity, command runs, and technical decisions.",
    filters: {
      categories: ["agent_action", "code_change", "system_event", "company_decision"],
      sources: ["cursor", "watcher", "github", "cli", "system"],
      visibility: "primary",
    },
  },
  {
    name: "Product",
    type: "product",
    description:
      "Product events, feature decisions, user/customer activity, and related workstreams.",
    filters: {
      categories: ["product_event", "company_decision", "agent_action"],
      sources: ["sdk", "manual", "cursor", "github"],
      entityTypes: ["user", "customer", "feature", "file"],
      visibility: "primary",
    },
  },
  {
    name: "Revenue",
    type: "revenue",
    description:
      "Payments, subscriptions, refunds, revenue decisions, and customer movement.",
    filters: {
      categories: ["revenue_event", "product_event", "company_decision"],
      sources: ["sdk", "stripe", "manual"],
      entityTypes: ["customer", "payment", "subscription"],
      visibility: "primary",
    },
  },
  {
    name: "Executive",
    type: "executive",
    description:
      "High-importance decisions, revenue, product movement, insights, and active work.",
    filters: {
      categories: [
        "company_decision",
        "revenue_event",
        "product_event",
        "agent_action",
        "code_change",
      ],
      importance: ["high", "critical"],
      visibility: "primary",
    },
  },
  {
    name: "Support",
    type: "support",
    description: "Customer, user, issue, and product history.",
    filters: {
      categories: ["product_event", "company_decision", "system_event"],
      entityTypes: ["customer", "user", "issue"],
      sources: ["sdk", "github", "manual"],
      visibility: "primary",
    },
  },
  {
    name: "Growth",
    type: "growth",
    description: "Signup, activation, referral, product usage, and revenue movement.",
    filters: {
      categories: ["product_event", "revenue_event", "company_decision"],
      sources: ["sdk", "manual"],
      entityTypes: ["user", "customer"],
      visibility: "primary",
    },
  },
];

export function getTemplateByType(
  type: SavedViewTemplateType,
): SavedViewTemplate | undefined {
  return DEFAULT_VIEW_TEMPLATES.find((template) => template.type === type);
}
