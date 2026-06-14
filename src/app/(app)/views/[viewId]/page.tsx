import { ViewDetailPage } from "@/components/views/view-detail-page";

type PageProps = {
  params: Promise<{ viewId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { viewId } = await params;
  return <ViewDetailPage viewId={viewId} />;
}
