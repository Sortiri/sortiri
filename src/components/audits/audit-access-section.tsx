"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { AuditReportAccessLevel } from "@/types/audit-reports";
import type { WorkspaceMemberRecord } from "@/types/workspace-members";

type AuditAccessSectionProps = {
  workspaceId: string;
  reportId: string;
};

export function AuditAccessSection({ workspaceId, reportId }: AuditAccessSectionProps) {
  const members = useQuery(api.workspaceMembers.listByWorkspace, { workspaceId });
  const accessRows = useQuery(api.auditReports.listAccess, {
    workspaceId,
    reportId: reportId as Id<"auditReports">,
  });
  const grantAccess = useMutation(api.auditReports.grantAccess);
  const revokeAccess = useMutation(api.auditReports.revokeAccess);

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [accessLevel, setAccessLevel] = useState<AuditReportAccessLevel>("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberList = (members ?? []) as WorkspaceMemberRecord[];
  const grantableMembers = memberList.filter(
    (member) => member.role !== "owner" && member.role !== "admin",
  );

  const handleGrant = useCallback(async () => {
    if (!selectedMemberId) return;
    setBusy(true);
    setError(null);
    try {
      await grantAccess({
        workspaceId,
        reportId: reportId as Id<"auditReports">,
        memberId: selectedMemberId as Id<"workspaceMembers">,
        accessLevel,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant access");
    } finally {
      setBusy(false);
    }
  }, [accessLevel, grantAccess, reportId, selectedMemberId, workspaceId]);

  const handleRevoke = useCallback(
    async (memberId: string) => {
      setBusy(true);
      setError(null);
      try {
        await revokeAccess({
          workspaceId,
          reportId: reportId as Id<"auditReports">,
          memberId: memberId as Id<"workspaceMembers">,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke access");
      } finally {
        setBusy(false);
      }
    },
    [reportId, revokeAccess, workspaceId],
  );

  return (
    <section>
      <h3 className="audit-evidence-group__title">Report access</h3>
      <div className="audit-modal__field">
        <label htmlFor="audit-member">Grant member</label>
        <select
          id="audit-member"
          value={selectedMemberId}
          onChange={(event) => setSelectedMemberId(event.target.value)}
        >
          <option value="">Select member</option>
          {grantableMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? member.email ?? member.id} ({member.role})
            </option>
          ))}
        </select>
      </div>
      <div className="audit-modal__field">
        <label htmlFor="audit-access-level">Access level</label>
        <select
          id="audit-access-level"
          value={accessLevel}
          onChange={(event) => setAccessLevel(event.target.value as AuditReportAccessLevel)}
        >
          <option value="viewer">Viewer</option>
          <option value="reviewer">Reviewer</option>
        </select>
      </div>
      <button
        type="button"
        className="audit-detail__action"
        disabled={busy || !selectedMemberId}
        onClick={() => void handleGrant()}
      >
        Grant access
      </button>
      {error ? <p className="audit-modal__error">{error}</p> : null}
      <table className="audit-access-table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Access</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(accessRows ?? []).map((row) => (
            <tr key={row.id}>
              <td>{row.memberName ?? row.memberEmail ?? row.memberId}</td>
              <td>{row.memberRole ?? "—"}</td>
              <td>{row.accessLevel}</td>
              <td>{row.status}</td>
              <td>
                {row.status === "active" ? (
                  <button
                    type="button"
                    className="audit-evidence-item__link"
                    disabled={busy}
                    onClick={() => void handleRevoke(row.memberId)}
                  >
                    Revoke
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
