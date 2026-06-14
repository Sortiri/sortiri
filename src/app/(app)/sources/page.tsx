import type { Metadata } from "next";
import { SourcesPage } from "@/components/sources/sources-page";

export const metadata: Metadata = {
  title: "Sources — Sortiri Timeline",
};

export default function SourcesRoutePage() {
  return <SourcesPage />;
}
