"use client";

import Link from "next/link";
import "./intelligence.css";

export function IntelligenceEmptyState() {
  return (
    <div className="intelligence-empty-state">
      <p className="intelligence-empty-state__text">
        Your intelligence layer will appear here once Sortiri has enough timeline data to detect
        signals, analyze impact, generate lessons, and create playbooks.
      </p>
      <div className="intelligence-quick-actions">
        <Link href="/timeline" className="intelligence-quick-actions__link">
          Open Timeline
        </Link>
        <Link href="/impact" className="intelligence-quick-actions__link">
          Create Impact Analysis
        </Link>
        <Link href="/sources" className="intelligence-quick-actions__link">
          Open Sources
        </Link>
      </div>
    </div>
  );
}
