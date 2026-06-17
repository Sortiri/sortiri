import { DecisionDetailPage } from "@/components/decisions/decision-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <DecisionDetailPage decisionId={id} />;
}
