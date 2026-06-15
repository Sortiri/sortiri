"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ProjectAccessLevel } from "@/types/project-access";
import type { WorkspaceMemberRecord, WorkspaceRole } from "@/types/workspace-members";

const ACCESS_LEVELS: ProjectAccessLevel[] = ["owner", "manager", "editor", "viewer"];

type ManageProjectAccessModalProps = {
  workspaceId: string;
  member: WorkspaceMemberRecord;
  onClose: () => void;
};

export function ManageProjectAccessModal({
  workspaceId,
  member,
  onClose,
}: ManageProjectAccessModalProps) {
  const projects = useQuery(api.projects.listByWorkspace, {
    workspaceId,
    status: "all",
  });
  const assignments = useQuery(api.projectAccess.listForMember, {
    workspaceId,
    memberId: member.id as Id<"workspaceMembers">,
  });
  const grant = useMutation(api.projectAccess.grant);
  const revoke = useMutation(api.projectAccess.revoke);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [accessLevel, setAccessLevel] = useState<ProjectAccessLevel>("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignmentByProject = useMemo(() => {
    const map = new Map<string, { level: ProjectAccessLevel; memberId: string }>();
    for (const row of assignments ?? []) {
      map.set(row.projectId, { level: row.accessLevel, memberId: row.memberId });
    }
    return map;
  }, [assignments]);

  const handleGrant = useCallback(async () => {
    if (!selectedProjectId) return;
    setBusy(true);
    setError(null);
    try {
      await grant({
        workspaceId,
        projectId: selectedProjectId as Id<"projects">,
        memberId: member.id as Id<"workspaceMembers">,
        accessLevel,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant access");
    } finally {
      setBusy(false);
    }
  }, [accessLevel, grant, member.id, selectedProjectId, workspaceId]);

  const handleRevoke = useCallback(
    async (projectId: string) => {
      setBusy(true);
      setError(null);
      try {
        await revoke({
          workspaceId,
          projectId: projectId as Id<"projects">,
          memberId: member.id as Id<"workspaceMembers">,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke access");
      } finally {
        setBusy(false);
      }
    },
    [member.id, revoke, workspaceId],
  );

  if (isAdminRole(member.role)) {
    return (
      <div className="team-modal-backdrop" onClick={onClose}>
        <div className="team-modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="team-modal__title">Project access</h3>
          <p>Workspace {member.role}s have access to all projects.</p>
          <button type="button" className="team-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="team-modal-backdrop" onClick={onClose}>
      <div className="team-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="team-modal__title">
          Manage projects — {member.name ?? member.email}
        </h3>

        <div className="team-modal__form">
          <label className="team-form__label">
            Project
            <select
              className="team-form__select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">Select project…</option>
              {(projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="team-form__label">
            Access level
            <select
              className="team-form__select"
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as ProjectAccessLevel)}
            >
              {ACCESS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="team-button team-button--primary"
            disabled={busy || !selectedProjectId}
            onClick={() => void handleGrant()}
          >
            Grant access
          </button>
        </div>

        <div className="team-modal__list">
          <h4>Current access</h4>
          {(assignments ?? []).length === 0 ? (
            <p className="team-muted">No project assignments yet.</p>
          ) : (
            <ul className="team-modal__assignments">
              {(assignments ?? []).map((row) => (
                <li key={row.projectId}>
                  <span>
                    {row.projectName} — {row.accessLevel}
                  </span>
                  <button
                    type="button"
                    className="team-button team-button--danger"
                    disabled={busy}
                    onClick={() => void handleRevoke(row.projectId)}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? <p className="team-error">{error}</p> : null}
        <button type="button" className="team-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function isAdminRole(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}
