"use client";

import { PlatformSubnav } from "@/components/platform/PlatformSubnav";
import { INTELLIGENCE_SUBNAV } from "@/config/platform-nav";

export function IntelligenceSubnav() {
  return <PlatformSubnav items={INTELLIGENCE_SUBNAV} ariaLabel="Intelligence navigation" />;
}
