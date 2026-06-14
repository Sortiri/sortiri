"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Id } from "../../convex/_generated/dataModel";

export function useViewFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewIdParam = searchParams.get("viewId");
  const viewId = viewIdParam ? (viewIdParam as Id<"savedViews">) : undefined;

  const setViewId = useCallback(
    (nextId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextId) {
        params.set("viewId", nextId);
      } else {
        params.delete("viewId");
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  return {
    viewId,
    viewIdParam,
    setViewId,
  };
}
