import type { ReactNode } from "react";

export type ActivityFeedGroup = {
  label: string;
  items: ReactNode[];
};

type ActivityFeedProps = {
  groups: ActivityFeedGroup[];
};

export function ActivityFeed({ groups }: ActivityFeedProps) {
  return (
    <div className="activity-feed">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="activity-feed__group-label">{group.label}</h2>
          {group.items}
        </section>
      ))}
    </div>
  );
}
