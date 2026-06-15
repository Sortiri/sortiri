import { ContextPackDetailPage } from "@/components/context/context-pack-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ContextPackDetailPage contextPackId={id} />;
}
