"use client";

import Link from "next/link";
import "./evals.css";

type IntelligencePrivateEvalsSectionProps = {
  evalSummary: {
    activeCount: number;
    latestRunStatus?: string;
    latestTitle?: string;
    latestAt?: number;
  };
  recentEvalSuites: Array<{
    id: string;
    title: string;
    summary: string;
    source: string;
    createdAt: number;
  }>;
};

export function IntelligencePrivateEvalsSection({
  evalSummary,
  recentEvalSuites,
}: IntelligencePrivateEvalsSectionProps) {
  return (
    <section className="eval-hub-section">
      <h2 className="eval-hub-section__title">Private Evals</h2>
      <p className="evals-page__subtitle">
        {evalSummary.activeCount} active eval suite{evalSummary.activeCount === 1 ? "" : "s"}
        {evalSummary.latestRunStatus ? ` · Latest run: ${evalSummary.latestRunStatus}` : ""}
        {evalSummary.latestTitle ? ` · Latest: ${evalSummary.latestTitle}` : ""}
      </p>
      <div className="evals-page__actions">
        <Link href="/intelligence/evals" className="evals-btn">
          Open Evals
        </Link>
      </div>
      {recentEvalSuites.length > 0 ? (
        <ul className="eval-hub-section__list">
          {recentEvalSuites.map((suite) => (
            <li key={suite.id}>
              <Link href={`/intelligence/evals/${suite.id}`}>{suite.title}</Link>
              <span className="evals-page__subtitle"> — {suite.source}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="evals-page__subtitle">No active eval suites yet.</p>
      )}
    </section>
  );
}
