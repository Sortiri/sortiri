import type { InsightWindow } from "@/types/insights";

const WINDOW_MS: Record<InsightWindow, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export function getWindowBounds(window: InsightWindow = "7d"): {
  windowStart: number;
  windowEnd: number;
} {
  const windowEnd = Date.now();
  const windowStart = windowEnd - WINDOW_MS[window];
  return { windowStart, windowEnd };
}
