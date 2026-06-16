import { DiagramEmptyBox } from "@/components/landing/why-sortiri/diagrams/diagram-empty-box";

type AuditsDiagramProps = {
  className?: string;
};

export function AuditsDiagram({ className = "" }: AuditsDiagramProps) {
  return (
    <div
      className={`why-empty-diagram why-empty-diagram--audits ${className}`.trim()}
      role="img"
      aria-label="Audits diagram placeholder"
    >
      <div className="why-empty-diagram__artifacts">
        <DiagramEmptyBox className="why-diagram-box--artifact" />
        <DiagramEmptyBox className="why-diagram-box--artifact" />
        <DiagramEmptyBox className="why-diagram-box--artifact" />
        <DiagramEmptyBox className="why-diagram-box--artifact" />
      </div>
      <div className="why-empty-diagram__pipeline">
        <DiagramEmptyBox className="why-diagram-box--step" />
        <DiagramEmptyBox className="why-diagram-box--step" />
        <DiagramEmptyBox className="why-diagram-box--step" />
      </div>
      <DiagramEmptyBox className="why-diagram-box--sealed" />
    </div>
  );
}
