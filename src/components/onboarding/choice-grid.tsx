"use client";

type ChoiceCardProps = {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export function ChoiceCard({
  label,
  hint,
  selected,
  onClick,
  disabled,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`onboarding-choice${selected ? " onboarding-choice--selected" : ""}`}
    >
      <p className="onboarding-choice__label">{label}</p>
      {hint ? <p className="onboarding-choice__hint">{hint}</p> : null}
    </button>
  );
}

type ChoiceGridProps = {
  options: readonly string[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function ChoiceGrid({
  options,
  value,
  onChange,
  disabled,
}: ChoiceGridProps) {
  return (
    <div className="onboarding-choice-grid">
      {options.map((option) => (
        <ChoiceCard
          key={option}
          label={option}
          selected={value === option}
          onClick={() => onChange(option)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

type MultiChoiceGridProps = {
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
};

export function MultiChoiceGrid({
  options,
  values,
  onChange,
  disabled,
}: MultiChoiceGridProps) {
  function toggle(option: string) {
    if (values.includes(option)) {
      onChange(values.filter((value) => value !== option));
      return;
    }
    onChange([...values, option]);
  }

  return (
    <div className="onboarding-choice-grid onboarding-choice-grid--multi">
      {options.map((option) => (
        <ChoiceCard
          key={option}
          label={option}
          selected={values.includes(option)}
          onClick={() => toggle(option)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
