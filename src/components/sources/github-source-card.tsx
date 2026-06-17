"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatEventTime } from "@/lib/events/format";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SourceTimelineLink } from "@/components/sources/source-timeline-link";
import { SetupBlock } from "@/components/sources/setup-block";
import { buildWebhookUrl } from "@/lib/sortiri/apiUrl";

type GithubSourceCardProps = {
  workspaceId: string;
  connected: boolean;
  eventCount?: number;
  lastEventAt?: number;
  primaryEventCount?: number;
  lastError?: string;
};

export function GithubSourceCard({
  workspaceId,
  connected,
  eventCount,
  lastEventAt,
  primaryEventCount,
  lastError,
}: GithubSourceCardProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canManage = capabilities?.canManageSources ?? false;
  const githubStatus = useQuery(api.integrations.github.getGithubStatus, { workspaceId });
  const createSecret = useMutation(api.integrations.github.createWebhookSecret);
  const revokeSecret = useMutation(api.integrations.github.revokeWebhookSecret);
  const sendTestEvent = useMutation(api.integrations.github.sendTestEvent);

  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdRawSecret, setCreatedRawSecret] = useState<string | null>(null);

  const webhookUrl = buildWebhookUrl("github", workspaceId);

  const statusLabel = useMemo(() => {
    const status = githubStatus?.connectionStatus;
    if (status === "connected") return "Connected";
    if (status === "error") return "Error";
    if (status === "revoked") return "Not connected";
    return connected ? "Connected" : "Not connected";
  }, [connected, githubStatus?.connectionStatus]);

  const setupInstructions = useMemo(
    () => `GitHub Repo → Settings → Webhooks → Add webhook

Payload URL:
${webhookUrl}

Content type:
application/json

Secret:
<your webhook secret from below>

Events:
- Pull requests
- Pushes
- Issues`,
    [webhookUrl],
  );

  const handleCreateSecret = useCallback(async () => {
    setError(null);
    setMessage(null);
    setCreating(true);
    try {
      const result = await createSecret({ workspaceId });
      setCreatedRawSecret(result.rawSecret);
      setMessage("Webhook secret saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create webhook secret");
    } finally {
      setCreating(false);
    }
  }, [createSecret, workspaceId]);

  const handleRevoke = useCallback(async () => {
    setError(null);
    setMessage(null);
    setRevoking(true);
    try {
      await revokeSecret({ workspaceId });
      setCreatedRawSecret(null);
      setMessage("Webhook secret revoked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke webhook secret");
    } finally {
      setRevoking(false);
    }
  }, [revokeSecret, workspaceId]);

  const handleSendTestEvent = useCallback(async () => {
    setError(null);
    setMessage(null);
    setSendingTest(true);
    try {
      await sendTestEvent({ workspaceId });
      setMessage("GitHub test event recorded. Check your timeline.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send test event");
    } finally {
      setSendingTest(false);
    }
  }, [sendTestEvent, workspaceId]);

  const displayEventCount = githubStatus?.eventCount ?? eventCount ?? 0;
  const displayLastEventAt = githubStatus?.lastEventAt ?? lastEventAt;
  const displayError = githubStatus?.lastError ?? lastError;

  return (
    <article className="source-card github-source-card">
      <div className="source-card__header">
        <h3 className="source-card__title">GitHub</h3>
        <span
          className={`source-card__status${
            statusLabel === "Connected" ? " source-card__status--connected" : ""
          }${statusLabel === "Error" ? " source-card__status--error" : ""}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="source-card__description">
        Track pull requests, commits, issues, and merges in your company timeline.
      </p>

      <div className="source-card__stats">
        <p>Events recorded: {displayEventCount}</p>
        {primaryEventCount !== undefined ? (
          <p>Primary events: {primaryEventCount}</p>
        ) : null}
        <p>Last event: {displayLastEventAt ? formatEventTime(displayLastEventAt) : "—"}</p>
        {githubStatus?.maskedSecret ? (
          <p>Webhook secret saved: {githubStatus.maskedSecret}</p>
        ) : githubStatus?.legacySecretDetected && githubStatus.secretLast4 ? (
          <p>
            Legacy webhook secret: whsec_sortiri_••••{githubStatus.secretLast4}
          </p>
        ) : githubStatus?.connectionStatus === "revoked" ? (
          <p>Webhook secret revoked</p>
        ) : null}
        {displayError ? <p className="sources-section__error">Last error: {displayError}</p> : null}
        <SourceTimelineLink workspaceId={workspaceId} sourceKey="github" />
      </div>

      {githubStatus?.legacySecretDetected ? (
        <p className="sources-section__hint">
          Legacy webhook secret detected. Run migration to move this secret to encrypted storage.
        </p>
      ) : null}

      {error ? <p className="sources-section__error">{error}</p> : null}
      {message ? <p className="sources-section__success">{message}</p> : null}

      <div className="github-source-card__actions">
        <button
          type="button"
          className="sources-button"
          onClick={() => void handleCreateSecret()}
          disabled={creating || !canManage}
        >
          {creating ? "Creating…" : "Create webhook secret"}
        </button>
        <button
          type="button"
          className="sources-button sources-button--ghost"
          onClick={() => void handleSendTestEvent()}
          disabled={sendingTest || !canManage}
        >
          {sendingTest ? "Sending…" : "Send test event"}
        </button>
        {githubStatus?.secretStatus === "active" && canManage ? (
          <button
            type="button"
            className="sources-button sources-button--ghost"
            onClick={() => void handleRevoke()}
            disabled={revoking || !canManage}
          >
            {revoking ? "Revoking…" : "Revoke secret"}
          </button>
        ) : null}
      </div>
      {!canManage ? (
        <p className="sources-section__hint">Admin access required to manage GitHub sources.</p>
      ) : null}

      {createdRawSecret ? (
        <div className="api-key-reveal">
          <p className="api-key-reveal__warning">
            Copy this webhook secret now. You will not be able to see it again.
          </p>
          <SetupBlock label="Webhook secret" code={createdRawSecret} defaultOpen />
        </div>
      ) : null}

      <SetupBlock label="Webhook URL" code={webhookUrl} defaultOpen />
      <SetupBlock label="GitHub setup instructions" code={setupInstructions} />
    </article>
  );
}
