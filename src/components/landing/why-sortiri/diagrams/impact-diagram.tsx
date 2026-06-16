import { DiagramEmptyBox } from "@/components/landing/why-sortiri/diagrams/diagram-empty-box";

type ImpactDiagramProps = {
  className?: string;
};

export function ImpactDiagram({ className = "" }: ImpactDiagramProps) {
  return (
    <div
      className={`why-empty-diagram why-empty-diagram--impact ${className}`.trim()}
      role="img"
      aria-label="Impact diagram placeholder"
    >
      <div className="why-empty-diagram__column">
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
      </div>
      <DiagramEmptyBox className="why-diagram-box--center" />
      <div className="why-empty-diagram__column">
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
      </div>
    </div>
  );
}
