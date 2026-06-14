type SeparatorProps = {
  className?: string;
};

export function Separator({ className = "" }: SeparatorProps) {
  return (
    <hr
      className={`m-0 border-0 border-t border-[var(--ca-hairline)] ${className}`.trim()}
      aria-hidden
    />
  );
}
