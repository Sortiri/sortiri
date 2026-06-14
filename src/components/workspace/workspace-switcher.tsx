"use client";

import { Check } from "pixelarticons/react/Check";
import { ChevronDown } from "pixelarticons/react/ChevronDown";
import { PenSquare } from "pixelarticons/react/PenSquare";
import { Plus } from "pixelarticons/react/Plus";
import { Trash } from "pixelarticons/react/Trash";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarTooltip } from "@/components/dashboard/sidebar-tooltip";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { useWorkspace } from "./workspace-context";
import { WorkspaceRoleBadge } from "./workspace-role-badge";
import "./workspace-switcher.css";

type WorkspaceSwitcherProps = {
  className?: string;
  variant?: "default" | "context";
};

export function WorkspaceSwitcher({
  className,
  variant = "default",
}: WorkspaceSwitcherProps) {
  const {
    loading,
    error,
    workspaces,
    activeWorkspace,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    switchWorkspace,
  } = useWorkspace();
  const { collapsed } = useSidebar();

  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!collapsed) return;
    setOpen(false);
    setCreating(false);
    setEditingId(null);
  }, [collapsed]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCreating(false);
        setEditingId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    setBusy(true);
    try {
      await createWorkspace(name);
      setNewName("");
      setCreating(false);
    } catch {
      // error surfaced via context
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(workspaceId: string) {
    const name = editName.trim();
    if (!name) return;

    setBusy(true);
    try {
      await renameWorkspace(workspaceId, name);
      setEditingId(null);
    } catch {
      // error surfaced via context
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(workspaceId: string) {
    setBusy(true);
    try {
      await deleteWorkspace(workspaceId);
    } catch {
      // error surfaced via context
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitch(workspaceId: string) {
    if (workspaceId === activeWorkspace?.id) {
      setOpen(false);
      return;
    }

    setBusy(true);
    try {
      await switchWorkspace(workspaceId);
      setOpen(false);
    } catch {
      // error surfaced via context
    } finally {
      setBusy(false);
    }
  }

  const label = loading
    ? "Loading workspaces…"
    : (activeWorkspace?.name ?? "My workspace");

  const workspaceInitial = label.trim().charAt(0).toUpperCase() || "W";

  const trigger = (
    <button
      type="button"
      className={cn(
        "workspace-switcher-trigger",
        variant === "context" && "workspace-switcher-trigger--context",
      )}
      aria-expanded={open}
      aria-controls={listId}
      aria-label={label}
      disabled={loading || busy}
      onClick={() => setOpen((value) => !value)}
    >
      <span className="workspace-switcher-initial" aria-hidden>
        {workspaceInitial}
      </span>
      <span className="workspace-switcher-label">{label}</span>
      <ChevronDown
        width={16}
        height={16}
        className={cn(
          "app-icon workspace-switcher-chevron",
          open && "workspace-switcher-chevron-open",
        )}
        aria-hidden
      />
    </button>
  );

  return (
    <div ref={rootRef} className={cn("workspace-switcher", className)}>
      {collapsed ? (
        <SidebarTooltip label={label}>{trigger}</SidebarTooltip>
      ) : (
        trigger
      )}

      {error ? <p className="workspace-switcher-error">{error}</p> : null}

      {open ? (
        <div id={listId} className="workspace-switcher-menu" role="menu">
          <ul className="workspace-switcher-list">
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace?.id;
              const isEditing = editingId === workspace.id;
              const canManageWorkspace = workspace.role === "owner";

              return (
                <li key={workspace.id} className="workspace-switcher-item">
                  {isEditing ? (
                    <div className="workspace-switcher-edit">
                      <input
                        className="workspace-switcher-input"
                        value={editName}
                        aria-label="Workspace name"
                        autoFocus
                        onChange={(event) => setEditName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void handleRename(workspace.id);
                          }
                          if (event.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                      />
                      <div className="workspace-switcher-edit-actions">
                        <button
                          type="button"
                          className="workspace-switcher-action workspace-switcher-action--secondary"
                          disabled={busy}
                          onClick={() => void handleRename(workspace.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="workspace-switcher-action workspace-switcher-action--ghost"
                          disabled={busy}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="workspace-switcher-row">
                      <button
                        type="button"
                        className="workspace-switcher-select"
                        role="menuitem"
                        onClick={() => void handleSwitch(workspace.id)}
                      >
                        <span className="workspace-switcher-name">{workspace.name}</span>
                        {workspace.role ? (
                          <WorkspaceRoleBadge role={workspace.role} />
                        ) : null}
                        {isActive ? (
                          <Check
                            width={14}
                            height={14}
                            className="app-icon workspace-switcher-check"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                      <div className="workspace-switcher-actions">
                        {canManageWorkspace ? (
                          <>
                            <button
                              type="button"
                              className="workspace-switcher-icon-btn"
                              aria-label={`Rename ${workspace.name}`}
                              disabled={busy}
                              onClick={() => {
                                setEditingId(workspace.id);
                                setEditName(workspace.name);
                                setCreating(false);
                              }}
                            >
                              <PenSquare width={14} height={14} className="app-icon" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="workspace-switcher-icon-btn workspace-switcher-icon-btn-danger"
                              aria-label={`Delete ${workspace.name}`}
                              disabled={busy || workspaces.length <= 1}
                              onClick={() => void handleDelete(workspace.id)}
                            >
                              <Trash width={14} height={14} className="app-icon" aria-hidden />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {creating ? (
            <div className="workspace-switcher-create">
              <input
                className="workspace-switcher-input"
                value={newName}
                aria-label="New workspace name"
                placeholder="Workspace name"
                autoFocus
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleCreate();
                  }
                  if (event.key === "Escape") {
                    setCreating(false);
                    setNewName("");
                  }
                }}
              />
              <div className="workspace-switcher-edit-actions">
                <button
                  type="button"
                  className="workspace-switcher-action workspace-switcher-action--primary"
                  disabled={busy}
                  onClick={() => void handleCreate()}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="workspace-switcher-action workspace-switcher-action--ghost"
                  disabled={busy}
                  onClick={() => {
                    setCreating(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="workspace-switcher-add"
              disabled={busy}
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
            >
              <Plus width={14} height={14} className="app-icon" aria-hidden />
              <span>New workspace</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
