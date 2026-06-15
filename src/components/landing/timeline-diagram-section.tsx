import { SortiriMemoryMachine } from "@/components/landing/sortiri-memory-machine";
import { landing } from "@/components/landing/typography";

export function LandingTimelineDiagramSection() {
  return (
    <section className={`${landing.diagramBlock} min-w-0 overflow-x-clip`}>
      <SortiriMemoryMachine />
    </section>
  );
}
