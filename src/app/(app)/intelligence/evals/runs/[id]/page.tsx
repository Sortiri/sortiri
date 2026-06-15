import { EvalRunDetailPage } from "@/components/evals/eval-run-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <EvalRunDetailPage evalRunId={id} />;
}
