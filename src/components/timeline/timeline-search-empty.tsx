export function TimelineSearchEmptyState() {
  return (
    <div className="timeline-search-empty-state">
      <p className="timeline-search-empty-state__title">No matching events.</p>
      <p className="timeline-search-empty-state__body">
        Try searching for an agent, file, decision, product event, or source.
      </p>
    </div>
  );
}
