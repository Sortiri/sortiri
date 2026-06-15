"use client";

import Link from "next/link";
import type { RecommendationPriority, RecommendationRecord } from "@/types/recommendations";
import "./recommendations.css";

function priorityClass(priority: RecommendationPriority): string {
  if (priority === "critical") return "recommendation-badge recommendation-badge--critical";
  if (priority === "high") return "recommendation-badge recommendation-badge--high";
  return "recommendation-badge";
}

type RecommendationCardProps = {
  recommendation: RecommendationRecord;
};

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <article className="recommendation-card">
      <div className="recommendation-card__header">
        <div>
          <h3 className="recommendation-card__title">{recommendation.title}</h3>
          <p className="recommendation-card__summary">{recommendation.summary}</p>
        </div>
        <Link href={`/recommendations/${recommendation.id}`} className="recommendations-btn">
          Open
        </Link>
      </div>
      <div className="recommendation-card__meta">
        <span className={priorityClass(recommendation.priority)}>{recommendation.priority}</span>
        <span className="recommendation-badge">{recommendation.source}</span>
        <span className="recommendation-badge">{recommendation.type}</span>
      </div>
    </article>
  );
}
