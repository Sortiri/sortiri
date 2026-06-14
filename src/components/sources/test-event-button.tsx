"use client";

import { useCallback, useState } from "react";

type TestEventButtonProps = {
  apiKey: string | null;
  onPasteKey?: (key: string) => void;
};

export function TestEventButton({ apiKey, onPasteKey }: TestEventButtonProps) {
  const [pastedKey, setPastedKey] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveKey = apiKey ?? pastedKey.trim();

  const handleSend = useCallback(async () => {
    if (!effectiveKey) {
      setError("Create or paste an API key first");
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/ingest/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "sdk",
          category: "system_event",
          type: "source.test_event",
          title: "Test event received",
          actor: { type: "system", name: "Sortiri Sources" },
        }),
      });

      const payload = (await response.json()) as { eventId?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to send test event");
      }

      setMessage(
        payload.eventId
          ? `Test event recorded (${payload.eventId}). Check your timeline.`
          : "Test event recorded. Check your timeline.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send test event");
    } finally {
      setSending(false);
    }
  }, [effectiveKey]);

  return (
    <section className="sources-section">
      <header className="sources-section__header">
        <h2 className="sources-section__title">Send test event</h2>
        <p className="sources-section__description">
          Verify ingest is working with a sample event. Uses your API key — workspace is resolved
          server-side.
        </p>
      </header>

      {!apiKey ? (
        <div className="test-event__paste">
          <label className="api-key-create__label" htmlFor="test-api-key">
            Paste API key
          </label>
          <input
            id="test-api-key"
            className="api-key-create__input"
            value={pastedKey}
            onChange={(event) => {
              setPastedKey(event.target.value);
              onPasteKey?.(event.target.value);
            }}
            placeholder="sk_sortiri_..."
            type="password"
            autoComplete="off"
          />
        </div>
      ) : null}

      {error ? <p className="sources-section__error">{error}</p> : null}
      {message ? <p className="sources-section__success">{message}</p> : null}

      <button
        type="button"
        className="sources-button"
        disabled={!effectiveKey || sending}
        onClick={() => void handleSend()}
      >
        {sending ? "Sending…" : "Send test event"}
      </button>
    </section>
  );
}
