"use client";

import { useCallback, useState } from "react";

type SetupBlockProps = {
  label: string;
  code: string;
  defaultOpen?: boolean;
};

export function SetupBlock({ label, code, defaultOpen = false }: SetupBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div className="setup-block">
      <div className="setup-block__header">
        <button
          type="button"
          className="setup-block__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {label}
        </button>
        <button type="button" className="setup-block__copy" onClick={() => void handleCopy()}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {open ? <pre className="setup-block__code">{code}</pre> : null}
    </div>
  );
}
