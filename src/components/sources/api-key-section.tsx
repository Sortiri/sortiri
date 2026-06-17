"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatEventTime } from "@/lib/events/format";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { API_KEY_PREFIX } from "@/types/api-keys";
import { PageLoader } from "@/components/ui/page-loader";
import { SetupBlock } from "@/components/sources/setup-block";
import { getSortiriApiUrl } from "@/lib/sortiri/apiUrl";

type ApiKeySectionProps = {
  workspaceId: string;
  onRawKeyChange: (rawKey: string | null) => void;
};

export function ApiKeySection({ workspaceId, onRawKeyChange }: ApiKeySectionProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canCreate = capabilities?.canCreateApiKeys ?? false;
  const keys = useQuery(api.apiKeys.listByWorkspace, { workspaceId });
  const createKey = useMutation(api.apiKeys.create);
  const revokeKey = useMutation(api.apiKeys.revoke);

  const [name, setName] = useState("Default Ingest Key");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const apiUrl = getSortiriApiUrl();

  const envBlock = createdRawKey
    ? `SORTIRI_API_URL=${apiUrl}
SORTIRI_API_KEY=${createdRawKey}
# Optional when using workspace API keys:
# SORTIRI_WORKSPACE_ID=${workspaceId}`
    : "";

  const handleCreate = useCallback(async () => {
    setError(null);
    setCreating(true);
    try {
      const result = await createKey({
        workspaceId,
        name: name.trim() || "Default Ingest Key",
      });
      setCreatedRawKey(result.rawKey);
      onRawKeyChange(result.rawKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create API key");
    } finally {
      setCreating(false);
    }
  }, [createKey, name, onRawKeyChange, workspaceId]);

  const handleRevoke = useCallback(
    async (apiKeyId: string) => {
      setError(null);
      setRevokingId(apiKeyId);
      try {
        await revokeKey({ apiKeyId: apiKeyId as Id<"apiKeys"> });
        if (createdRawKey) {
          setCreatedRawKey(null);
          onRawKeyChange(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not revoke API key");
      } finally {
        setRevokingId(null);
      }
    },
    [createdRawKey, onRawKeyChange, revokeKey],
  );

  return (
    <section className="sources-section">
      <header className="sources-section__header">
        <h2 className="sources-section__title">Workspace API key</h2>
        <p className="sources-section__description">
          Create an ingest key for MCP, the CLI watcher, and the SDK. The full key is shown once.
        </p>
      </header>

      {error ? <p className="sources-section__error">{error}</p> : null}

      {!canCreate ? (
        <p className="sources-section__hint">Admin access required to create or revoke API keys.</p>
      ) : (
        <div className="api-key-create">
          <label className="api-key-create__label" htmlFor="api-key-name">
            Key name
          </label>
          <div className="api-key-create__row">
            <input
              id="api-key-name"
              className="api-key-create__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Default Ingest Key"
            />
            <button
              type="button"
              className="sources-button"
              onClick={() => void handleCreate()}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create key"}
            </button>
          </div>
        </div>
      )}

      {createdRawKey ? (
        <div className="api-key-reveal">
          <p className="api-key-reveal__warning">
            Copy this key now. You will not be able to see it again.
          </p>
          <SetupBlock label="API key" code={createdRawKey} defaultOpen />
          <SetupBlock label="Environment variables" code={envBlock} defaultOpen />
        </div>
      ) : null}

      {keys === undefined ? (
        <PageLoader variant="section" />
      ) : keys.length > 0 ? (
        <div className="api-key-table-wrap">
          <table className="api-key-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Status</th>
                <th>Last used</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td>
                    <code>
                      {key.keyPrefix}_••••{key.last4}
                    </code>
                  </td>
                  <td>
                    <span
                      className={`api-key-table__status api-key-table__status--${key.status}`}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td>{key.lastUsedAt ? formatEventTime(key.lastUsedAt) : "—"}</td>
                  <td>{formatEventTime(key.createdAt)}</td>
                  <td>
                    {key.status === "active" && canCreate ? (
                      <button
                        type="button"
                        className="sources-button sources-button--ghost"
                        disabled={revokingId === key.id}
                        onClick={() => void handleRevoke(key.id)}
                      >
                        {revokingId === key.id ? "Revoking…" : "Revoke"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sources-section__empty">No API keys yet.</p>
      )}

      <p className="sources-section__hint">
        Keys use the <code>{API_KEY_PREFIX}_</code> prefix and are verified on every ingest request.
      </p>
    </section>
  );
}
