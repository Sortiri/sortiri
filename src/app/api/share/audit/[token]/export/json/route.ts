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

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const payload = await fetchShareExportPayload(token);
  if (!payload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = getExportBody("json", payload);
  const sizeBytes = exportBodyByteSize(body);

  try {
    await recordShareExport({
      reportId: payload.report.id,
      token,
      format: "json",
      status: "generated",
      sizeBytes,
    });
  } catch {
    // ignore
  }

  return renderExportResponse("json", payload);
}
