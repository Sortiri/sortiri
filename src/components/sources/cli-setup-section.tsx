"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { formatEventTime } from "@/lib/events/format";
import { SETUP_TOKEN_PREFIX } from "@/types/cli-setup";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { SetupBlock } from "@/components/sources/setup-block";

type CliSetupSectionProps = {
  workspaceId: string;
};

export function CliSetupSection({ workspaceId }: CliSetupSectionProps) {
  const { capabilities } = useWorkspaceMembership(workspaceId);
  const canCreate = capabilities?.canCreateApiKeys ?? false;
  const createToken = useMutation(api.cliSetup.createToken);
  const cliStatus = useQuery(api.projects.getCliSetupStatus, { workspaceId });

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const secondsLeft =
    expiresAt === null
      ? null
      : Math.max(0, Math.floor((expiresAt - now) / 1000));

  const handleCreate = useCallback(async () => {
    setError(null);
    setCreating(true);
    try {
      const result = await createToken({ workspaceId });
      setRawToken(result.rawToken);
      setExpiresAt(result.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create setup token");
    } finally {
      setCreating(false);
    }
  }, [createToken, workspaceId]);

  const initCommand = rawToken
    ? `npx sortiri init --token ${rawToken}`
    : "npx sortiri init";

  return (
    <section className="sources-section">
      <header className="sources-section__header">
        <h2 className="sources-section__title">Install Sortiri CLI</h2>
        <p className="sources-section__description">
          Create a one-time setup token and run sortiri init in your project.
        </p>
      </header>

      {cliStatus?.connected ? (
        <div className="sources-cli-status">
          <p className="sources-section__success">CLI Project Setup — Connected</p>
          {cliStatus.projectName ? (
            <p className="sources-section__hint">Project: {cliStatus.projectName}</p>
          ) : null}
          {cliStatus.lastCliEventAt ? (
            <p className="sources-section__hint">
              Last CLI event: {formatEventTime(cliStatus.lastCliEventAt)}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="sources-button"
        onClick={() => void handleCreate()}
        disabled={creating || !canCreate}
      >
        {creating ? "Creating…" : "Create setup token"}
      </button>
      {!canCreate ? (
        <p className="sources-section__hint">Admin access required to create setup tokens.</p>
      ) : null}

      {error ? <p className="sources-section__error">{error}</p> : null}

      {rawToken ? (
        <div className="sources-cli-token-reveal">
          <p className="sources-section__success">
            Copy this token now. It expires in 10 minutes
            {secondsLeft !== null ? ` (${secondsLeft}s remaining)` : ""}.
          </p>

          <SetupBlock
            label="Setup token"
            code={`${rawToken}`}
            defaultOpen
          />

          <SetupBlock
            label="Run in your project"
            code={`npx sortiri init`}
            defaultOpen
          />

          <SetupBlock
            label="Or pass token directly"
            code={initCommand}
            defaultOpen
          />

          <p className="sources-section__hint">
            Token prefix: {SETUP_TOKEN_PREFIX}_…
          </p>
        </div>
      ) : null}

      <p className="sources-section__hint">
        After init, run <code>npx sortiri doctor</code> then <code>npx sortiri dev</code>.
        Re-run init or update <code>.cursor/rules/sortiri.mdc</code> to get the latest agent guidance.
      </p>
    </section>
  );
}
