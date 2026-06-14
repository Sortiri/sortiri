import * as React from "react";

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "critical";
  heading?: string;
};

export function Alert({
  className = "",
  heading,
  children,
  ...props
}: AlertProps) {
  return (
    <div role="alert" className={`auth-alert ${className}`.trim()} {...props}>
      {heading ? <h4 className="auth-alert__heading">{heading}</h4> : null}
      <div>{children}</div>
    </div>
  );
}
