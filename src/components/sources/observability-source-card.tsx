"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatEventTime } from "@/lib/events/format";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SourceTimelineLink } from "@/components/sources/source-timeline-link";
import { SetupBlock } from "@/components/sources/setup-block";
import { buildWebhookUrl } from "@/lib/sortiri/apiUrl";

type ObservabilitySourceCardProps = {
  workspaceId: string;
  connected: boolean;
  eventCount?: number;
  lastEventAt?: number;
  primaryEventCount?: number;
  lastError?: string;
};

function linesFromList(values?: string[]): string {
  return (values ?? []).join("\n");
}

function listFromLines(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ObservabilitySourceCard({
  workspaceId,
  connected,
  eventCount,
  lastEventAt,
  primaryEventCount,
  lastError,
}: ObservabilitySourceCardProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canManage = capabilities?.canManageSources ?? false;
  const observabilityStatus = useQuery(api.integrations.observability.getObservabilityStatus, {
    workspaceId,
  });
  const saveSecret = useMutation(api.integrations.observability.saveSigningSecret);
  const revokeSecret = useMutation(api.integrations.observability.revokeSigningSecret);
  const saveConfig = useMutation(api.integrations.observability.saveObservabilityConfig);
  const sendTestEvent = useMutation(api.integrations.observability.sendTestEvent);

  const [secretInput, setSecretInput] = useState("");
  const [allowedServices, setAllowedServices] = useState("");
  const [allowedEnvironments, setAllowedEnvironments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const webhookUrl = buildWebhookUrl("observability", workspaceId);

  const servicesPlaceholder =
    linesFromList(observabilityStatus?.allowedServices) || "api, web, workers";
  const environmentsPlaceholder =
    linesFromList(observabilityStatus?.allowedEnvironments) || "production, staging";

  const statusLabel = useMemo(() => {
    if (observabilityStatus?.lastError || lastError) return "Error";
    return connected || observabilityStatus?.connected ? "Connected" : "Not connected";
  }, [connected, lastError, observabilityStatus]);

  const handleSaveSecret = useCallback(async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await saveSecret({ workspaceId, rawSecret: secretInput.trim() });
      setSecretInput("");
      setMessage("Signing secret saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save signing secret");
    } finally {
      setSaving(false);
    }
  }, [saveSecret, secretInput, workspaceId]);

  const handleSaveConfig = useCallback(async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await saveConfig({
        workspaceId,
        allowedServices: allowedServices.trim()
          ? listFromLines(allowedServices)
          : observabilityStatus?.allowedServices,
        allowedEnvironments: allowedEnvironments.trim()
          ? listFromLines(allowedEnvironments)
          : observabilityStatus?.allowedEnvironments,
      });
      setMessage("Capture settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save config");
    } finally {
      setSaving(false);
    }
  }, [allowedEnvironments, allowedServices, observabilityStatus, saveConfig, workspaceId]);

  return (
    <article className="source-card observability-source-card">
      <header className="source-card__header">
        <h3 className="source-card__title">Observability</h3>
        <span
          className={`source-card__status source-card__status--${statusLabel === "Connected" ? "connected" : "idle"}`}
        >
          {statusLabel}
        </span>
      </header>
      <p className="source-card__description">
        Ingest deploy, alert, and health signals from Sentry, Datadog, and custom observability
        webhooks into incidents and your timeline.
      </p>
      {eventCount !== undefined ? (
        <p className="source-card__meta">
          {eventCount} events
          {primaryEventCount !== undefined ? ` · ${primaryEventCount} primary` : ""}
          {lastEventAt ? ` · last ${formatEventTime(lastEventAt)}` : ""}
        </p>
      ) : null}
      {observabilityStatus?.maskedSecret ? (
        <p className="source-card__meta">Secret: {observabilityStatus.maskedSecret}</p>
      ) : null}
      <SetupBlock label="Webhook URL" code={webhookUrl} defaultOpen />
      {canManage ? (
        <div className="source-card__actions">
          <label className="source-card__field">
            Signing secret
            <input
              type="password"
              placeholder="Observability webhook signing secret"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
            />
          </label>
          <button type="button" disabled={saving || !secretInput.trim()} onClick={handleSaveSecret}>
            Save signing secret
          </button>
          <label className="source-card__field">
            Allowed services (comma or newline)
            <textarea
              rows={2}
              placeholder={servicesPlaceholder}
              value={allowedServices}
              onChange={(e) => setAllowedServices(e.target.value)}
            />
          </label>
          <label className="source-card__field">
            Allowed environments (comma or newline)
            <textarea
              rows={2}
              placeholder={environmentsPlaceholder}
              value={allowedEnvironments}
              onChange={(e) => setAllowedEnvironments(e.target.value)}
            />
          </label>
          <button type="button" disabled={saving} onClick={handleSaveConfig}>
            Save capture settings
          </button>
          {observabilityStatus?.connected ? (
            <button
              type="button"
              onClick={() => revokeSecret({ workspaceId }).catch(() => undefined)}
            >
              Revoke secret
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => sendTestEvent({ workspaceId }).then(() => setMessage("Test event sent."))}
          >
            Send test event
          </button>
        </div>
      ) : null}
      {error ? <p className="source-card__error">{error}</p> : null}
      {message ? <p className="source-card__message">{message}</p> : null}
      <SourceTimelineLink workspaceId={workspaceId} sourceKey="observability" />
    </article>
  );
}
