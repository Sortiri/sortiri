"use client";

type PlatformTab = {
  id: string;
  label: string;
  count?: number;
};

type PlatformTabsProps = {
  tabs: PlatformTab[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
};

export function PlatformTabs({
  tabs,
  activeId,
  onChange,
  ariaLabel = "Filter tabs",
}: PlatformTabsProps) {
  return (
    <div className="platform-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const label =
          tab.count !== undefined ? `${tab.label} (${tab.count})` : tab.label;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`platform-tabs__tab${isActive ? " is-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
