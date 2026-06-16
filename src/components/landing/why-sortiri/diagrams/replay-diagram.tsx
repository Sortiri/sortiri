import { DiagramEmptyBox } from "@/components/landing/why-sortiri/diagrams/diagram-empty-box";

type ReplayDiagramProps = {
  className?: string;
};

export function ReplayDiagram({ className = "" }: ReplayDiagramProps) {
  return (
    <div
      className={`why-empty-diagram why-empty-diagram--replay ${className}`.trim()}
      role="img"
      aria-label="Replay diagram placeholder"
    >
      <DiagramEmptyBox className="why-diagram-box--xs" />
      <div className="why-empty-diagram__stack">
        <DiagramEmptyBox className="why-diagram-box--row" />
        <DiagramEmptyBox className="why-diagram-box--row" />
        <DiagramEmptyBox className="why-diagram-box--row" />
        <DiagramEmptyBox className="why-diagram-box--row" />
        <DiagramEmptyBox className="why-diagram-box--row" />
      </div>
      <DiagramEmptyBox className="why-diagram-box--xs" />
    </div>
  );
}
