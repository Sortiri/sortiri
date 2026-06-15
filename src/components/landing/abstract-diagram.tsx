import type { ReactNode } from "react";
import { departureMono } from "@/lib/landing-fonts";

const MONO = departureMono.className;
const ACCENT = "abstract-diagram__accent";

type DiagramLabelProps = {
  children: ReactNode;
  accent?: boolean;
  className?: string;
};

export function DiagramLabel({
  children,
  accent = false,
  className = "",
}: DiagramLabelProps) {
  return (
    <span
      className={`${MONO} abstract-diagram__label${accent ? ` ${ACCENT}` : ""} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

type MiniBlockProps = {
  accent?: boolean;
  className?: string;
};

export function MiniBlock({ accent = false, className = "" }: MiniBlockProps) {
  return (
    <span
      className={`abstract-diagram__mini-block${accent ? ` ${ACCENT}` : ""} ${className}`.trim()}
      aria-hidden
    />
  );
}

type PacketProps = {
  children: ReactNode;
  accent?: boolean;
  className?: string;
};

export function Packet({ children, accent = false, className = "" }: PacketProps) {
  return (
    <span
      className={`${MONO} abstract-diagram__packet${accent ? ` ${ACCENT}` : ""} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

type DiagramNodeProps = {
  children: ReactNode;
  accent?: boolean;
  className?: string;
};

export function DiagramNode({
  children,
  accent = false,
  className = "",
}: DiagramNodeProps) {
  return (
    <span
      className={`${MONO} abstract-diagram__node${accent ? ` ${ACCENT}` : ""} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

type DotLineProps = {
  orientation?: "horizontal" | "vertical";
  className?: string;
  dense?: boolean;
};

export function DotLine({
  orientation = "horizontal",
  className = "",
  dense = false,
}: DotLineProps) {
  const dots = dense ? 5 : 7;

  if (orientation === "vertical") {
    return (
      <span
        className={`abstract-diagram__dot-line abstract-diagram__dot-line--vertical ${className}`.trim()}
        aria-hidden
      >
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index}>·</span>
        ))}
      </span>
    );
  }

  return (
    <span
      className={`abstract-diagram__dot-line abstract-diagram__dot-line--horizontal${dense ? " abstract-diagram__dot-line--dense" : ""} ${className}`.trim()}
      aria-hidden
    >
      {Array.from({ length: dots }, (_, index) => (
        <span key={index}>·</span>
      ))}
    </span>
  );
}

type DiagramClusterProps = {
  children: ReactNode;
  label?: string;
  className?: string;
};

export function DiagramCluster({
  children,
  label,
  className = "",
}: DiagramClusterProps) {
  return (
    <div className={`abstract-diagram__cluster ${className}`.trim()}>
      {label ? <DiagramLabel className="abstract-diagram__cluster-label">{label}</DiagramLabel> : null}
      <div className="abstract-diagram__cluster-items">{children}</div>
    </div>
  );
}

type DiagramCoreProps = {
  lines: string[];
  className?: string;
};

export function DiagramCore({ lines, className = "" }: DiagramCoreProps) {
  return (
    <div className={`abstract-diagram__core ${className}`.trim()}>
      {lines.map((line) => (
        <DiagramLabel key={line} accent className="abstract-diagram__core-line">
          {line}
        </DiagramLabel>
      ))}
    </div>
  );
}

type AbstractDiagramProps = {
  children: ReactNode;
  ariaLabel: string;
  className?: string;
};

export function AbstractDiagram({
  children,
  ariaLabel,
  className = "",
}: AbstractDiagramProps) {
  return (
    <div
      className={`abstract-diagram ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
