import { Suspense } from "react";
import type { Metadata } from "next";
import { EntityDetailPage } from "@/components/entities/entity-detail-page";

export const metadata: Metadata = {
  title: "Entity — Sortiri Timeline",
};

type EntityDetailRoutePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EntityDetailRoutePage({ params }: EntityDetailRoutePageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="entities-page__loading">Loading entity…</p>}>
      <EntityDetailPage entityId={id} />
    </Suspense>
  );
}
