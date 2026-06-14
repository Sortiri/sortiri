import * as React from "react";

export function Paragraph({
  className = "",
  color = "default",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  color?: "default" | "muted" | "subdued";
}) {
  const muted = color === "muted" || color === "subdued";
  return (
    <p
      className={`auth-paragraph${muted ? " auth-paragraph--muted" : ""} ${className}`.trim()}
      {...props}
    />
  );
}
