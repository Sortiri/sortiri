"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { ViewCard } from "@/components/views/view-card";
import { ViewForm } from "@/components/views/view-form";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { SavedViewRecord } from "@/types/saved-views";
import {
  canCreatePrivateView,
  canCreateWorkspaceView,
} from "@/types/workspace-members";
import "./views.css";

export function ViewsPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const views = useQuery(
    api.savedViews.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const createDefaults = useMutation(api.savedViews.createDefaults);
  const createView = useMutation(api.savedViews.create);

  const role = capabilities?.role;
  const canCreateWorkspace = role ? canCreateWorkspaceView(role) : false;
  const canCreatePrivate = role ? canCreatePrivateView(role) : false;
  const canCreate = canCreateWorkspace || canCreatePrivate;

  const viewList = (views ?? []) as SavedViewRecord[];

  const sections = useMemo(() => {
    const defaults = viewList.filter((view) => view.isDefault);
    const custom = viewList.filter(
      (view) => !view.isDefault && view.visibility === "workspace",
    );
    const privateViews = viewList.filter((view) => view.visibility === "private");
    return { defaults, custom, privateViews };
  }, [viewList]);

  const handleCreateDefaults = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setError(null);
    setBusy(true);
    try {
      await createDefaults({ workspaceId: activeWorkspaceId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create default views");
    } finally {
      setBusy(false);
    }
  }, [activeWorkspaceId, createDefaults]);

  const loading = wsLoading || (activeWorkspaceId !== null && views === undefined);

  return (
    <div className="views-page">
      <header className="views-page__header">
        <div className="views-page__header-row">
          <div>
            <h1 className="views-page__title">Views</h1>
            <p className="views-page__subtitle">
              Saved lenses over your company timeline.
            </p>
          </div>
          <div className="views-page__actions">
            {canCreate ? (
              <button
                type="button"
                className="views-page__action"
                onClick={() => setShowCreate((value) => !value)}
              >
                {showCreate ? "Close" : "Create View"}
              </button>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                className="views-page__action"
                onClick={() => void handleCreateDefaults()}
                disabled={busy}
              >
                {busy ? "Creating…" : "Create Default Views"}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {error ? <p className="view-form__error">{error}</p> : null}

      {showCreate && activeWorkspaceId && canCreate ? (
        <ViewForm
          canCreateWorkspaceView={canCreateWorkspace}
          submitLabel="Create view"
          onCancel={() => setShowCreate(false)}
          onSubmit={async (values) => {
            await createView({
              workspaceId: activeWorkspaceId,
              name: values.name,
              description: values.description,
              visibility: values.visibility,
              filters: values.filters as Parameters<typeof createView>[0]["filters"],
              type: "custom",
            });
            setShowCreate(false);
          }}
        />
      ) : null}

      {loading ? (
        <p className="projects-page__loading">Loading views…</p>
      ) : viewList.length === 0 ? (
        <p className="home-section__empty">
          No saved views yet. Create default views to get started.
        </p>
      ) : (
        <>
          {sections.defaults.length > 0 ? (
            <section className="views-section">
              <h2 className="views-section__title">Default Views</h2>
              <div className="views-list">
                {sections.defaults.map((view) => (
                  <ViewCard key={view.id} view={view} />
                ))}
              </div>
            </section>
          ) : null}

          {sections.custom.length > 0 ? (
            <section className="views-section">
              <h2 className="views-section__title">Custom Views</h2>
              <div className="views-list">
                {sections.custom.map((view) => (
                  <ViewCard key={view.id} view={view} />
                ))}
              </div>
            </section>
          ) : null}

          {sections.privateViews.length > 0 ? (
            <section className="views-section">
              <h2 className="views-section__title">Private Views</h2>
              <div className="views-list">
                {sections.privateViews.map((view) => (
                  <ViewCard key={view.id} view={view} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
