"use client";

import Link from "next/link";
import "./home.css";

export function HomeEmptyState() {
  return (
    <div className="home-empty-state">
      <h2 className="home-empty-state__title">Start building your company timeline</h2>
      <p className="home-empty-state__body">
        Connect your first source to begin recording agent actions, product events, and
        company decisions.
      </p>
      <div className="home-empty-state__actions">
        <Link href="/sources" className="home-empty-state__link">
          Open Sources
        </Link>
        <Link href="/api-keys" className="home-empty-state__link">
          Create API Key
        </Link>
        <Link href="/sources" className="home-empty-state__link">
          View Install Guide
        </Link>
      </div>
    </div>
  );
}
