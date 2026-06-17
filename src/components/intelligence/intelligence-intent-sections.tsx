"use client";

import Link from "next/link";
import type { IntelligenceHubResult } from "../../../convex/intelligenceHub";
import {
  INTELLIGENCE_TAB_HREFS,
  INTELLIGENCE_TAB_LABELS,
} from "@/types/intelligence-hub";

type IntentSectionData = {
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

function findSummary(
  summaries: IntelligenceHubResult["summaries"],
  tab: IntelligenceHubResult["summaries"][number]["tab"],
) {
  return summaries.find((summary) => summary.tab === tab);
}

export function mapIntentSections(hub: IntelligenceHubResult | null | undefined): IntentSectionData[] {
  if (!hub) return [];

  const insights = findSummary(hub.summaries, "insights");
  const impact = findSummary(hub.summaries, "impact");
  const lessons = findSummary(hub.summaries, "lessons");
  const playbooks = findSummary(hub.summaries, "playbooks");

  const changedParts: string[] = [];
  if (impact?.latestTitle) {
    changedParts.push(`Latest impact: ${impact.latestTitle}`);
  }
  if (insights?.latestTitle) {
    changedParts.push(`Latest signal: ${insights.latestTitle}`);
  }

  const failedParts: string[] = [];
  if (hub.remediationSummary.rerunsStillFailing > 0) {
    failedParts.push(
      `${hub.remediationSummary.rerunsStillFailing} eval rerun${
        hub.remediationSummary.rerunsStillFailing === 1 ? "" : "s"
      } still failing`,
    );
  }
  if (hub.remediationSummary.failedEvalsNeedingAction > 0) {
    failedParts.push(
      `${hub.remediationSummary.failedEvalsNeedingAction} failed eval${
        hub.remediationSummary.failedEvalsNeedingAction === 1 ? "" : "s"
      } need action`,
    );
  }
  if (hub.queueSummary.criticalHighCount > 0) {
    failedParts.push(
      `${hub.queueSummary.criticalHighCount} critical or high-priority recommendation${
        hub.queueSummary.criticalHighCount === 1 ? "" : "s"
      }`,
    );
  }

  const validateParts: string[] = [];
  if (hub.evalSummary.activeCount > 0) {
    validateParts.push(
      `${hub.evalSummary.activeCount} active eval suite${
        hub.evalSummary.activeCount === 1 ? "" : "s"
      }`,
    );
  }
  if (hub.evalSummary.latestRunStatus) {
    validateParts.push(`Latest run: ${hub.evalSummary.latestRunStatus}`);
  }
  if (hub.evalSummary.latestTitle) {
    validateParts.push(hub.evalSummary.latestTitle);
  }

  return [
    {
      title: "What changed",
      body:
        changedParts.length > 0
          ? changedParts.join(" · ")
          : "No recent impact analyses or insight signals yet.",
      href: impact?.count ? INTELLIGENCE_TAB_HREFS.impact : INTELLIGENCE_TAB_HREFS.insights,
      linkLabel: impact?.count
        ? `Open ${INTELLIGENCE_TAB_LABELS.impact}`
        : `Open ${INTELLIGENCE_TAB_LABELS.insights}`,
    },
    {
      title: "What failed",
      body:
        failedParts.length > 0
          ? failedParts.join(" · ")
          : "No open failures or blocked remediations right now.",
      href: "/intelligence/queue",
      linkLabel: "View remediation queue",
    },
    {
      title: "What we learned",
      body: lessons?.latestTitle
        ? `${lessons.count} active lesson${lessons.count === 1 ? "" : "s"} · Latest: ${lessons.latestTitle}`
        : "Capture lessons from impact analyses and incidents.",
      href: INTELLIGENCE_TAB_HREFS.lessons,
      linkLabel: `Open ${INTELLIGENCE_TAB_LABELS.lessons}`,
    },
    {
      title: "What to do next",
      body: hub.queueSummary.latestTitle
        ? `${hub.queueSummary.openCount} open recommendation${
            hub.queueSummary.openCount === 1 ? "" : "s"
          } · Latest: ${hub.queueSummary.latestTitle}`
        : "Review the autonomy queue for suggested next steps.",
      href: "/recommendations",
      linkLabel: "Open recommendations",
    },
    {
      title: "What to validate",
      body:
        validateParts.length > 0
          ? validateParts.join(" · ")
          : "Run private evals before shipping risky changes.",
      href: "/intelligence/evals",
      linkLabel: "Open private evals",
    },
    {
      title: "Repeat success",
      body: playbooks?.latestTitle
        ? `${playbooks.count} active playbook${playbooks.count === 1 ? "" : "s"} · Latest: ${playbooks.latestTitle}`
        : "Turn lessons into reusable playbooks.",
      href: INTELLIGENCE_TAB_HREFS.playbooks,
      linkLabel: `Open ${INTELLIGENCE_TAB_LABELS.playbooks}`,
    },
  ];
}

type IntelligenceIntentSectionsProps = {
  hub: IntelligenceHubResult | null | undefined;
};

export function IntelligenceIntentSections({ hub }: IntelligenceIntentSectionsProps) {
  if (!hub || hub.isEmpty) return null;

  const sections = mapIntentSections(hub);

  return (
    <div className="intent-sections">
      {sections.map((section) => (
        <article key={section.title} className="intent-section">
          <h2 className="intent-section__title">{section.title}</h2>
          <p className="intent-section__body">{section.body}</p>
          {section.href ? (
            <Link href={section.href} className="intent-section__link">
              {section.linkLabel}
            </Link>
          ) : null}
        </article>
      ))}
    </div>
  );
}
