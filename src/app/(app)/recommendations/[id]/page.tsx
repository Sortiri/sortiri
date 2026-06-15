import { RecommendationDetailPage } from "@/components/recommendations/recommendation-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <RecommendationDetailPage recommendationId={id} />;
}
