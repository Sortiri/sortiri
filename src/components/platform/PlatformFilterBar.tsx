"use client";

import type { ReactNode } from "react";

type PlatformFilterBarProps = {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
  };
  controls?: ReactNode;
  chips?: ReactNode;
  secondary?: ReactNode;
};

export function PlatformFilterBar({ search, controls, chips, secondary }: PlatformFilterBarProps) {
  return (
    <div className="platform-filter-bar">
      <div className="platform-filter-bar__row">
        {search ? (
          <div className="platform-filter-bar__search">
            <label className="sr-only" htmlFor="platform-filter-search">
              {search.label ?? "Search"}
            </label>
            <input
              id="platform-filter-search"
              type="search"
              className="platform-filter-bar__search-input"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search…"}
            />
          </div>
        ) : null}
        {controls ? <div className="platform-filter-bar__controls">{controls}</div> : null}
        {secondary ? <div className="platform-filter-bar__secondary">{secondary}</div> : null}
      </div>
      {chips ? <div className="platform-filter-bar__chips">{chips}</div> : null}
    </div>
  );
}
