import { ReplayScanAnimation } from "@/components/landing/replay-scan-animation";
import { landing } from "@/components/landing/typography";

export function LandingReplayDiagramSection() {
  return (
    <section className={`${landing.diagramBlock} min-w-0 overflow-x-clip`}>
      <ReplayScanAnimation />
    </section>
  );
}
