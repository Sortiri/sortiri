"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { formatContextPackForCursor } from "@/lib/context/copyForCursor";
import type { ContextPackItemRecord, ContextPackRecord } from "@/types/context-packs";
import "./context.css";

const SECTION_ORDER: Array<{ type: ContextPackItemRecord["itemType"]; title: string }> = [
  { type: "playbook", title: "Recommended Playbook" },
  { type: "lesson", title: "Relevant Lessons" },
  { type: "decision", title: "Relevant Decisions" },
  { type: "workstream", title: "Related Workstreams" },
  { type: "entity", title: "Related Files / Entities" },
  { type: "known_failure", title: "Known Failures" },
  { type: "impact_analysis", title: "Impact Context" },
  { type: "insight", title: "Insights" },
  { type: "validation_requirement", title: "Validation Requirements" },
  { type: "artifact", title: "Evidence" },
  { type: "event", title: "Related Events" },
];

type ContextPackDetailPageProps = {
  contextPackId: string;
};

export function ContextPackDetailPage({ contextPackId }: ContextPackDetailPageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const archivePack = useMutation(api.contextPacks.archive);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatted = useQuery(api.contextPacks.getFormatted, {
    contextPackId: contextPackId as Id<"contextPacks">,
  });

  const pack = formatted?.pack as ContextPackRecord | undefined;
  const items = (formatted?.items ?? []) as ContextPackItemRecord[];

  const grouped = useMemo(() => {
    return SECTION_ORDER.map((section) => ({
      ...section,
      items: items.filter((item) => item.itemType === section.type),
    })).filter((section) => section.items.length > 0);
  }, [items]);

  const handleCopy = useCallback(async () => {
    if (!formatted) return;
    await navigator.clipboard.writeText(formatContextPackForCursor(formatted));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [formatted]);

  const handleArchive = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await archivePack({ contextPackId: contextPackId as Id<"contextPacks"> });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive context pack");
    } finally {
      setBusy(false);
    }
  }, [archivePack, contextPackId]);

  if (formatted === undefined) {
    return <p className="context-page__subtitle">Loading context pack…</p>;
  }

  if (!pack) {
    return (
      <div className="context-page">
        <p>Context pack not found.</p>
        <Link href="/context">← Back to Agent Context</Link>
      </div>
    );
  }

  return (
    <div className="context-page">
      <Link href="/context">← Back to Agent Context</Link>
      <header className="context-page__header">
        <h1 className="context-page__title">{pack.title}</h1>
        <p className="context-page__subtitle">{pack.goal}</p>
        {pack.summary ? <p className="context-page__subtitle">{pack.summary}</p> : null}
        <div className="context-page__actions">
          <button type="button" className="context-btn" onClick={() => void handleCopy()}>
            {copied ? "Copied" : "Copy for Cursor"}
          </button>
          <Link href={`/ask?contextPackId=${pack.id}`} className="context-btn">
            Ask about this context
          </Link>
          {canWrite ? (
            <button
              type="button"
              className="context-btn"
              onClick={() => void handleArchive()}
              disabled={busy}
            >
              Archive
            </button>
          ) : null}
        </div>
        {error ? <p className="context-page__subtitle">{error}</p> : null}
      </header>

      {grouped.map((section) => (
        <section key={section.type} className="context-detail__section">
          <h2 className="context-detail__section-title">{section.title}</h2>
          {section.items.map((item) => (
            <div key={item.id} className="context-detail__item">
              <p className="context-detail__item-title">{item.title}</p>
              {item.summary ? (
                <p className="context-detail__item-summary">{item.summary}</p>
              ) : null}
              {item.reason ? (
                <p className="context-detail__item-summary">{item.reason}</p>
              ) : null}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
