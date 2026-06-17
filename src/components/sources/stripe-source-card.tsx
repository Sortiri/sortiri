"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatEventTime } from "@/lib/events/format";
import { STRIPE_WEBHOOK_EVENTS } from "@/types/stripe-integration";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SourceTimelineLink } from "@/components/sources/source-timeline-link";
import { SetupBlock } from "@/components/sources/setup-block";
import { buildWebhookUrl } from "@/lib/sortiri/apiUrl";

type StripeSourceCardProps = {
  workspaceId: string;
  connected: boolean;
  eventCount?: number;
  lastEventAt?: number;
  primaryEventCount?: number;
  lastError?: string;
};

export function StripeSourceCard({
  workspaceId,
  connected,
  eventCount,
  lastEventAt,
  primaryEventCount,
  lastError,
}: StripeSourceCardProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canManage = capabilities?.canManageSources ?? false;
  const stripeStatus = useQuery(api.integrations.stripe.getStripeStatus, { workspaceId });
  const saveSecret = useMutation(api.integrations.stripe.saveWebhookSecret);
  const revokeSecret = useMutation(api.integrations.stripe.revokeWebhookSecret);
  const sendTestEvent = useMutation(api.integrations.stripe.sendTestEvent);

  const [secretInput, setSecretInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const webhookUrl = buildWebhookUrl("stripe", workspaceId);

  const statusLabel = useMemo(() => {
    const status = stripeStatus?.connectionStatus;
    if (status === "connected") return "Connected";
    if (status === "error") return "Error";
    if (status === "revoked") return "Not connected";
    return connected ? "Connected" : "Not connected";
  }, [connected, stripeStatus?.connectionStatus]);

  const setupInstructions = useMemo(
    () => `Stripe Dashboard → Developers → Webhooks → Add endpoint

Endpoint URL:
${webhookUrl}

Events:
${STRIPE_WEBHOOK_EVENTS.map((event) => `- ${event}`).join("\n")}

Signing secret:
Paste the whsec_... value into Sortiri`,
    [webhookUrl],
  );

  const stripeCliNote = `stripe listen --forward-to ${webhookUrl}`;

  const handleSaveSecret = useCallback(async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const result = await saveSecret({ workspaceId, rawSecret: secretInput.trim() });
      setSecretInput("");
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
      setMessage("Stripe test event recorded. Check your timeline.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send test event");
    } finally {
      setSendingTest(false);
    }
  }, [sendTestEvent, workspaceId]);

  const displayEventCount = stripeStatus?.eventCount ?? eventCount ?? 0;
  const displayLastEventAt = stripeStatus?.lastEventAt ?? lastEventAt;
  const displayError = stripeStatus?.lastError ?? lastError;

  return (
    <article className="source-card stripe-source-card">
      <div className="source-card__header">
        <h3 className="source-card__title">Stripe</h3>
        <span
          className={`source-card__status${
            statusLabel === "Connected" ? " source-card__status--connected" : ""
          }${statusLabel === "Error" ? " source-card__status--error" : ""}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="source-card__description">
        Sync payments, customers, subscriptions, refunds, and failed payments into your
        company timeline.
      </p>

      <div className="source-card__stats">
        <p>Events recorded: {displayEventCount}</p>
        {primaryEventCount !== undefined ? (
          <p>Primary events: {primaryEventCount}</p>
        ) : null}
        <p>Last event: {displayLastEventAt ? formatEventTime(displayLastEventAt) : "—"}</p>
        {stripeStatus?.maskedSecret ? (
          <p>Webhook secret saved: {stripeStatus.maskedSecret}</p>
        ) : stripeStatus?.connectionStatus === "revoked" ? (
          <p>Webhook secret revoked</p>
        ) : null}
        {displayError ? <p className="sources-section__error">Last error: {displayError}</p> : null}
        <SourceTimelineLink workspaceId={workspaceId} sourceKey="stripe" />
      </div>

      {error ? <p className="sources-section__error">{error}</p> : null}
      {message ? <p className="sources-section__success">{message}</p> : null}

      <SetupBlock label="Webhook URL" code={webhookUrl} defaultOpen />
      <SetupBlock label="Stripe setup instructions" code={setupInstructions} />
      <SetupBlock label="Optional: Stripe CLI" code={stripeCliNote} />

      <div className="stripe-source-card__secret">
        <label className="sources-section__label" htmlFor={`stripe-secret-${workspaceId}`}>
          Webhook signing secret
        </label>
        <input
          id={`stripe-secret-${workspaceId}`}
          className="api-key-create__input"
          type="password"
          autoComplete="off"
          placeholder="whsec_..."
          value={secretInput}
          onChange={(event) => setSecretInput(event.target.value)}
          disabled={!canManage || saving}
        />
      </div>

      <div className="github-source-card__actions">
        <button
          type="button"
          className="sources-button"
          onClick={() => void handleSaveSecret()}
          disabled={saving || !canManage || !secretInput.trim().startsWith("whsec_")}
        >
          {saving ? "Saving…" : "Save webhook secret"}
        </button>
        <button
          type="button"
          className="sources-button sources-button--ghost"
          onClick={() => void handleSendTestEvent()}
          disabled={sendingTest || !canManage}
        >
          {sendingTest ? "Sending…" : "Send test event"}
        </button>
        {stripeStatus?.secretStatus === "active" && canManage ? (
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
        <p className="sources-section__hint">Admin access required to manage Stripe sources.</p>
      ) : null}
    </article>
  );
}
