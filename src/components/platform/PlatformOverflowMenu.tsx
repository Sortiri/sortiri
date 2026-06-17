"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export type OverflowMenuItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type PlatformOverflowMenuProps = {
  items: OverflowMenuItem[];
  label?: string;
};

export function PlatformOverflowMenu({
  items,
  label = "More actions",
}: PlatformOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, close]);

  if (items.length === 0) return null;

  return (
    <div className="platform-overflow-menu" ref={containerRef}>
      <button
        type="button"
        className="platform-overflow-menu__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open ? (
        <div id={menuId} className="platform-overflow-menu__dropdown" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="platform-overflow-menu__item"
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                close();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
