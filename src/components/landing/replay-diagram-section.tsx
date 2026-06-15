import { ReplayDiagram } from "@/components/landing/replay-diagram";
import { landing } from "@/components/landing/typography";

export function LandingReplayDiagramSection() {
  return (
    <section className={`${landing.diagramBlock} min-w-0 overflow-x-clip`}>
      <ReplayDiagram />
    </section>
  );
}
