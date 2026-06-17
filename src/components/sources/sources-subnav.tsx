"use client";

import { PlatformSubnav } from "@/components/platform/PlatformSubnav";
import { SOURCES_SUBNAV } from "@/config/platform-nav";

export function SourcesSubnav() {
  return <PlatformSubnav items={SOURCES_SUBNAV} ariaLabel="Sources navigation" />;
}
