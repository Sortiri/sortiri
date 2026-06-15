import {
  AbstractDiagram,
  DiagramNode,
  DotLine,
  Packet,
} from "@/components/landing/abstract-diagram";

const ARTIFACTS = ["event", "diff", "decision", "payment"];
const PIPELINE = ["collect", "redact", "freeze"];

export function AuditDiagram({ className = "" }: { className?: string }) {
  return (
    <AbstractDiagram
      className={`abstract-diagram--evidence ${className}`.trim()}
      ariaLabel="Evidence chain from scattered artifacts through collect, redact, and freeze into sealed proof packet."
    >
      <div className="abstract-evidence__artifacts">
        {ARTIFACTS.map((artifact, index) => (
          <Packet key={artifact} accent={index === 0}>
            {artifact}
          </Packet>
        ))}
      </div>

      <DotLine className="abstract-evidence__dot-bar" />

      <div className="abstract-evidence__pipeline">
        {PIPELINE.map((step, index) => (
          <div key={step} className="abstract-evidence__pipeline-step">
            {index > 0 ? (
              <span className="abstract-evidence__arrow" aria-hidden>
                →
              </span>
            ) : null}
            <DiagramNode accent={step === "freeze"}>{step}</DiagramNode>
          </div>
        ))}
      </div>

      <span className="abstract-evidence__drop" aria-hidden>
        │
      </span>
      <span className="abstract-evidence__drop-end" aria-hidden>
        ▼
      </span>

      <div className="abstract-evidence__sealed">
        <DiagramNode accent>sealed report</DiagramNode>
        <Packet accent>proof packet</Packet>
      </div>
    </AbstractDiagram>
  );
}
