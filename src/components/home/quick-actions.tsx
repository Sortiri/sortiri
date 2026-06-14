"use client";

import Link from "next/link";
import "./home.css";

export function QuickActions() {
  return (
    <div className="quick-actions">
      <Link href="/ask?q=What%20happened%20today%3F" className="quick-actions__link">
        Ask what happened
      </Link>
      <Link href="/timeline" className="quick-actions__link">
        View timeline
      </Link>
      <Link href="/insights" className="quick-actions__link">
        View insights
      </Link>
      <Link href="/sources" className="quick-actions__link">
        Open sources
      </Link>
    </div>
  );
}
