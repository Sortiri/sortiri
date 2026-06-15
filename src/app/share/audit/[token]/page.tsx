import { SharedAuditReportPage } from "@/components/audits/shared-audit-report-page";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <SharedAuditReportPage token={token} />;
}
