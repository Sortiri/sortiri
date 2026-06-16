import { DiagramEmptyBox } from "@/components/landing/why-sortiri/diagrams/diagram-empty-box";

type EnterpriseDiagramPanelProps = {
  className?: string;
};

export function EnterpriseDiagramPanel({ className = "" }: EnterpriseDiagramPanelProps) {
  return (
    <div
      className={`why-empty-diagram why-empty-diagram--enterprise ${className}`.trim()}
      role="img"
      aria-label="Enterprise diagram placeholder"
    >
      <div className="why-empty-diagram__teams">
        <div className="why-empty-diagram__team">
          <DiagramEmptyBox className="why-diagram-box--block" />
          <DiagramEmptyBox className="why-diagram-box--block" />
          <DiagramEmptyBox className="why-diagram-box--block" />
        </div>
        <div className="why-empty-diagram__team">
          <DiagramEmptyBox className="why-diagram-box--block" />
          <DiagramEmptyBox className="why-diagram-box--block" />
        </div>
        <div className="why-empty-diagram__team">
          <DiagramEmptyBox className="why-diagram-box--block" />
          <DiagramEmptyBox className="why-diagram-box--block" />
        </div>
        <div className="why-empty-diagram__team">
          <DiagramEmptyBox className="why-diagram-box--block" />
          <DiagramEmptyBox className="why-diagram-box--block" />
        </div>
      </div>
      <DiagramEmptyBox className="why-diagram-box--core" />
      <div className="why-empty-diagram__signals">
        <DiagramEmptyBox className="why-diagram-box--signal" />
        <DiagramEmptyBox className="why-diagram-box--signal" />
        <DiagramEmptyBox className="why-diagram-box--signal" />
        <DiagramEmptyBox className="why-diagram-box--signal" />
      </div>
    </div>
  );
}
