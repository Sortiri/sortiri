"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatEventTime } from "@/lib/events/format";
import { WEBHOOK_SECRET_PREFIX } from "@/types/github-integration";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SourceTimelineLink } from "@/components/sources/source-timeline-link";
import { SetupBlock } from "@/components/sources/setup-block";

type GithubSourceCardProps = {
  workspaceId: string;
  connected: boolean;
  eventCount?: number;
  lastEventAt?: number;
};

export function GithubSourceCard({
  workspaceId,
  connected,
  eventCount,
  lastEventAt,
}: GithubSourceCardProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canManage = capabilities?.canManageSources ?? false;
  const secrets = useQuery(api.integrations.github.listWebhookSecrets, { workspaceId });
  const createSecret = useMutation(api.integrations.github.createWebhookSecret);
  const revokeSecret = useMutation(api.integrations.github.revokeWebhookSecret);
  const sendTestEvent = useMutation(api.integrations.github.sendTestEvent);

  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createdRawSecret, setCreatedRawSecret] = useState<string | null>(null);

  const apiUrl =
    typeof window !== "undefined" ? window.location.origin : "https://your-sortiri-app.com";

  const webhookUrl = `${apiUrl}/api/integrations/github/webhook?workspaceId=${workspaceId}`;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create webhook secret");
    } finally {
      setCreating(false);
    }
  }, [createSecret, workspaceId]);

  const handleRevoke = useCallback(
    async (secretId: string) => {
      setError(null);
      setRevokingId(secretId);
      try {
        await revokeSecret({ secretId: secretId as Id<"githubWebhookSecrets"> });
        setCreatedRawSecret(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke webhook secret");
      } finally {
        setRevokingId(null);
      }
    },
    [revokeSecret],
  );

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

  return (
    <article className="source-card github-source-card">
      <div className="source-card__header">
        <h3 className="source-card__title">GitHub</h3>
        <span
          className={`source-card__status${
            connected ? " source-card__status--connected" : ""
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <p className="source-card__description">
        Track pull requests, commits, issues, and merges in your company timeline.
      </p>

      {connected ? (
        <div className="source-card__stats">
          <p>Events recorded: {eventCount ?? 0}</p>
          <p>Last event: {lastEventAt ? formatEventTime(lastEventAt) : "—"}</p>
          <SourceTimelineLink workspaceId={workspaceId} sourceKey="github" />
        </div>
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

      {secrets === undefined ? (
        <p className="sources-section__loading">Loading webhook secrets…</p>
      ) : secrets.length > 0 ? (
        <div className="api-key-table-wrap">
          <table className="api-key-table">
            <thead>
              <tr>
                <th>Secret</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {secrets.map((secret) => (
                <tr key={secret.id}>
                  <td>
                    <code>
                      {WEBHOOK_SECRET_PREFIX}_••••{secret.last4}
                    </code>
                  </td>
                  <td>
                    <span
                      className={`api-key-table__status api-key-table__status--${secret.status}`}
                    >
                      {secret.status}
                    </span>
                  </td>
                  <td>{formatEventTime(secret.createdAt)}</td>
                  <td>
                    {secret.status === "active" && canManage ? (
                      <button
                        type="button"
                        className="sources-button sources-button--ghost"
                        disabled={revokingId === secret.id}
                        onClick={() => void handleRevoke(secret.id)}
                      >
                        {revokingId === secret.id ? "Revoking…" : "Revoke"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sources-section__empty">No webhook secrets yet.</p>
      )}
    </article>
  );
}
