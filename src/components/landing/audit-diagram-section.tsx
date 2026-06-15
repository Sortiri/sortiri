import { AuditDiagram } from "@/components/landing/audit-diagram";
import { landing } from "@/components/landing/typography";

export function LandingAuditDiagramSection() {
  return (
    <section className={`${landing.diagramBlock} min-w-0 overflow-x-clip`}>
      <AuditDiagram />
    </section>
  );
}
