import { Suspense } from "react";
import type { Metadata } from "next";
import { TimelinePage } from "@/components/timeline/timeline-page";

export const metadata: Metadata = {
  title: "Timeline — Sortiri Timeline",
};

export default function TimelineRoutePage() {
  return (
    <Suspense fallback={<p className="timeline-page__loading">Loading timeline…</p>}>
      <TimelinePage />
    </Suspense>
  );
}
