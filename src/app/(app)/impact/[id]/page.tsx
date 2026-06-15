import { ImpactDetailPage } from "@/components/impact/impact-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ImpactDetailPage analysisId={id} />;
}
