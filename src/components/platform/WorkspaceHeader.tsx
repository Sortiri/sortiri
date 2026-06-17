type WorkspaceStat = {
  label: string;
  value: string | number;
};

type WorkspaceHeaderProps = {
  title?: string;
  subtitle?: string;
  stats?: WorkspaceStat[];
};

export function WorkspaceHeader({
  title = "Timeline",
  subtitle = "Company memory for agents, events, decisions, incidents, and outcomes.",
  stats,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <h1 className="workspace-header__title">{title}</h1>
      <p className="workspace-header__subtitle">{subtitle}</p>
      {stats && stats.length > 0 ? (
        <div className="workspace-header__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="workspace-stat">
              <span className="workspace-stat__value">{stat.value}</span>
              <span className="workspace-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
}
