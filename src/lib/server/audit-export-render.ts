import { NextResponse } from "next/server";
import type { ShareableReportExportInput } from "@/types/audit-sharing";
import { exportHtml, AUDIT_HTML_FILENAME } from "@/lib/audits/exportHtml";
import { exportJsonString } from "@/lib/audits/exportJson";
import { exportMarkdown } from "@/lib/audits/exportMarkdown";

type ExportFormat = "markdown" | "html" | "json";

export function renderExportResponse(
  format: ExportFormat,
  payload: ShareableReportExportInput,
): NextResponse {
  const slug = payload.report.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  switch (format) {
    case "markdown": {
      const body = exportMarkdown(payload);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="sortiri-audit-${slug || "report"}.md"`,
        },
      });
    }
    case "html": {
      const body = exportHtml(payload);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${AUDIT_HTML_FILENAME}"`,
        },
      });
    }
    case "json": {
      const body = exportJsonString(payload);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="sortiri-audit-manifest-${slug || "report"}.json"`,
        },
      });
    }
    default:
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }
}

export function exportBodyByteSize(body: string): number {
  return new TextEncoder().encode(body).length;
}

export function getExportBody(format: ExportFormat, payload: ShareableReportExportInput): string {
  switch (format) {
    case "markdown":
      return exportMarkdown(payload);
    case "html":
      return exportHtml(payload);
    case "json":
      return exportJsonString(payload);
    default:
      return "";
  }
}
