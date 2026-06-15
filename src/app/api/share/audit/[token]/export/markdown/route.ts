import { NextResponse } from "next/server";
import {
  fetchShareExportPayload,
  recordShareExport,
} from "@/lib/server/audit-export-auth";
import {
  exportBodyByteSize,
  getExportBody,
  renderExportResponse,
} from "@/lib/server/audit-export-render";

type RouteContext = {
  params: Promise<{ token: string }>;
};

async function handleShareExport(
  token: string,
  format: "markdown" | "html" | "json",
): Promise<NextResponse> {
  const payload = await fetchShareExportPayload(token);
  if (!payload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = getExportBody(format, payload);
  const sizeBytes = exportBodyByteSize(body);

  try {
    await recordShareExport({
      reportId: payload.report.id,
      token,
      format,
      status: "generated",
      sizeBytes,
    });
  } catch {
    // ignore tracking failure
  }

  return renderExportResponse(format, payload);
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  return handleShareExport(token, "markdown");
}
