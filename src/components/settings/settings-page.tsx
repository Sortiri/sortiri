import Link from "next/link";
import "./team.css";

export function SettingsPage() {
  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Settings</h1>
        <p className="settings-page__subtitle">
          Manage your workspace, team, and integrations.
        </p>
      </header>

      <div className="settings-cards">
        <Link href="/settings/team" className="settings-card">
          <h2 className="settings-card__title">Team</h2>
          <p className="settings-card__description">
            Invite members, manage roles, and review pending invites.
          </p>
        </Link>
        <Link href="/sources#advanced" className="settings-card">
          <h2 className="settings-card__title">API Keys</h2>
          <p className="settings-card__description">
            Create ingest keys and CLI setup tokens on the Sources page.
          </p>
        </Link>
      </div>
    </div>
  );
}
