import * as React from "react";
import { PixelLoader } from "@/components/ui/pixel-loader";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  inlineSize?: "fill";
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      inlineSize,
      loading = false,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`${inlineSize === "fill" ? "w-full" : ""} ${className}`.trim()}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center mr-1.5" aria-hidden>
            <PixelLoader size="sm" />
          </span>
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
