export function getRelatedEventHref(event: {
  id: string;
  workstreamId?: string;
}): string {
  const eventId = encodeURIComponent(event.id);
  if (event.workstreamId) {
    return `/workstreams/${event.workstreamId}?eventId=${eventId}`;
  }
  return `/timeline?eventId=${eventId}`;
}

export function getTimelineEventDomId(eventId: string): string {
  return `timeline-event-${eventId}`;
}
