import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkstreamDetailPage } from "@/components/workstreams/workstream-detail-page";

export const metadata: Metadata = {
  title: "Replay — Sortiri Timeline",
};

type WorkstreamDetailRoutePageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkstreamDetailRoutePage({
  params,
}: WorkstreamDetailRoutePageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="workstreams-page__loading">Loading workstream…</p>}>
      <WorkstreamDetailPage workstreamId={id} />
    </Suspense>
  );
}
