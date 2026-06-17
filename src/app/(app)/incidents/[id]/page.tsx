import { IncidentDetailPage } from "@/components/incidents/incident-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <IncidentDetailPage incidentId={id} />;
}
