"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CreatePlaybookModal } from "@/components/playbooks/create-playbook-modal";
import { GeneratePlaybookFromLessonsModal } from "@/components/playbooks/generate-playbook-from-lessons-modal";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import {
  PLAYBOOK_TYPE_LABELS,
  type PlaybookRecord,
  type PlaybookType,
} from "@/types/playbooks";
import "./playbooks.css";

const FILTER_OPTIONS: Array<{ id: "all" | PlaybookType; label: string }> = [
  { id: "all", label: "All" },
  { id: "engineering", label: "Engineering" },
  { id: "product", label: "Product" },
  { id: "revenue", label: "Revenue" },
  { id: "security", label: "Security" },
  { id: "audit", label: "Audit" },
  { id: "integration", label: "Integration" },
];

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(timestamp),
  );
}

export function PlaybooksPage() {
  const router = useRouter();
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [filter, setFilter] = useState<"all" | PlaybookType>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);

  const createDefaults = useMutation(api.playbooks.createDefaults);

  const playbooks = useQuery(
    api.playbooks.listByWorkspace,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          type: filter === "all" ? undefined : filter,
        }
      : "skip",
  );

  const loading = wsLoading || (activeWorkspaceId !== null && playbooks === undefined);
  const playbookList = useMemo(
    () =>
      (playbooks ?? []).filter((p) => p.status !== "archived") as PlaybookRecord[],
    [playbooks],
  );

  const handleCreateDefaults = async () => {
    if (!activeWorkspaceId) return;
    await createDefaults({ workspaceId: activeWorkspaceId });
  };

  return (
    <div className="playbooks-page">
      <header className="playbooks-page__header-row">
        <div>
          <h1 className="playbooks-page__title">Playbooks</h1>
          <p className="playbooks-page__subtitle">
            Reusable operating patterns created from lessons.
          </p>
        </div>
        {canWrite && activeWorkspaceId ? (
          <div className="playbooks-page__actions">
            <button
              type="button"
              className="playbooks-page__action"
              onClick={() => setShowCreate(true)}
            >
              Create Playbook
            </button>
            <button
              type="button"
              className="playbooks-page__action"
              onClick={() => setShowGenerate(true)}
            >
              Generate from Lessons
            </button>
            <button
              type="button"
              className="playbooks-page__action"
              onClick={() => void handleCreateDefaults()}
            >
              Create Default Playbooks
            </button>
          </div>
        ) : null}
      </header>

      <div className="playbooks-filter-chips">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`playbooks-filter-chip${filter === option.id ? " playbooks-filter-chip--active" : ""}`}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? <p className="playbooks-page__subtitle">Loading playbooks…</p> : null}

      {!loading && playbookList.length === 0 ? (
        <p className="playbooks-page__subtitle">
          {canWrite
            ? "No playbooks yet. Create defaults or generate from lessons."
            : "No playbooks available."}
        </p>
      ) : null}

      {playbookList.length > 0 ? (
        <table className="playbooks-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Status</th>
              <th>Steps</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {playbookList.map((playbook) => (
              <tr key={playbook.id}>
                <td>
                  <span className="playbooks-badge">
                    {PLAYBOOK_TYPE_LABELS[playbook.type]}
                  </span>
                </td>
                <td>
                  <Link href={`/playbooks/${playbook.id}`}>{playbook.title}</Link>
                  <p className="playbooks-page__subtitle">{playbook.summary}</p>
                </td>
                <td>{playbook.status}</td>
                <td>{playbook.steps.length}</td>
                <td>{formatDate(playbook.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {showCreate && activeWorkspaceId ? (
        <CreatePlaybookModal
          workspaceId={activeWorkspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={(playbookId) => {
            setShowCreate(false);
            router.push(`/playbooks/${playbookId}`);
          }}
        />
      ) : null}

      {showGenerate && activeWorkspaceId ? (
        <GeneratePlaybookFromLessonsModal
          workspaceId={activeWorkspaceId}
          onClose={() => setShowGenerate(false)}
          onCreated={(playbookId) => {
            setShowGenerate(false);
            router.push(`/playbooks/${playbookId}`);
          }}
        />
      ) : null}
    </div>
  );
}
