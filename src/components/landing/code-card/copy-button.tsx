"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "pixelarticons/react/Check";
import { Copy } from "pixelarticons/react/Copy";
import { departureMono } from "@/lib/landing-fonts";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

const MONO = departureMono.className;

type CopyButtonProps = {
  text: string;
  className?: string;
  compact?: boolean;
  icon?: boolean;
};

export function CopyButton({
  text,
  className = "",
  compact = false,
  icon = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const didCopy = await copyToClipboard(text);
    if (!didCopy) {
      setCopied(false);
      return;
    }

    setCopied(true);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, 2000);
  }, [text]);

  if (icon) {
    return (
      <button
        type="button"
        className={`hero-install-card__copy${copied ? " hero-install-card__copy--copied" : ""} ${className}`.trim()}
        onClick={() => void handleCopy()}
        aria-label={copied ? "Copied to clipboard" : "Copy install command"}
      >
        {copied ? (
          <Check width={14} height={14} aria-hidden />
        ) : (
          <Copy width={14} height={14} aria-hidden />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`code-card__copy${compact ? " code-card__copy--compact" : ""} ${MONO} ${className}`.trim()}
      onClick={() => void handleCopy()}
      aria-label={copied ? "Copied to clipboard" : "Copy code"}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
