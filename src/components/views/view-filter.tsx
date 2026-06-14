"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { SavedViewRecord } from "@/types/saved-views";
import "./views.css";

type ViewFilterProps = {
  value: string | null;
  onChange: (value: string | null) => void;
};

export function ViewFilter({ value, onChange }: ViewFilterProps) {
  const { activeWorkspaceId } = useWorkspace();
  const views = useQuery(
    api.savedViews.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const viewList = (views ?? []) as SavedViewRecord[];

  return (
    <select
      className="view-filter-select"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      aria-label="Filter by saved view"
    >
      <option value="">All Company</option>
      {viewList.map((view) => (
        <option key={view.id} value={view.id}>
          {view.name}
        </option>
      ))}
    </select>
  );
}
