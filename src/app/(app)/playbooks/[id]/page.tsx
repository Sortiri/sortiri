import { PlaybookDetailPage } from "@/components/playbooks/playbook-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <PlaybookDetailPage playbookId={id} />;
}
