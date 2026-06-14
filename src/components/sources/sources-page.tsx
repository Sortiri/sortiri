"use client";

import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { AdvancedApiKeySection } from "@/components/sources/advanced-api-key-section";
import { CliSetupSection } from "@/components/sources/cli-setup-section";
import { SourceSetupCard } from "@/components/sources/source-setup-card";
import { GithubSourceCard } from "@/components/sources/github-source-card";
import { TestEventButton } from "@/components/sources/test-event-button";
import "./sources.css";

const COMING_SOON_SOURCES = ["Stripe", "PostHog", "Slack", "Linear"] as const;

function buildSdkExample() {
  return `import { Sortiri } from "@sortiri/sdk";

const sortiri = new Sortiri({
  apiUrl: process.env.SORTIRI_API_URL!,
  apiKey: process.env.SORTIRI_API_KEY!,
});

await sortiri.track({
  type: "user.signed_up",
  userId: "user_123",
  properties: { plan: "free" },
});`;
}

export function SourcesPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const [sessionRawKey, setSessionRawKey] = useState<string | null>(null);

  const sourceStatus = useQuery(
    api.sources.getSourceStatus,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const statusBySource = useMemo(() => {
    const map = new Map<string, (typeof sourceStatus extends (infer T)[] | undefined ? T : never)>();
    for (const item of sourceStatus ?? []) {
      map.set(item.source, item);
    }
    return map;
  }, [sourceStatus]);

  const loading =
    wsLoading || (activeWorkspaceId !== null && sourceStatus === undefined);

  const sdkExample = buildSdkExample();

  return (
    <div className="sources-page">
      <header className="sources-page__header">
        <h1 className="sources-page__title">Sources</h1>
        <p className="sources-page__subtitle">
          Connect agents, product events, and company decisions to your timeline.
        </p>
      </header>

      {loading ? <p className="sources-page__loading">Loading sources…</p> : null}

      {activeWorkspaceId ? (
        <>
          <CliSetupSection workspaceId={activeWorkspaceId} />

          <section className="sources-section">
            <header className="sources-section__header">
              <h2 className="sources-section__title">Install sources</h2>
              <p className="sources-section__description">
                Run sortiri init once, then start recording from Cursor, your repo, or your app.
              </p>
            </header>

            <div className="sources-list">
              <SourceSetupCard
                title="Cursor MCP"
                description="Record agent workstreams and actions from Cursor via the Sortiri MCP server."
                connected={statusBySource.get("cursor")?.connected ?? false}
                eventCount={statusBySource.get("cursor")?.eventCount}
                lastEventAt={statusBySource.get("cursor")?.lastEventAt}
                workspaceId={activeWorkspaceId}
                sourceKey="cursor"
                setupLabel="Setup"
                setupCode={`# Initialize Sortiri in your repo (creates API key + MCP config)
npx sortiri init

# Verify setup
npx sortiri doctor`}
              />

              <SourceSetupCard
                title="Local watcher"
                description="Capture file changes from your repo with the CLI watcher."
                connected={statusBySource.get("watcher")?.connected ?? false}
                eventCount={statusBySource.get("watcher")?.eventCount}
                lastEventAt={statusBySource.get("watcher")?.lastEventAt}
                workspaceId={activeWorkspaceId}
                sourceKey="watcher"
                setupLabel="Start watcher"
                setupCode={`npx sortiri init
npx sortiri dev`}
              />

              <SourceSetupCard
                title="Sortiri CLI"
                description="Capture command runs, validation output, doctor checks, and local CLI events."
                connected={statusBySource.get("cli")?.connected ?? false}
                eventCount={statusBySource.get("cli")?.eventCount}
                lastEventAt={statusBySource.get("cli")?.lastEventAt}
                workspaceId={activeWorkspaceId}
                sourceKey="cli"
                setupLabel="Run commands"
                setupCode={`sortiri run -- npm run build
sortiri run -- npm test
sortiri run -- npx tsc --noEmit`}
              />

              <SourceSetupCard
                title="TypeScript SDK"
                description="Send product events, revenue events, and company decisions from your app."
                connected={statusBySource.get("sdk")?.connected ?? false}
                eventCount={statusBySource.get("sdk")?.eventCount}
                lastEventAt={statusBySource.get("sdk")?.lastEventAt}
                workspaceId={activeWorkspaceId}
                sourceKey="sdk"
                setupLabel="SDK example"
                setupCode={`npm install @sortiri/sdk

${sdkExample}`}
              />

              <SourceSetupCard
                title="Manual events"
                description="Events recorded manually or from internal tools appear with source manual."
                connected={statusBySource.get("manual")?.connected ?? false}
                eventCount={statusBySource.get("manual")?.eventCount}
                lastEventAt={statusBySource.get("manual")?.lastEventAt}
                workspaceId={activeWorkspaceId}
                sourceKey="manual"
                setupLabel="Note"
                setupCode="Manual and UI-created events use source: manual. No extra setup required."
              />

              <GithubSourceCard
                workspaceId={activeWorkspaceId}
                connected={statusBySource.get("github")?.connected ?? false}
                eventCount={statusBySource.get("github")?.eventCount}
                lastEventAt={statusBySource.get("github")?.lastEventAt}
              />

              {COMING_SOON_SOURCES.map((name) => (
                <SourceSetupCard
                  key={name}
                  title={name}
                  description={`${name} integration will sync events into your timeline.`}
                  connected={false}
                  setupLabel=""
                  setupCode=""
                  comingSoon
                />
              ))}
            </div>
          </section>

          <AdvancedApiKeySection
            workspaceId={activeWorkspaceId}
            onRawKeyChange={setSessionRawKey}
          />

          <TestEventButton apiKey={sessionRawKey} />
        </>
      ) : !loading ? (
        <p className="sources-section__empty">Select a workspace to manage sources.</p>
      ) : null}
    </div>
  );
}
