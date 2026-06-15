export type SensitiveFindingSeverity = "low" | "medium" | "high" | "critical";

export type SensitiveFinding = {
  type: string;
  label: string;
  count: number;
  severity: SensitiveFindingSeverity;
};

export type SensitiveScanResult = {
  hasSensitiveContent: boolean;
  maxSeverity: SensitiveFindingSeverity;
  findings: SensitiveFinding[];
};

export const SEVERITY_RANK: Record<SensitiveFindingSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
