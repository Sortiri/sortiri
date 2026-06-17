type StatusBadgeTone = "success" | "warning" | "error" | "info" | "neutral";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <span className="status-badge__icon" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
