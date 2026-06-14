import type { Metadata } from "next";
import { Suspense } from "react";
import { AskPage } from "@/components/ask/ask-page";

export const metadata: Metadata = {
  title: "Ask Sortiri — Sortiri Timeline",
};

export default function AskRoutePage() {
  return (
    <Suspense fallback={null}>
      <AskPage />
    </Suspense>
  );
}
