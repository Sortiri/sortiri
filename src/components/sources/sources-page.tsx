"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { AdvancedApiKeySection } from "@/components/sources/advanced-api-key-section";
import { CliSetupSection } from "@/components/sources/cli-setup-section";
import { SourceSetupCard } from "@/components/sources/source-setup-card";
import { GithubSourceCard } from "@/components/sources/github-source-card";
import { SlackSourceCard } from "@/components/sources/slack-source-card";
import { ObservabilitySourceCard } from "@/components/sources/observability-source-card";
import { StripeSourceCard } from "@/components/sources/stripe-source-card";
import { PosthogSourceCard } from "@/components/sources/posthog-source-card";
import { SourcesSubnav } from "@/components/sources/sources-subnav";
import { SourcesHealthSummary } from "@/components/sources/sources-health-summary";
import { TestEventButton } from "@/components/sources/test-event-button";
import {
  PlatformHubHeader,
  PlatformPage,
} from "@/components/platform";
import "./sources.css";

const COMING_SOON_SOURCES = ["Linear"] as const;

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

  const sourceHealth = useQuery(
    api.integrations.health.getSourceHealth,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  );

  const healthBySource = useMemo(() => {
    const map = new Map<string, (typeof sourceHealth extends (infer T)[] | undefined ? T : never)>();
    for (const item of sourceHealth ?? []) {
      map.set(item.source, item);
    }
    return map;
  }, [sourceHealth]);

  const loading =
    wsLoading || (activeWorkspaceId !== null && sourceHealth === undefined);

  const sdkExample = buildSdkExample();

  function isConnected(source: string): boolean {
    const entry = healthBySource.get(source);
    return entry?.status === "connected" || entry?.status === "error";
  }

  const healthSummary = useMemo(() => {
    const entries = sourceHealth ?? [];
    const connected = entries.filter((e) => e.status === "connected").length;
    const healthy = entries.filter(
      (e) => e.status === "connected" && e.deliveryHealth !== "degraded" && e.deliveryHealth !== "error",
    ).length;
    const degraded = entries.filter(
      (e) => e.status === "error" || e.deliveryHealth === "degraded" || e.deliveryHealth === "error",
    ).length;
    const deadLetters = entries.reduce((sum, e) => sum + (e.deadLetters ?? 0), 0);
    const lastDelivery = entries.reduce(
      (max, e) => Math.max(max, e.lastSuccessfulDeliveryAt ?? e.lastEventAt ?? 0),
      0,
    );
    return { connected, healthy, degraded, deadLetters, lastDelivery };
  }, [sourceHealth]);

  return (
    <PlatformPage className="sources-page">
      <PlatformHubHeader
        title="Sources"
        subtitle="Connect agents, repos, product events, revenue, decisions, observability, and webhooks to your timeline."
        subnav={<SourcesSubnav />}
      />

      {loading ? <PageLoader variant="inline" /> : null}

      {!loading && sourceHealth ? (
        <SourcesHealthSummary
          items={[
            { label: "Connected sources", value: healthSummary.connected },
            { label: "Healthy", value: healthSummary.healthy },
            { label: "Degraded", value: healthSummary.degraded },
            { label: "Dead letters", value: healthSummary.deadLetters },
            {
              label: "Last delivery",
              value: healthSummary.lastDelivery
                ? new Date(healthSummary.lastDelivery).toLocaleDateString()
                : "—",
            },
          ]}
        />
      ) : null}

      {activeWorkspaceId ? (
        <>
          <section id="connections" className="source-groups">
            <section className="source-group">
              <header className="sources-section__header">
                <h2 className="source-group__title">Developer tools</h2>
                <p className="sources-section__description">
                  Run sortiri init once, then start recording from Cursor, your repo, or your app.
                </p>
              </header>
              <CliSetupSection workspaceId={activeWorkspaceId} />
              <div className="source-group__grid">
                <SourceSetupCard
                  title="Cursor MCP"
                  description="Record agent workstreams and actions from Cursor via the Sortiri MCP server."
                  connected={isConnected("cursor")}
                  eventCount={healthBySource.get("cursor")?.eventCount}
                  lastEventAt={healthBySource.get("cursor")?.lastEventAt}
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
                  connected={isConnected("watcher")}
                  eventCount={healthBySource.get("watcher")?.eventCount}
                  lastEventAt={healthBySource.get("watcher")?.lastEventAt}
                  workspaceId={activeWorkspaceId}
                  sourceKey="watcher"
                  setupLabel="Start watcher"
                  setupCode={`npx sortiri init
npx sortiri dev`}
                />

                <SourceSetupCard
                  title="Sortiri CLI"
                  description="Capture command runs, validation output, doctor checks, and local CLI events."
                  connected={isConnected("cli")}
                  eventCount={healthBySource.get("cli")?.eventCount}
                  lastEventAt={healthBySource.get("cli")?.lastEventAt}
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
                  connected={isConnected("sdk")}
                  eventCount={healthBySource.get("sdk")?.eventCount}
                  lastEventAt={healthBySource.get("sdk")?.lastEventAt}
                  workspaceId={activeWorkspaceId}
                  sourceKey="sdk"
                  setupLabel="SDK example"
                  setupCode={`npm install @sortiri/sdk

${sdkExample}`}
                />

                <SourceSetupCard
                  title="Manual events"
                  description="Events recorded manually or from internal tools appear with source manual."
                  connected={isConnected("manual")}
                  eventCount={healthBySource.get("manual")?.eventCount}
                  lastEventAt={healthBySource.get("manual")?.lastEventAt}
                  workspaceId={activeWorkspaceId}
                  sourceKey="manual"
                  setupLabel="Note"
                  setupCode="Manual and UI-created events use source: manual. No extra setup required."
                />
              </div>
            </section>

            <div id="webhooks">
              <section className="source-group">
                <h2 className="source-group__title">Code</h2>
                <div className="source-group__grid">
                  <GithubSourceCard
                    workspaceId={activeWorkspaceId}
                    connected={isConnected("github")}
                    eventCount={healthBySource.get("github")?.eventCount}
                    lastEventAt={healthBySource.get("github")?.lastEventAt}
                    primaryEventCount={healthBySource.get("github")?.primaryEventCount}
                    lastError={healthBySource.get("github")?.lastError}
                  />
                </div>
              </section>

              <section className="source-group">
                <h2 className="source-group__title">Product</h2>
                <div className="source-group__grid">
                  <PosthogSourceCard
                    workspaceId={activeWorkspaceId}
                    connected={isConnected("posthog")}
                    eventCount={healthBySource.get("posthog")?.eventCount}
                    lastEventAt={healthBySource.get("posthog")?.lastEventAt}
                    primaryEventCount={healthBySource.get("posthog")?.primaryEventCount}
                    lastError={healthBySource.get("posthog")?.lastError}
                  />
                </div>
              </section>

              <section className="source-group">
                <h2 className="source-group__title">Revenue</h2>
                <div className="source-group__grid">
                  <StripeSourceCard
                    workspaceId={activeWorkspaceId}
                    connected={isConnected("stripe")}
                    eventCount={healthBySource.get("stripe")?.eventCount}
                    lastEventAt={healthBySource.get("stripe")?.lastEventAt}
                    primaryEventCount={healthBySource.get("stripe")?.primaryEventCount}
                    lastError={healthBySource.get("stripe")?.lastError}
                  />
                </div>
              </section>

              <section className="source-group">
                <h2 className="source-group__title">Decisions</h2>
                <div className="source-group__grid">
                  <SlackSourceCard
                    workspaceId={activeWorkspaceId}
                    connected={isConnected("slack")}
                    eventCount={healthBySource.get("slack")?.eventCount}
                    lastEventAt={healthBySource.get("slack")?.lastEventAt}
                    primaryEventCount={healthBySource.get("slack")?.primaryEventCount}
                    lastError={healthBySource.get("slack")?.lastError}
                  />
                </div>
              </section>

              <section className="source-group">
                <h2 className="source-group__title">Observability</h2>
                <div className="source-group__grid">
                  <ObservabilitySourceCard
                    workspaceId={activeWorkspaceId}
                    connected={isConnected("observability")}
                    eventCount={healthBySource.get("observability")?.eventCount}
                    lastEventAt={healthBySource.get("observability")?.lastEventAt}
                    primaryEventCount={healthBySource.get("observability")?.primaryEventCount}
                    lastError={healthBySource.get("observability")?.lastError}
                  />
                </div>
              </section>
            </div>

            <section className="source-group">
              <h2 className="source-group__title">Reliability</h2>
              <div className="source-group__grid">
                <section className="sources-section">
                  <p className="sources-section__description">
                    Monitor ingest deliveries, dead letters, and replay failed events.
                  </p>
                  <Link href="/sources/reliability">Open ingest reliability</Link>
                </section>
              </div>
            </section>

            <section className="source-group">
              <h2 className="source-group__title">Coming soon</h2>
              <div className="source-group__grid">
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
          </section>

          <div id="api-keys">
            <AdvancedApiKeySection
              workspaceId={activeWorkspaceId}
              onRawKeyChange={setSessionRawKey}
            />
          </div>

          <TestEventButton apiKey={sessionRawKey} />
        </>
      ) : !loading ? (
        <p className="sources-section__empty">Select a workspace to manage sources.</p>
      ) : null}
    </PlatformPage>
  );
}
