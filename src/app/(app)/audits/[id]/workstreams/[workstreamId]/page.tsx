import { AuditWorkstreamReplayPage } from "@/components/audits/audit-workstream-replay-page";

type PageProps = {
  params: Promise<{ id: string; workstreamId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id, workstreamId } = await params;
  return <AuditWorkstreamReplayPage reportId={id} workstreamId={workstreamId} />;
}
