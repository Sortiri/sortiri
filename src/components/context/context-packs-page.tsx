"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CreateContextPackModal } from "@/components/context/create-context-pack-modal";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { ContextPackRecord } from "@/types/context-packs";
import "./context.css";

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(timestamp),
  );
}

export function ContextPacksPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [createOpen, setCreateOpen] = useState(false);

  const packs = useQuery(
    api.contextPacks.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 50 } : "skip",
  );

  const loading = wsLoading || (activeWorkspaceId !== null && packs === undefined);
  const list = (packs ?? []) as ContextPackRecord[];

  return (
    <div className="context-page">
      <header className="context-page__header">
        <h1 className="context-page__title">Agent Context</h1>
        <p className="context-page__subtitle">
          Focused context packs for Cursor agents — lessons, playbooks, failures, and validation.
        </p>
        {canWrite && activeWorkspaceId ? (
          <div className="context-page__actions">
            <button
              type="button"
              className="context-btn context-btn--primary"
              onClick={() => setCreateOpen(true)}
            >
              Create Context Pack
            </button>
          </div>
        ) : null}
      </header>

      {loading ? <p className="context-page__subtitle">Loading context packs…</p> : null}

      {!loading && list.length === 0 ? (
        <p className="context-page__subtitle">No context packs yet.</p>
      ) : null}

      {list.length > 0 ? (
        <table className="context-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Goal</th>
              <th>Status</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((pack) => (
              <tr key={pack.id}>
                <td>{pack.title}</td>
                <td>{pack.goal}</td>
                <td>{pack.status}</td>
                <td>{formatDate(pack.createdAt)}</td>
                <td>
                  <Link href={`/context/${pack.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {createOpen && activeWorkspaceId ? (
        <CreateContextPackModal
          workspaceId={activeWorkspaceId}
          onClose={() => setCreateOpen(false)}
          onCreated={() => setCreateOpen(false)}
        />
      ) : null}
    </div>
  );
}
