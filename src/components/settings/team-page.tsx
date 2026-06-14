"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import type { WorkspaceMemberRecord } from "@/types/workspace-members";
import { InviteForm } from "./invite-form";
import { PendingInvitesList } from "./pending-invites-list";
import { TeamMemberRow } from "./team-member-row";
import "./team.css";

export function TeamPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities, loading: membershipLoading } =
    useWorkspaceMembership(activeWorkspaceId);
  const members = useQuery(
    api.workspaceMembers.listByWorkspace,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );
  const invites = useQuery(
    api.workspaceMembers.listInvites,
    activeWorkspaceId && capabilities?.canManageMembers
      ? { workspaceId: activeWorkspaceId }
      : "skip",
  );

  const loading =
    wsLoading ||
    membershipLoading ||
    (activeWorkspaceId !== null && members === undefined);

  const canManage = capabilities?.canManageMembers ?? false;

  return (
    <div className="team-page">
      <header className="team-page__header">
        <h1 className="team-page__title">Team</h1>
        <p className="team-page__subtitle">
          Members who can access this workspace and their roles.
        </p>
      </header>

      {loading ? <p className="team-loading">Loading team…</p> : null}

      {!loading && members ? (
        <section className="team-section">
          <h2 className="team-section__title">Members</h2>
          <div className="team-table">
            {members.map((member: WorkspaceMemberRecord) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                workspaceId={activeWorkspaceId!}
                canManage={canManage}
                isOwner={capabilities?.canManageWorkspace ?? false}
              />
            ))}
          </div>
        </section>
      ) : null}

      {canManage && activeWorkspaceId ? (
        <>
          <section className="team-section">
            <h2 className="team-section__title">Invite member</h2>
            <InviteForm workspaceId={activeWorkspaceId} />
          </section>

          {invites !== undefined ? (
            <section className="team-section">
              <h2 className="team-section__title">Pending invites</h2>
              <PendingInvitesList
                workspaceId={activeWorkspaceId}
                invites={invites}
              />
            </section>
          ) : null}
        </>
      ) : !loading ? (
        <p className="team-hint">Admin access required to manage team members.</p>
      ) : null}
    </div>
  );
}
