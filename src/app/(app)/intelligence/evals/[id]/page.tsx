import { EvalSuiteDetailPage } from "@/components/evals/eval-suite-detail-page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <EvalSuiteDetailPage evalSuiteId={id} />;
}
