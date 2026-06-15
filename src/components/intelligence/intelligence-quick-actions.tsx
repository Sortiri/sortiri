"use client";

import Link from "next/link";
import "./intelligence.css";

export function IntelligenceQuickActions() {
  return (
    <section className="intelligence-section">
      <h2 className="intelligence-section__title">Quick Actions</h2>
      <div className="intelligence-quick-actions">
        <Link href="/insights" className="intelligence-quick-actions__link">
          Generate Insight Report
        </Link>
        <Link href="/impact" className="intelligence-quick-actions__link">
          New Impact Analysis
        </Link>
        <Link href="/lessons" className="intelligence-quick-actions__link">
          View Lessons
        </Link>
        <Link href="/playbooks" className="intelligence-quick-actions__link">
          View Playbooks
        </Link>
      </div>
    </section>
  );
}
