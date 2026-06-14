export type InsightWindow = "24h" | "7d" | "30d";

const WINDOW_MS: Record<InsightWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const WINDOW_LABELS: Record<InsightWindow, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export function windowToMs(window: InsightWindow): number {
  return WINDOW_MS[window];
}

export function getWindowBounds(window: InsightWindow = "7d"): {
  windowStart: number;
  windowEnd: number;
  label: string;
} {
  const windowEnd = Date.now();
  const windowStart = windowEnd - windowToMs(window);
  return {
    windowStart,
    windowEnd,
    label: WINDOW_LABELS[window],
  };
}

export function formatRunTitle(window: InsightWindow): string {
  return `Timeline Audit — ${WINDOW_LABELS[window]}`;
}
