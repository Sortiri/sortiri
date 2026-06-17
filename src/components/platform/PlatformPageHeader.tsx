import { ObjectHeader } from "@/components/platform/ObjectHeader";
import type { ReactNode } from "react";

type PlatformPageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
};

export function PlatformPageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  meta,
  badges,
}: PlatformPageHeaderProps) {
  return (
    <ObjectHeader
      title={title}
      description={subtitle}
      backHref={backHref}
      backLabel={backLabel}
      badges={badges}
      meta={meta}
      actions={actions}
    />
  );
}
