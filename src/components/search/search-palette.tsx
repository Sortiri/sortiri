"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { getEntityHref } from "@/lib/entities/links";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { SearchEntityResultItem } from "@/components/search/search-entity-result-item";
import { SearchResultItem } from "@/components/search/search-result-item";
import { useSearch } from "@/components/search/search-provider";
import { SearchWorkstreamResultItem } from "@/components/search/search-workstream-result-item";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PixelLoader } from "@/components/ui/pixel-loader";
import { useWorkspace } from "@/components/workspace/workspace-context";
import type { EntityRecord } from "@/types/entities";
import type { TimelineEvent, Workstream } from "@/types/events";
import "./search.css";

const NAV_SHORTCUTS = [
  { label: "Go to Intelligence", href: "/intelligence", keywords: ["intelligence", "go to"] },
  { label: "Go to Insights", href: "/insights", keywords: ["insights", "go to"] },
  { label: "Go to Impact", href: "/impact", keywords: ["impact", "go to"] },
  { label: "Go to Lessons", href: "/lessons", keywords: ["lessons", "go to"] },
  { label: "Go to Playbooks", href: "/playbooks", keywords: ["playbooks", "go to"] },
] as const;

function matchesNavShortcut(query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.startsWith("go to")) return true;
  return NAV_SHORTCUTS.some(
    (shortcut) =>
      shortcut.label.toLowerCase().includes(normalized) ||
      shortcut.keywords.some((keyword) => keyword.includes(normalized) || normalized.includes(keyword)),
  );
}

function filterNavShortcuts(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return NAV_SHORTCUTS;
  return NAV_SHORTCUTS.filter(
    (shortcut) =>
      shortcut.label.toLowerCase().includes(normalized) ||
      shortcut.keywords.some((keyword) => keyword.includes(normalized) || normalized.includes(keyword)),
  );
}

export function SearchPalette() {
  const router = useRouter();
  const { open, setOpen } = useSearch();
  const { activeWorkspaceId } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const debouncedQuery = useDebouncedValue(query, 250);

  const events = useQuery(
    api.events.search,
    open && activeWorkspaceId && debouncedQuery.trim()
      ? {
          workspaceId: activeWorkspaceId,
          query: debouncedQuery,
          limit: 20,
          includeDebug: true,
          includeHidden: false,
        }
      : "skip",
  );

  const workstreams = useQuery(
    api.workstreams.search,
    open && activeWorkspaceId && debouncedQuery.trim()
      ? {
          workspaceId: activeWorkspaceId,
          query: debouncedQuery,
          limit: 10,
        }
      : "skip",
  );

  const entities = useQuery(
    api.entities.search,
    open && activeWorkspaceId && debouncedQuery.trim()
      ? {
          workspaceId: activeWorkspaceId,
          query: debouncedQuery,
          limit: 10,
          includeDebug: false,
        }
      : "skip",
  );

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const close = () => {
    setQuery("");
    setOpen(false);
  };

  const eventList = (events ?? []) as TimelineEvent[];
  const workstreamList = (workstreams ?? []) as Workstream[];
  const entityList = (entities ?? []) as EntityRecord[];
  const loading =
    Boolean(debouncedQuery.trim()) &&
    activeWorkspaceId !== null &&
    (events === undefined || workstreams === undefined || entities === undefined);
  const hasResults =
    eventList.length > 0 || workstreamList.length > 0 || entityList.length > 0;
  const navShortcuts = filterNavShortcuts(debouncedQuery);
  const showNavShortcuts = matchesNavShortcut(debouncedQuery);

  const handleNavShortcut = (href: string) => {
    router.push(href);
    close();
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (event.workstreamId) {
      router.push(`/workstreams/${event.workstreamId}`);
    } else {
      router.push("/timeline");
    }
    close();
  };

  const handleWorkstreamClick = (workstream: Workstream) => {
    router.push(`/workstreams/${workstream.id}`);
    close();
  };

  const handleEntityClick = (entity: EntityRecord) => {
    router.push(getEntityHref(entity.id));
    close();
  };

  return (
    <div
      className="search-palette-backdrop"
      onClick={close}
      role="presentation"
    >
      <div
        className="search-palette"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search Sortiri"
      >
        <input
          ref={inputRef}
          type="search"
          className="search-palette__input"
          placeholder="Search Sortiri..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="search-palette__body">
          {showNavShortcuts && navShortcuts.length > 0 ? (
            <section className="search-palette__section">
              <h2 className="search-palette__section-title">Navigation</h2>
              <div className="search-palette__results">
                {navShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.href}
                    type="button"
                    className="search-palette__nav-shortcut"
                    onClick={() => handleNavShortcut(shortcut.href)}
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {loading ? (
            <div className="search-palette__loading">
              <PixelLoader size="sm" />
            </div>
          ) : !hasResults ? (
            <p className="search-palette__empty">
              {debouncedQuery.trim()
                ? "No matching events, workstreams, or entities."
                : "Type to search events, workstreams, and entities."}
            </p>
          ) : (
            <>
              {eventList.length > 0 ? (
                <section className="search-palette__section">
                  <h2 className="search-palette__section-title">Events</h2>
                  <div className="search-palette__results">
                    {eventList.map((event) => (
                      <SearchResultItem
                        key={event.id}
                        event={event}
                        query={debouncedQuery}
                        onClick={() => handleEventClick(event)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {entityList.length > 0 ? (
                <section className="search-palette__section">
                  <h2 className="search-palette__section-title">Entities</h2>
                  <div className="search-palette__results">
                    {entityList.map((entity) => (
                      <SearchEntityResultItem
                        key={entity.id}
                        entity={entity}
                        onClick={() => handleEntityClick(entity)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {workstreamList.length > 0 ? (
                <section className="search-palette__section">
                  <h2 className="search-palette__section-title">Workstreams</h2>
                  <div className="search-palette__results">
                    {workstreamList.map((workstream) => (
                      <SearchWorkstreamResultItem
                        key={workstream.id}
                        workstream={workstream}
                        query={debouncedQuery}
                        onClick={() => handleWorkstreamClick(workstream)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
