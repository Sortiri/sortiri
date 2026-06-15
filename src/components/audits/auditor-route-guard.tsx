"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { DashboardContentLoader } from "@/components/dashboard-content-loader";

type AuditorRouteGuardProps = {
  children: React.ReactNode;
};

function isAuditorAllowedPath(pathname: string, auditReportId: string | null): boolean {
  if (pathname === "/audits" || pathname.startsWith("/audits/")) {
    return true;
  }
  if (pathname === "/ask" && auditReportId) {
    return true;
  }
  if (pathname.startsWith("/security")) {
    return false;
  }
  return false;
}

export function AuditorRouteGuard({ children }: AuditorRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities, loading } = useWorkspaceMembership(activeWorkspaceId);
  const auditReportId = searchParams.get("auditReportId");

  const isAuditor = capabilities?.role === "auditor";
  const allowed = !isAuditor || isAuditorAllowedPath(pathname, auditReportId);
  const blockedSecurityPath = pathname.startsWith("/security");

  useEffect(() => {
    if (loading || !isAuditor || allowed) return;
    router.replace("/audits");
  }, [allowed, isAuditor, loading, router]);

  if (loading && activeWorkspaceId) {
    return <DashboardContentLoader />;
  }

  if (blockedSecurityPath && (loading || isAuditor)) {
    return <DashboardContentLoader />;
  }

  if (isAuditor && !allowed) {
    return <DashboardContentLoader />;
  }

  return children;
}
