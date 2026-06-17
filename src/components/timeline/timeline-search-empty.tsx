import { EmptyState } from "@/components/platform";

export function TimelineSearchEmptyState() {
  return (
    <EmptyState
      title="No matching events"
      body="Try adjusting filters or search terms to find events in your timeline."
    />
  );
}
