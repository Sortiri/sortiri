import type { PlatformSubnavItem } from "@/components/platform/PlatformSubnav";

export const INTELLIGENCE_SUBNAV: PlatformSubnavItem[] = [
  { href: "/intelligence", label: "Overview", matchPrefix: "/intelligence" },
  { href: "/impact", label: "Impact", matchPrefix: "/impact" },
  { href: "/lessons", label: "Lessons", matchPrefix: "/lessons" },
  { href: "/playbooks", label: "Playbooks", matchPrefix: "/playbooks" },
  { href: "/recommendations", label: "Recommendations", matchPrefix: "/recommendations" },
  { href: "/intelligence/evals", label: "Private Evals", matchPrefix: "/intelligence/evals" },
  { href: "/intelligence/queue", label: "Remediation", matchPrefix: "/intelligence/queue" },
];

export const SOURCES_SUBNAV: PlatformSubnavItem[] = [
  { href: "/sources", label: "Overview", matchPrefix: "/sources" },
  { href: "/sources#connections", label: "Connections" },
  { href: "/sources#api-keys", label: "API Keys" },
  { href: "/sources/reliability", label: "Reliability", matchPrefix: "/sources/reliability" },
  {
    href: "/sources/reliability/dead-letters",
    label: "Dead Letters",
    matchPrefix: "/sources/reliability/dead-letters",
  },
  { href: "/sources#webhooks", label: "Webhooks" },
];
