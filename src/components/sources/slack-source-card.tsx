"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatEventTime } from "@/lib/events/format";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SourceTimelineLink } from "@/components/sources/source-timeline-link";
import { SetupBlock } from "@/components/sources/setup-block";
import { buildWebhookUrl } from "@/lib/sortiri/apiUrl";

type SlackSourceCardProps = {
  workspaceId: string;
  connected: boolean;
  eventCount?: number;
  lastEventAt?: number;
  primaryEventCount?: number;
  lastError?: string;
};

const CAPTURE_MODES = [
  { value: "manual_mentions_only", label: "Manual mentions only (recommended)" },
  { value: "decision_keywords", label: "Decision keywords" },
  { value: "selected_channels", label: "Selected channels" },
] as const;

export function SlackSourceCard({
  workspaceId,
  connected,
  eventCount,
  lastEventAt,
  primaryEventCount,
  lastError,
}: SlackSourceCardProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canManage = capabilities?.canManageSources ?? false;
  const slackStatus = useQuery(api.integrations.slack.getSlackStatus, { workspaceId });
  const saveSecret = useMutation(api.integrations.slack.saveSigningSecret);
  const revokeSecret = useMutation(api.integrations.slack.revokeSigningSecret);
  const saveConfig = useMutation(api.integrations.slack.saveSlackConfig);
  const sendTestEvent = useMutation(api.integrations.slack.sendTestEvent);

  const [secretInput, setSecretInput] = useState("");
  const [channelIds, setChannelIds] = useState("");
  const [captureMode, setCaptureMode] = useState<string>("manual_mentions_only");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const webhookUrl = buildWebhookUrl("slack", workspaceId);

  const statusLabel = useMemo(() => {
    if (slackStatus?.lastError || lastError) return "Error";
    return connected || slackStatus?.connected ? "Connected" : "Not connected";
  }, [connected, lastError, slackStatus]);

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
        captureMode: captureMode as "manual_mentions_only" | "decision_keywords" | "selected_channels",
        allowedChannelIds: channelIds
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setMessage("Capture settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save config");
    } finally {
      setSaving(false);
    }
  }, [captureMode, channelIds, saveConfig, workspaceId]);

  return (
    <article className="source-card slack-source-card">
      <header className="source-card__header">
        <h3 className="source-card__title">Slack</h3>
        <span className={`source-card__status source-card__status--${statusLabel === "Connected" ? "connected" : "idle"}`}>
          {statusLabel}
        </span>
      </header>
      <p className="source-card__description">
        Capture company decisions, rollbacks, and important team context from selected channels.
      </p>
      {eventCount !== undefined ? (
        <p className="source-card__meta">
          {eventCount} events
          {primaryEventCount !== undefined ? ` · ${primaryEventCount} primary` : ""}
          {lastEventAt ? ` · last ${formatEventTime(lastEventAt)}` : ""}
        </p>
      ) : null}
      {slackStatus?.maskedSecret ? (
        <p className="source-card__meta">Secret: {slackStatus.maskedSecret}</p>
      ) : null}
      <SetupBlock label="Webhook URL" code={webhookUrl} defaultOpen />
      {canManage ? (
        <div className="source-card__actions">
          <label className="source-card__field">
            Signing secret
            <input
              type="password"
              placeholder="Slack app signing secret"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
            />
          </label>
          <button type="button" disabled={saving || !secretInput.trim()} onClick={handleSaveSecret}>
            Save signing secret
          </button>
          <label className="source-card__field">
            Capture mode
            <select value={captureMode} onChange={(e) => setCaptureMode(e.target.value)}>
              {CAPTURE_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="source-card__field">
            Allowed channel IDs (comma or newline)
            <textarea
              rows={2}
              placeholder="C01234567"
              value={channelIds}
              onChange={(e) => setChannelIds(e.target.value)}
            />
          </label>
          <button type="button" disabled={saving} onClick={handleSaveConfig}>
            Save capture settings
          </button>
          {slackStatus?.connected ? (
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
      <SourceTimelineLink workspaceId={workspaceId} sourceKey="slack" />
    </article>
  );
}
