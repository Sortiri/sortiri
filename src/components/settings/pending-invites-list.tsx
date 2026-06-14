"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatEventTime } from "@/lib/events/format";
import type { WorkspaceInviteRecord } from "@/types/workspace-invites";
import { WorkspaceRoleBadge } from "@/components/workspace/workspace-role-badge";

type PendingInvitesListProps = {
  workspaceId: string;
  invites: WorkspaceInviteRecord[];
};

export function PendingInvitesList({ workspaceId, invites }: PendingInvitesListProps) {
  const revokeInvite = useMutation(api.workspaceMembers.revokeInvite);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = useCallback(
    async (inviteId: string) => {
      setError(null);
      setRevokingId(inviteId);
      try {
        await revokeInvite({
          workspaceId,
          inviteId: inviteId as Id<"workspaceInvites">,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke invite");
      } finally {
        setRevokingId(null);
      }
    },
    [revokeInvite, workspaceId],
  );

  if (invites.length === 0) {
    return <p className="team-hint">No pending invites.</p>;
  }

  return (
    <div className="team-table">
      {invites.map((invite) => (
        <div key={invite.id} className="team-member-row">
          <div className="team-member-row__main">
            <div className="team-member-row__identity">
              <p className="team-member-row__name">{invite.email}</p>
              <p className="team-member-row__email">
                Expires {formatEventTime(invite.expiresAt)} · …{invite.last4}
              </p>
            </div>
            <WorkspaceRoleBadge role={invite.role} />
          </div>
          <div className="team-member-row__actions">
            <button
              type="button"
              className="team-button team-button--danger"
              disabled={revokingId === invite.id}
              onClick={() => void handleRevoke(invite.id)}
            >
              {revokingId === invite.id ? "Revoking…" : "Revoke"}
            </button>
          </div>
        </div>
      ))}
      {error ? <p className="team-error">{error}</p> : null}
    </div>
  );
}
