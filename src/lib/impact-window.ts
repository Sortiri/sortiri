export function formatWindowLabel(beforeMs: number, afterMs: number): string {
  const beforeDays = Math.round(beforeMs / (24 * 60 * 60 * 1000));
  const afterDays = Math.round(afterMs / (24 * 60 * 60 * 1000));
  return `${beforeDays}d before / ${afterDays}d after`;
}

export function presetToMs(preset: "24h" | "7d" | "30d"): number {
  switch (preset) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}
