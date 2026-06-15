import { EnterpriseDiagram } from "@/components/landing/enterprise-diagram";
import { landing } from "@/components/landing/typography";

export function LandingEnterpriseDiagramSection() {
  return (
    <section className={`${landing.diagramBlock} min-w-0 overflow-x-clip`}>
      <EnterpriseDiagram />
    </section>
  );
}
