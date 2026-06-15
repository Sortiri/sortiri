"use client";

import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { InviteRole } from "@/types/workspace-invites";

type InviteFormProps = {
  workspaceId: string;
};

const ROLE_OPTIONS: { value: InviteRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
  { value: "auditor", label: "Auditor" },
];

export function InviteForm({ workspaceId }: InviteFormProps) {
  const invite = useMutation(api.workspaceMembers.invite);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setInviteUrl(null);
    setBusy(true);
    try {
      const result = await invite({ workspaceId, email, role });
      const fullUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${result.inviteUrl}`
          : result.inviteUrl;
      setInviteUrl(fullUrl);
      setExpiresAt(result.expiresAt);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invite");
    } finally {
      setBusy(false);
    }
  }, [email, invite, role, workspaceId]);

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // ignore clipboard errors
    }
  }, [inviteUrl]);

  return (
    <div className="team-form">
      <div className="team-form__row">
        <label className="team-form__label" htmlFor="invite-email">
          Email
        </label>
        <input
          id="invite-email"
          className="team-form__input"
          type="email"
          value={email}
          placeholder="teammate@company.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="team-form__row">
        <label className="team-form__label" htmlFor="invite-role">
          Role
        </label>
        <select
          id="invite-role"
          className="team-form__select"
          value={role}
          onChange={(event) => setRole(event.target.value as InviteRole)}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="team-form__actions">
        <button
          type="button"
          className="team-button team-button--primary"
          disabled={busy || !email.trim()}
          onClick={() => void handleSubmit()}
        >
          {busy ? "Creating…" : "Create invite link"}
        </button>
      </div>

      {inviteUrl ? (
        <div className="team-invite-result">
          <p className="team-invite-result__url">{inviteUrl}</p>
          {expiresAt ? (
            <p className="team-hint">Expires {new Date(expiresAt).toLocaleString()}</p>
          ) : null}
          <button type="button" className="team-button" onClick={() => void handleCopy()}>
            Copy link
          </button>
        </div>
      ) : null}

      {error ? <p className="team-error">{error}</p> : null}
    </div>
  );
}
