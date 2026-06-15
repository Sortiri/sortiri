"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { WorkspaceMemberRecord, WorkspaceRole } from "@/types/workspace-members";

type MemberProjectAccessProps = {
  workspaceId: string;
  member: WorkspaceMemberRecord;
};

export function MemberProjectAccess({ workspaceId, member }: MemberProjectAccessProps) {
  const assignments = useQuery(api.projectAccess.listForMember, {
    workspaceId,
    memberId: member.id as Id<"workspaceMembers">,
  });

  if (member.role === "owner" || member.role === "admin") {
    return <span className="team-member-row__projects">All projects</span>;
  }

  if (assignments === undefined) {
    return <span className="team-member-row__projects">…</span>;
  }

  if (assignments.length === 0) {
    return <span className="team-member-row__projects">No projects assigned</span>;
  }

  const names = assignments.map((row) => row.projectName).join(", ");
  return <span className="team-member-row__projects">{names}</span>;
}
