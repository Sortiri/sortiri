import type { TimelineEvent } from "@/types/events";

export function isImpactAnchorEligible(event: TimelineEvent): boolean {
  if (event.visibility === "debug" || event.visibility === "hidden") {
    return false;
  }
  if (event.category === "company_decision") return true;
  if (event.category === "code_change") return true;
  if (event.category === "product_event") return true;
  if (event.category === "revenue_event") return true;
  if (/workstream\.(started|completed)/i.test(event.type)) return true;
  if (/pull_request\.(opened|merged)/i.test(event.type)) return true;
  if (/github\.pull_request/i.test(event.type)) return true;
  return false;
}
