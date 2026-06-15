import { NextResponse } from "next/server";
import {
  fetchAuthenticatedExportPayload,
  recordAuthenticatedExport,
} from "@/lib/server/audit-export-auth";
import {
  exportBodyByteSize,
  getExportBody,
  renderExportResponse,
} from "@/lib/server/audit-export-render";

type RouteContext = {
  params: Promise<{ reportId: string }>;
};

async function handleExport(
  reportId: string,
  format: "markdown" | "html" | "json",
): Promise<NextResponse> {
  try {
    const payload = await fetchAuthenticatedExportPayload(reportId);
    if (!payload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = getExportBody(format, payload);
    const sizeBytes = exportBodyByteSize(body);

    try {
      await recordAuthenticatedExport({
        reportId,
        format,
        status: "generated",
        sizeBytes,
      });
    } catch {
      // Export still succeeds if tracking fails.
    }

    return renderExportResponse(format, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await recordAuthenticatedExport({
        reportId,
        format,
        status: "failed",
        error: message,
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { reportId } = await context.params;
  return handleExport(reportId, "markdown");
}
