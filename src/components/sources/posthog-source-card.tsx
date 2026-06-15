"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatEventTime } from "@/lib/events/format";
import { POSTHOG_RECOMMENDED_EVENTS } from "@/types/posthog-integration";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SourceTimelineLink } from "@/components/sources/source-timeline-link";
import { SetupBlock } from "@/components/sources/setup-block";

type PosthogSourceCardProps = {
  workspaceId: string;
  connected: boolean;
  eventCount?: number;
  lastEventAt?: number;
  primaryEventCount?: number;
  lastError?: string;
};

export function PosthogSourceCard({
  workspaceId,
  connected,
  eventCount,
  lastEventAt,
  primaryEventCount,
  lastError,
}: PosthogSourceCardProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canManage = capabilities?.canManageSources ?? false;
  const posthogStatus = useQuery(api.integrations.posthog.getPostHogStatus, { workspaceId });
  const createSecret = useMutation(api.integrations.posthog.createWebhookSecret);
  const saveSecret = useMutation(api.integrations.posthog.saveWebhookSecret);
  const revokeSecret = useMutation(api.integrations.posthog.revokeWebhookSecret);
  const sendTestEvent = useMutation(api.integrations.posthog.sendTestEvent);

  const [secretInput, setSecretInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdRawSecret, setCreatedRawSecret] = useState<string | null>(null);

  const apiUrl =
    typeof window !== "undefined" ? window.location.origin : "https://app.sortiri.com";

  const webhookUrl = `${apiUrl}/api/integrations/posthog/webhook?workspaceId=${workspaceId}`;

  const statusLabel = useMemo(() => {
    const status = posthogStatus?.connectionStatus;
    if (status === "connected") return "Connected";
    if (status === "error") return "Error";
    if (status === "revoked") return "Not connected";
    return connected ? "Connected" : "Not connected";
  }, [connected, posthogStatus?.connectionStatus]);

  const setupInstructions = useMemo(
    () => `PostHog → Project Settings → Webhooks → Add destination

Destination URL:
${webhookUrl}

Authorization header:
Bearer <your webhook secret from below>

Recommended events:
${POSTHOG_RECOMMENDED_EVENTS.map((event) => `- ${event}`).join("\n")}`,
    [webhookUrl],
  );

  const handleCreateSecret = useCallback(async () => {
    setError(null);
    setMessage(null);
    setCreating(true);
    try {
      const result = await createSecret({ workspaceId });
      setCreatedRawSecret(result.rawSecret);
      setMessage("Webhook secret created. Copy it now — it won't be shown again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create webhook secret");
    } finally {
      setCreating(false);
    }
  }, [createSecret, workspaceId]);

  const handleSaveSecret = useCallback(async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await saveSecret({ workspaceId, rawSecret: secretInput.trim() });
      setSecretInput("");
      setCreatedRawSecret(null);
      setMessage("Webhook secret saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save webhook secret");
    } finally {
      setSaving(false);
    }
  }, [saveSecret, secretInput, workspaceId]);

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
      setMessage("PostHog test event recorded. Check your timeline.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send test event");
    } finally {
      setSendingTest(false);
    }
  }, [sendTestEvent, workspaceId]);

  const displayEventCount = posthogStatus?.eventCount ?? eventCount ?? 0;
  const displayLastEventAt = posthogStatus?.lastEventAt ?? lastEventAt;
  const displayError = posthogStatus?.lastError ?? lastError;

  return (
    <article className="source-card posthog-source-card">
      <div className="source-card__header">
        <h3 className="source-card__title">PostHog</h3>
        <span
          className={`source-card__status${
            statusLabel === "Connected" ? " source-card__status--connected" : ""
          }${statusLabel === "Error" ? " source-card__status--error" : ""}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="source-card__description">
        Sync product analytics events — signups, activation, feature usage, and revenue intent —
        into your company timeline.
      </p>

      <div className="source-card__stats">
        <p>Events recorded: {displayEventCount}</p>
        {primaryEventCount !== undefined ? (
          <p>Primary events: {primaryEventCount}</p>
        ) : null}
        <p>Last event: {displayLastEventAt ? formatEventTime(displayLastEventAt) : "—"}</p>
        {posthogStatus?.maskedSecret ? (
          <p>Webhook secret saved: {posthogStatus.maskedSecret}</p>
        ) : posthogStatus?.connectionStatus === "revoked" ? (
          <p>Webhook secret revoked</p>
        ) : null}
        {displayError ? <p className="sources-section__error">Last error: {displayError}</p> : null}
        <SourceTimelineLink workspaceId={workspaceId} sourceKey="posthog" />
      </div>

      {error ? <p className="sources-section__error">{error}</p> : null}
      {message ? <p className="sources-section__success">{message}</p> : null}

      {createdRawSecret ? (
        <SetupBlock label="Your webhook secret (copy now)" code={createdRawSecret} defaultOpen />
      ) : null}

      <SetupBlock label="Webhook URL" code={webhookUrl} defaultOpen />
      <SetupBlock label="PostHog setup instructions" code={setupInstructions} />

      <div className="stripe-source-card__secret">
        <label className="sources-section__label" htmlFor={`posthog-secret-${workspaceId}`}>
          Webhook secret (optional paste)
        </label>
        <input
          id={`posthog-secret-${workspaceId}`}
          className="api-key-create__input"
          type="password"
          autoComplete="off"
          placeholder="phsec_sortiri_..."
          value={secretInput}
          onChange={(event) => setSecretInput(event.target.value)}
          disabled={!canManage || saving}
        />
      </div>

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
          onClick={() => void handleSaveSecret()}
          disabled={saving || !canManage || secretInput.trim().length < 24}
        >
          {saving ? "Saving…" : "Save pasted secret"}
        </button>
        <button
          type="button"
          className="sources-button sources-button--ghost"
          onClick={() => void handleSendTestEvent()}
          disabled={sendingTest || !canManage}
        >
          {sendingTest ? "Sending…" : "Send test event"}
        </button>
        {posthogStatus?.secretStatus === "active" && canManage ? (
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
        <p className="sources-section__hint">Admin access required to manage PostHog sources.</p>
      ) : null}
    </article>
  );
}
