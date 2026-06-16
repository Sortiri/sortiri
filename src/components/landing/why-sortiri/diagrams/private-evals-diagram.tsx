import { DiagramEmptyBox } from "@/components/landing/why-sortiri/diagrams/diagram-empty-box";

type PrivateEvalsDiagramProps = {
  className?: string;
};

export function PrivateEvalsDiagram({ className = "" }: PrivateEvalsDiagramProps) {
  return (
    <div
      className={`why-empty-diagram why-empty-diagram--evals ${className}`.trim()}
      role="img"
      aria-label="Private evals diagram placeholder"
    >
      <DiagramEmptyBox className="why-diagram-box--step" />
      <DiagramEmptyBox className="why-diagram-box--step" />
      <DiagramEmptyBox className="why-diagram-box--step" />
      <DiagramEmptyBox className="why-diagram-box--step" />
      <DiagramEmptyBox className="why-diagram-box--step" />
    </div>
  );
}
