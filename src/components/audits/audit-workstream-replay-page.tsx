"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ReplayTimeline } from "@/components/workstreams/replay-timeline";
import type { TimelineEvent } from "@/types/events";
import "./audits.css";

type AuditWorkstreamReplayPageProps = {
  reportId: string;
  workstreamId: string;
};

export function AuditWorkstreamReplayPage({
  reportId,
  workstreamId,
}: AuditWorkstreamReplayPageProps) {
  const report = useQuery(api.auditReports.getById, {
    reportId: reportId as Id<"auditReports">,
  });
  const events = useQuery(api.auditReports.listWorkstreamEventsForReport, {
    reportId: reportId as Id<"auditReports">,
    workstreamId: workstreamId as Id<"workstreams">,
  });

  const eventList = (events ?? []) as TimelineEvent[];

  if (report === undefined || events === undefined) {
    return <p className="audits-page__subtitle">Loading workstream replay…</p>;
  }

  if (!report) {
    return (
      <div>
        <p>Report not found.</p>
        <Link href="/audits">← Back to Audits</Link>
      </div>
    );
  }

  return (
    <div className="audit-detail-page">
      <Link href={`/audits/${reportId}`} className="audit-evidence-item__link">
        ← Back to {report.title}
      </Link>
      <h1 className="audits-page__title">Workstream replay</h1>
      <p className="audit-detail__summary">
        Events included in this audit report snapshot for workstream {workstreamId}.
      </p>
      <ReplayTimeline events={eventList} disableEntityResolve />
    </div>
  );
}
