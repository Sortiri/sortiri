import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";

export const metadata: Metadata = {
  title: "Company Pulse — Sortiri Timeline",
};

export default function HomeRoutePage() {
  return (
    <Suspense fallback={<p className="home-page__loading">Loading company pulse…</p>}>
      <HomePage />
    </Suspense>
  );
}
