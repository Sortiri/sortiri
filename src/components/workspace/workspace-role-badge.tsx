import type { WorkspaceRole } from "@/types/workspace-members";

type WorkspaceRoleBadgeProps = {
  role: WorkspaceRole;
};

export function WorkspaceRoleBadge({ role }: WorkspaceRoleBadgeProps) {
  return (
    <span className={`workspace-role-badge workspace-role-badge--${role}`}>
      {role}
    </span>
  );
}
