import { AuditDiagram } from "@/components/landing/audit-diagram";

type AuditEvidenceDiagramProps = {
  className?: string;
};

export function AuditEvidenceDiagram({ className = "" }: AuditEvidenceDiagramProps) {
  return <AuditDiagram className={className} />;
}
