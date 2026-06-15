import { DecisionTimelineDiagram } from "@/components/landing/decision-timeline-diagram";
import { landing } from "@/components/landing/typography";

export function LandingDecisionTimelineDiagramSection() {
  return (
    <section className={`${landing.diagramBlock} min-w-0 overflow-x-clip`}>
      <DecisionTimelineDiagram />
    </section>
  );
}
