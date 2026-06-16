type DiagramEmptyBoxProps = {
  className?: string;
};

export function DiagramEmptyBox({ className = "" }: DiagramEmptyBoxProps) {
  return (
    <div
      className={`why-diagram-box${className ? ` ${className}` : ""}`}
      aria-hidden
    />
  );
}
