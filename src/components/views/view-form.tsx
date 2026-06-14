"use client";

import { useState } from "react";
import type { SavedViewFilters, SavedViewSharing } from "@/types/saved-views";
import { FILTER_OPTIONS } from "@/lib/events/labels";
import "./views.css";

const SOURCE_OPTIONS = [
  "cursor",
  "watcher",
  "github",
  "cli",
  "sdk",
  "manual",
  "system",
  "stripe",
] as const;

const ENTITY_TYPE_OPTIONS = [
  "user",
  "customer",
  "feature",
  "file",
  "issue",
  "payment",
  "subscription",
] as const;

const IMPORTANCE_OPTIONS = ["low", "normal", "high", "critical"] as const;

type ViewFiltersProps = {
  value: SavedViewFilters;
  onChange: (value: SavedViewFilters) => void;
};

function toggleValue<T extends string>(
  list: T[] | undefined,
  value: T,
): T[] {
  const current = list ?? [];
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

export function ViewFilters({ value, onChange }: ViewFiltersProps) {
  return (
    <div className="view-form">
      <div className="view-form__field">
        <span className="view-form__label">Categories</span>
        <div className="view-form__checkbox-group">
          {FILTER_OPTIONS.filter((option) => option.value !== null).map((option) => (
            <label key={option.value} className="view-form__checkbox">
              <input
                type="checkbox"
                checked={(value.categories ?? []).includes(option.value!)}
                onChange={() =>
                  onChange({
                    ...value,
                    categories: toggleValue(value.categories, option.value!),
                  })
                }
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="view-form__field">
        <span className="view-form__label">Sources</span>
        <div className="view-form__checkbox-group">
          {SOURCE_OPTIONS.map((source) => (
            <label key={source} className="view-form__checkbox">
              <input
                type="checkbox"
                checked={(value.sources ?? []).includes(source)}
                onChange={() =>
                  onChange({
                    ...value,
                    sources: toggleValue(value.sources, source),
                  })
                }
              />
              {source}
            </label>
          ))}
        </div>
      </div>

      <div className="view-form__field">
        <span className="view-form__label">Entity types</span>
        <div className="view-form__checkbox-group">
          {ENTITY_TYPE_OPTIONS.map((entityType) => (
            <label key={entityType} className="view-form__checkbox">
              <input
                type="checkbox"
                checked={(value.entityTypes ?? []).includes(entityType)}
                onChange={() =>
                  onChange({
                    ...value,
                    entityTypes: toggleValue(value.entityTypes, entityType),
                  })
                }
              />
              {entityType}
            </label>
          ))}
        </div>
      </div>

      <div className="view-form__field">
        <span className="view-form__label">Importance</span>
        <div className="view-form__checkbox-group">
          {IMPORTANCE_OPTIONS.map((importance) => (
            <label key={importance} className="view-form__checkbox">
              <input
                type="checkbox"
                checked={(value.importance ?? []).includes(importance)}
                onChange={() =>
                  onChange({
                    ...value,
                    importance: toggleValue(value.importance, importance),
                  })
                }
              />
              {importance}
            </label>
          ))}
        </div>
      </div>

      <div className="view-form__field">
        <label className="view-form__label" htmlFor="view-visibility-filter">
          Event visibility
        </label>
        <select
          id="view-visibility-filter"
          className="view-form__select"
          value={value.visibility ?? "primary"}
          onChange={(event) =>
            onChange({
              ...value,
              visibility: event.target.value as SavedViewFilters["visibility"],
            })
          }
        >
          <option value="primary">Primary</option>
          <option value="debug">Debug</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="view-form__field">
        <label className="view-form__label" htmlFor="view-search-query">
          Search query
        </label>
        <input
          id="view-search-query"
          className="view-form__input"
          value={value.query ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              query: event.target.value || undefined,
            })
          }
          placeholder="Optional text filter"
        />
      </div>
    </div>
  );
}

type ViewFormProps = {
  initialName?: string;
  initialDescription?: string;
  initialVisibility?: SavedViewSharing;
  initialFilters?: SavedViewFilters;
  canCreateWorkspaceView: boolean;
  submitLabel: string;
  onSubmit: (values: {
    name: string;
    description?: string;
    visibility: SavedViewSharing;
    filters: SavedViewFilters;
  }) => Promise<void>;
  onCancel?: () => void;
};

export function ViewForm({
  initialName = "",
  initialDescription = "",
  initialVisibility = "workspace",
  initialFilters = { visibility: "primary" },
  canCreateWorkspaceView,
  submitLabel,
  onSubmit,
  onCancel,
}: ViewFormProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [visibility, setVisibility] = useState<SavedViewSharing>(
    canCreateWorkspaceView ? initialVisibility : "private",
  );
  const [filters, setFilters] = useState<SavedViewFilters>(initialFilters);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        filters,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save view");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view-form">
      <div className="view-form__field">
        <label className="view-form__label" htmlFor="view-name">
          Name
        </label>
        <input
          id="view-name"
          className="view-form__input"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="view-form__field">
        <label className="view-form__label" htmlFor="view-description">
          Description
        </label>
        <textarea
          id="view-description"
          className="view-form__textarea"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="view-form__field">
        <label className="view-form__label" htmlFor="view-visibility">
          Visibility
        </label>
        <select
          id="view-visibility"
          className="view-form__select"
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as SavedViewSharing)}
          disabled={!canCreateWorkspaceView}
        >
          {canCreateWorkspaceView ? <option value="workspace">Workspace</option> : null}
          <option value="private">Private</option>
        </select>
      </div>

      <ViewFilters value={filters} onChange={setFilters} />

      {error ? <p className="view-form__error">{error}</p> : null}

      <div className="view-form__actions">
        <button
          type="button"
          className="views-page__action"
          onClick={() => void handleSubmit()}
          disabled={busy || !name.trim()}
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className="views-page__action" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
