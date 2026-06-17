import { Suspense } from "react";
import type { Metadata } from "next";
import { EntityDetailPage } from "@/components/entities/entity-detail-page";
import { PageLoader } from "@/components/ui/page-loader";

export const metadata: Metadata = {
  title: "Entity — Sortiri Timeline",
};

type EntityDetailRoutePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EntityDetailRoutePage({ params }: EntityDetailRoutePageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<PageLoader variant="inline" />}>
      <EntityDetailPage entityId={id} />
    </Suspense>
  );
}
