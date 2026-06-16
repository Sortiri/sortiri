import { DiagramEmptyBox } from "@/components/landing/why-sortiri/diagrams/diagram-empty-box";

type AgentContextDiagramProps = {
  className?: string;
};

export function AgentContextDiagram({ className = "" }: AgentContextDiagramProps) {
  return (
    <div
      className={`why-empty-diagram why-empty-diagram--context ${className}`.trim()}
      role="img"
      aria-label="Agent context diagram placeholder"
    >
      <div className="why-empty-diagram__inputs">
        <DiagramEmptyBox className="why-diagram-box--input" />
        <DiagramEmptyBox className="why-diagram-box--input" />
        <DiagramEmptyBox className="why-diagram-box--input" />
        <DiagramEmptyBox className="why-diagram-box--input" />
        <DiagramEmptyBox className="why-diagram-box--input" />
      </div>
      <DiagramEmptyBox className="why-diagram-box--md" />
      <DiagramEmptyBox className="why-diagram-box--md" />
    </div>
  );
}
