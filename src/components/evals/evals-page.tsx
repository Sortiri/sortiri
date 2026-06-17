"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { EvalFilters } from "@/components/evals/eval-filters";
import { EvalSuiteCard } from "@/components/evals/eval-suite-card";
import { PageLoader } from "@/components/ui/page-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { EvalSuiteFilters, EvalSuiteRecord } from "@/types/evals";
import "./evals.css";

export function EvalsPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const [filters, setFilters] = useState<EvalSuiteFilters>({ status: "active" });

  const suites = useQuery(
    api.evals.listSuites,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          status: filters.status === "all" ? undefined : filters.status,
          source: filters.source === "all" ? undefined : filters.source,
          limit: 100,
        }
      : "skip",
  );

  const filtered = useMemo(() => (suites ?? []) as EvalSuiteRecord[], [suites]);
  const loading = wsLoading || (activeWorkspaceId !== null && suites === undefined);

  return (
    <div className="evals-page">
      <header className="evals-page__header">
        <Link href="/intelligence">← Back to Intelligence</Link>
        <h1 className="evals-page__title">Private Evals</h1>
        <p className="evals-page__subtitle">
          Workspace-scoped validation suites generated from playbooks, lessons, recommendations,
          and context packs.
        </p>
      </header>

      <EvalFilters filters={filters} onChange={setFilters} />

      {loading ? <PageLoader variant="inline" /> : null}
      {!loading && filtered.length === 0 ? (
        <p className="evals-page__subtitle">No eval suites match these filters.</p>
      ) : null}

      <div className="evals-list">
        {filtered.map((suite) => (
          <EvalSuiteCard key={suite.id} suite={suite} />
        ))}
      </div>
    </div>
  );
}
