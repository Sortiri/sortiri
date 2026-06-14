import type { Metadata } from "next";
import { WorkstreamsPage } from "@/components/workstreams/workstreams-page";

export const metadata: Metadata = {
  title: "Workstreams — Sortiri Timeline",
};

export default function WorkstreamsRoutePage() {
  return <WorkstreamsPage />;
}
