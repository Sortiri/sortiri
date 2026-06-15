import { CompanyTimelineDiagram } from "@/components/landing/company-timeline-diagram";
import { landing } from "@/components/landing/typography";

export function LandingTimelineDiagramSection() {
  return (
    <section className={`${landing.diagramBlock} min-w-0 overflow-x-clip`}>
      <CompanyTimelineDiagram />
    </section>
  );
}
