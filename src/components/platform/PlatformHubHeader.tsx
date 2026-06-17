import { PlatformPageHeader } from "@/components/platform/PlatformPageHeader";
import type { ReactNode } from "react";

type PlatformHubHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  subnav?: ReactNode;
};

export function PlatformHubHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  meta,
  badges,
  subnav,
}: PlatformHubHeaderProps) {
  return (
    <div className="platform-hub-header">
      <PlatformPageHeader
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
        actions={actions}
        meta={meta}
        badges={badges}
      />
      {subnav}
    </div>
  );
}
