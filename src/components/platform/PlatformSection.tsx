import type { ReactNode } from "react";

type PlatformSectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

export function PlatformSection({ children, className, id }: PlatformSectionProps) {
  const classes = ["platform-section", className].filter(Boolean).join(" ");
  return (
    <section className={classes} id={id}>
      {children}
    </section>
  );
}
