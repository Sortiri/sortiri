"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatEventTime } from "@/lib/events/format";
import type { WorkspaceMemberRecord, WorkspaceRole } from "@/types/workspace-members";
import { WorkspaceRoleBadge } from "@/components/workspace/workspace-role-badge";

type TeamMemberRowProps = {
  member: WorkspaceMemberRecord;
  workspaceId: string;
  canManage: boolean;
  isOwner: boolean;
};

const ROLE_OPTIONS: WorkspaceRole[] = ["owner", "admin", "member", "viewer"];

export function TeamMemberRow({
  member,
  workspaceId,
  canManage,
  isOwner,
}: TeamMemberRowProps) {
  const updateRole = useMutation(api.workspaceMembers.updateRole);
  const removeMember = useMutation(api.workspaceMembers.removeMember);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = useCallback(
    async (role: WorkspaceRole) => {
      setError(null);
      setBusy(true);
      try {
        await updateRole({
          workspaceId,
          memberId: member.id as Id<"workspaceMembers">,
          role,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update role");
      } finally {
        setBusy(false);
      }
    },
    [member.id, updateRole, workspaceId],
  );

  const handleRemove = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await removeMember({
        workspaceId,
        memberId: member.id as Id<"workspaceMembers">,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setBusy(false);
    }
  }, [member.id, removeMember, workspaceId]);

  const showActions = canManage && (isOwner || member.role !== "owner");
  const canChangeRole = isOwner;

  return (
    <div className="team-member-row">
      <div className="team-member-row__main">
        <div className="team-member-row__identity">
          <p className="team-member-row__name">{member.name ?? member.email ?? "Member"}</p>
          {member.email ? (
            <p className="team-member-row__email">{member.email}</p>
          ) : null}
        </div>
        <div className="team-member-row__meta">
          <WorkspaceRoleBadge role={member.role} />
          {member.joinedAt ? (
            <span>Joined {formatEventTime(member.joinedAt)}</span>
          ) : null}
        </div>
      </div>

      {showActions ? (
        <div className="team-member-row__actions">
          {canChangeRole ? (
            <select
              className="team-form__select"
              value={member.role}
              disabled={busy}
              onChange={(event) =>
                void handleRoleChange(event.target.value as WorkspaceRole)
              }
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="team-button team-button--danger"
            disabled={busy}
            onClick={() => void handleRemove()}
          >
            Remove
          </button>
        </div>
      ) : null}

      {error ? <p className="team-error">{error}</p> : null}
    </div>
  );
}
