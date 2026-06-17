import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import { PageLoader } from "@/components/ui/page-loader";

export const metadata: Metadata = {
  title: "Home — Sortiri Timeline",
};

export default function HomeRoutePage() {
  return (
    <Suspense fallback={<PageLoader variant="inline" />}>
      <HomePage />
    </Suspense>
  );
}
