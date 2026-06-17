import { Suspense } from "react";
import type { Metadata } from "next";
import { TimelinePage } from "@/components/timeline/timeline-page";
import { PageLoader } from "@/components/ui/page-loader";

export const metadata: Metadata = {
  title: "Timeline — Sortiri Timeline",
};

export default function TimelineRoutePage() {
  return (
    <Suspense fallback={<PageLoader variant="inline" />}>
      <TimelinePage />
    </Suspense>
  );
}
