"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type ObjectTabItem<T extends string> = {
  id: T;
  label: string;
};

type ObjectTabsProps<T extends string> = {
  tabs: ObjectTabItem<T>[];
  activeTab: T;
  defaultTab: T;
  basePath: string;
  ariaLabel?: string;
};

export function ObjectTabs<T extends string>({
  tabs,
  activeTab,
  defaultTab,
  basePath,
  ariaLabel = "Object sections",
}: ObjectTabsProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setTab = (tab: T) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === defaultTab) {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${basePath}?${query}` : basePath);
  };

  return (
    <div className="object-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`object-tab${activeTab === tab.id ? " is-active" : ""}`}
          onClick={() => setTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function useObjectTab<T extends string>(
  validTabs: readonly T[],
  defaultTab: T,
): T {
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  if (raw && (validTabs as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return defaultTab;
}
