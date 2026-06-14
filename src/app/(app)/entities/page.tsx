import type { Metadata } from "next";
import { EntitiesPage } from "@/components/entities/entities-page";

export const metadata: Metadata = {
  title: "Entities — Sortiri Timeline",
};

export default function EntitiesRoutePage() {
  return <EntitiesPage />;
}
