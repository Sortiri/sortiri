type SignalBadgeProps = {
  severity: "info" | "warning" | "error" | "critical";
  label?: string;
};

export function SignalBadge({ severity, label }: SignalBadgeProps) {
  return (
    <span className={`signal-badge signal-badge--${severity}`}>
      {label ?? severity}
    </span>
  );
}
