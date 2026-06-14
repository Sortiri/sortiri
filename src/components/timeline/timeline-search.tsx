"use client";

type TimelineSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TimelineSearch({ value, onChange }: TimelineSearchProps) {
  return (
    <div className="timeline-search">
      <input
        type="search"
        className="timeline-search__input"
        placeholder="Search company history..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search company history"
      />
    </div>
  );
}
