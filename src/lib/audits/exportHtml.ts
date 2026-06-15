import type { ShareableReportExportInput } from "@/types/audit-sharing";
import { EXPORT_SAFETY_NOTICE } from "@/types/audit-sharing";
import { exportMarkdown } from "./exportMarkdown";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(ms?: number): string {
  if (!ms) return "—";
  return new Date(ms).toISOString();
}

export const AUDIT_HTML_FILENAME = "sortiri-audit-report.html";

export function exportHtml(payload: ShareableReportExportInput): string {
  const markdown = exportMarkdown(payload);
  const body = escapeHtml(markdown).replace(/\n/g, "<br>\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Audit Report: ${escapeHtml(payload.report.title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #111; }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .meta { color: #555; margin-bottom: 1.5rem; }
    .notice { margin-top: 2rem; padding: 1rem; background: #f5f5f5; border-left: 4px solid #888; }
    pre { white-space: pre-wrap; word-break: break-word; background: #fafafa; padding: 1rem; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Audit Report: ${escapeHtml(payload.report.title)}</h1>
  <p class="meta">
    Status: Finalized<br />
    Finalized at: ${escapeHtml(formatDate(payload.report.finalizedAt))}<br />
    Exported at: ${escapeHtml(formatDate(payload.exportedAt ?? Date.now()))}
  </p>
  <pre>${body}</pre>
  <p class="notice">${escapeHtml(EXPORT_SAFETY_NOTICE)}</p>
</body>
</html>`;
}
