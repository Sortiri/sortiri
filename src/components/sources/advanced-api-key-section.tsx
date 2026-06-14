"use client";

import { useState } from "react";
import { ApiKeySection } from "@/components/sources/api-key-section";
import { SetupBlock } from "@/components/sources/setup-block";

type AdvancedApiKeySectionProps = {
  workspaceId: string;
  onRawKeyChange: (rawKey: string | null) => void;
};

export function AdvancedApiKeySection({
  workspaceId,
  onRawKeyChange,
}: AdvancedApiKeySectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="sources-section">
      <header className="sources-section__header">
        <button
          type="button"
          className="setup-block__toggle sources-advanced-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          Advanced — manual API key setup
        </button>
        <p className="sources-section__description">
          Use manual keys only if you cannot run sortiri init with a setup token.
        </p>
      </header>

      {open ? (
        <>
          <ApiKeySection workspaceId={workspaceId} onRawKeyChange={onRawKeyChange} />
          <SetupBlock
            label="Manual env vars"
            code={`SORTIRI_API_URL=https://your-sortiri-app.com
SORTIRI_API_KEY=sk_sortiri_...
# Optional when using workspace API keys:
# SORTIRI_WORKSPACE_ID=your-workspace-id`}
          />
        </>
      ) : null}
    </section>
  );
}
