"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { PageLoader } from "@/components/ui/page-loader";
import { WorkspaceRoleBadge } from "@/components/workspace/workspace-role-badge";
import type { InviteRole } from "@/types/workspace-invites";
import "../settings/team.css";

type InviteAcceptPageProps = {
  token: string;
};

export function InviteAcceptPage({ token }: InviteAcceptPageProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const preview = useQuery(api.workspaceMembers.getInviteByToken, { rawToken: token });
  const acceptInvite = useMutation(api.workspaceMembers.acceptInvite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await acceptInvite({ rawToken: token });
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setBusy(false);
    }
  }, [acceptInvite, router, token]);

  if (!isLoaded || preview === undefined) {
    return (
      <div className="invite-accept-page">
        <PageLoader variant="inline" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="invite-accept-page">
        <div className="invite-accept-card">
          <h1 className="invite-accept-card__title">Invite not found</h1>
          <p className="invite-accept-card__detail">
            This invite link is invalid, expired, or has already been used.
          </p>
          <Link href="/" className="team-button team-button--primary">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    const redirect = encodeURIComponent(`/invite/${token}`);
    return (
      <div className="invite-accept-page">
        <div className="invite-accept-card">
          <h1 className="invite-accept-card__title">Join {preview.workspaceName}</h1>
          <p className="invite-accept-card__detail">
            You&apos;ve been invited as{" "}
            <WorkspaceRoleBadge role={preview.role as InviteRole} /> for {preview.email}. Sign in
            to accept.
          </p>
          <Link
            href={`/sign-in?redirect_url=${redirect}`}
            className="team-button team-button--primary"
          >
            Sign in to accept
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-accept-page">
      <div className="invite-accept-card">
        <h1 className="invite-accept-card__title">Join {preview.workspaceName}</h1>
        <p className="invite-accept-card__detail">
          Accept this invite to join as{" "}
          <WorkspaceRoleBadge role={preview.role as InviteRole} /> ({preview.email}).
        </p>
        <button
          type="button"
          className="team-button team-button--primary"
          disabled={busy}
          onClick={() => void handleAccept()}
        >
          {busy ? "Joining…" : "Accept invite"}
        </button>
        {error ? <p className="team-error">{error}</p> : null}
      </div>
    </div>
  );
}
