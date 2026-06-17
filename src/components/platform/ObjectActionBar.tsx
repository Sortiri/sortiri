import Link from "next/link";

type ObjectAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
};

type ObjectActionBarProps = {
  actions: ObjectAction[];
};

export function ObjectActionBar({ actions }: ObjectActionBarProps) {
  return (
    <div className="object-action-bar">
      {actions.map((action) => {
        const className = action.primary
          ? "object-action-bar__primary"
          : "object-action-bar__secondary";
        if (action.href) {
          return (
            <Link key={action.label} href={action.href} className={className}>
              {action.label}
            </Link>
          );
        }
        return (
          <button key={action.label} type="button" className={className} onClick={action.onClick}>
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
