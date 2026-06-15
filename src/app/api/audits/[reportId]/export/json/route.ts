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

export async function GET(_request: Request, context: RouteContext) {
  const { reportId } = await context.params;

  try {
    const payload = await fetchAuthenticatedExportPayload(reportId);
    if (!payload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = getExportBody("json", payload);
    const sizeBytes = exportBodyByteSize(body);

    try {
      await recordAuthenticatedExport({
        reportId,
        format: "json",
        status: "generated",
        sizeBytes,
      });
    } catch {
      // ignore tracking failure
    }

    return renderExportResponse("json", payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
