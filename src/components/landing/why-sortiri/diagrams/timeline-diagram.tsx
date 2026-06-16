import { DiagramEmptyBox } from "@/components/landing/why-sortiri/diagrams/diagram-empty-box";

type TimelineDiagramProps = {
  className?: string;
};

export function TimelineDiagram({ className = "" }: TimelineDiagramProps) {
  return (
    <div
      className={`why-empty-diagram why-empty-diagram--timeline ${className}`.trim()}
      role="img"
      aria-label="Timeline diagram placeholder"
    >
      <div className="why-empty-diagram__sources">
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
      </div>
      <DiagramEmptyBox className="why-diagram-box--core" />
      <div className="why-empty-diagram__outputs">
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
        <DiagramEmptyBox className="why-diagram-box--sm" />
      </div>
    </div>
  );
}
