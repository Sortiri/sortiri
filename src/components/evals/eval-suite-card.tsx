"use client";

import Link from "next/link";
import type { EvalSuitePriority, EvalSuiteRecord } from "@/types/evals";
import "./evals.css";

function priorityClass(priority: EvalSuitePriority): string {
  if (priority === "critical") return "eval-badge eval-badge--critical";
  if (priority === "high") return "eval-badge eval-badge--high";
  return "eval-badge";
}

type EvalSuiteCardProps = {
  suite: EvalSuiteRecord;
};

export function EvalSuiteCard({ suite }: EvalSuiteCardProps) {
  return (
    <article className="eval-suite-card">
      <div className="eval-suite-card__header">
        <div>
          <h3 className="eval-suite-card__title">{suite.title}</h3>
          <p className="eval-suite-card__summary">{suite.summary}</p>
        </div>
        <Link href={`/intelligence/evals/${suite.id}`} className="evals-btn">
          Open
        </Link>
      </div>
      <div className="eval-suite-card__meta">
        <span className={priorityClass(suite.priority)}>{suite.priority}</span>
        <span className="eval-badge">{suite.source}</span>
        <span className="eval-badge">{suite.status}</span>
      </div>
    </article>
  );
}
