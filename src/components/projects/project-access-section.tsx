"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { ProjectAccessLevel } from "@/types/project-access";
import { formatEventTime } from "@/lib/events/format";

type ProjectAccessSectionProps = {
  workspaceId: string;
  projectId: Id<"projects">;
};

export function ProjectAccessSection({
  workspaceId,
  projectId,
}: ProjectAccessSectionProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const accessList = useQuery(api.projectAccess.listForProject, {
    workspaceId,
    projectId,
  });
  const currentAccess = useQuery(api.projectAccess.canAccessProject, {
    workspaceId,
    projectId,
  });
  const members = useQuery(api.workspaceMembers.listByWorkspace, { workspaceId });
  const grant = useMutation(api.projectAccess.grant);
  const revoke = useMutation(api.projectAccess.revoke);

  const [memberId, setMemberId] = useState("");
  const [accessLevel, setAccessLevel] = useState<ProjectAccessLevel>("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = capabilities?.canManageProjectAssignments ?? false;

  const handleGrant = useCallback(async () => {
    if (!memberId) return;
    setBusy(true);
    setError(null);
    try {
      await grant({ workspaceId, projectId, memberId: memberId as Id<"workspaceMembers">, accessLevel });
      setMemberId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant access");
    } finally {
      setBusy(false);
    }
  }, [accessLevel, grant, memberId, projectId, workspaceId]);

  const handleRevoke = useCallback(
    async (targetMemberId: string) => {
      setBusy(true);
      setError(null);
      try {
        await revoke({
          workspaceId,
          projectId,
          memberId: targetMemberId as Id<"workspaceMembers">,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke access");
      } finally {
        setBusy(false);
      }
    },
    [projectId, revoke, workspaceId],
  );

  const assignableMembers = (members ?? []).filter(
    (member) => member.role !== "owner" && member.role !== "admin",
  );

  return (
    <section className="project-detail-page__section">
      <h2 className="project-detail-page__section-title">Project Access</h2>

      {!canManage && currentAccess?.canAccess ? (
        <p className="project-access__badge">
          Your access: {currentAccess.accessLevel}
        </p>
      ) : null}

      {canManage ? (
        <div className="project-access__grant">
          <select
            className="team-form__select"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="">Select member…</option>
            {assignableMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name ?? member.email ?? member.clerkUserId}
              </option>
            ))}
          </select>
          <select
            className="team-form__select"
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value as ProjectAccessLevel)}
          >
            <option value="owner">owner</option>
            <option value="manager">manager</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
          <button
            type="button"
            className="team-button team-button--primary"
            disabled={busy || !memberId}
            onClick={() => void handleGrant()}
          >
            Grant
          </button>
        </div>
      ) : null}

      <div className="project-access__table">
        {(accessList ?? []).length === 0 ? (
          <p className="home-section__empty">No members assigned to this project yet.</p>
        ) : (
          <ul>
            {(accessList ?? []).map((row) => (
              <li key={row.id} className="project-access__row">
                <span>
                  {row.memberName ?? row.memberEmail ?? "Member"} — {row.accessLevel}
                  {row.createdAt ? ` · ${formatEventTime(row.createdAt)}` : ""}
                </span>
                {canManage ? (
                  <button
                    type="button"
                    className="team-button team-button--danger"
                    disabled={busy}
                    onClick={() => void handleRevoke(row.memberId)}
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="team-error">{error}</p> : null}
    </section>
  );
}
