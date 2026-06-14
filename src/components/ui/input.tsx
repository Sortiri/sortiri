"use client";

import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <div className="auth-field">
        {label ? (
          <label htmlFor={inputId} className="auth-field__label">
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={`auth-field__input ${className}`.trim()}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
