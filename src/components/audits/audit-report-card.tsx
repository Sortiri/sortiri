import Link from "next/link";
import type { AuditReportRecord } from "@/types/audit-reports";

type AuditReportCardProps = {
  report: AuditReportRecord;
};

export function AuditReportCard({ report }: AuditReportCardProps) {
  return (
    <Link href={`/audits/${report.id}`} className="audit-card">
      <span className={`audit-status audit-status--${report.status}`}>{report.status}</span>
      <h2 className="audit-card__title">{report.title}</h2>
      {report.summary ? <p className="audit-card__meta">{report.summary}</p> : null}
      <p className="audit-card__meta">
        {report.itemCount ?? 0} evidence items
        {report.finalizedAt
          ? ` · Finalized ${new Date(report.finalizedAt).toLocaleDateString()}`
          : ""}
      </p>
    </Link>
  );
}
