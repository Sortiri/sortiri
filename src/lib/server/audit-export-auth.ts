import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ShareableReportExportInput } from "@/types/audit-sharing";

export async function getAuthenticatedConvexClient(): Promise<ConvexHttpClient> {
  const { getToken, userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Convex URL not configured");
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    throw new Error("Unauthorized");
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
}

export function getPublicConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Convex URL not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

export async function fetchAuthenticatedExportPayload(
  reportId: string,
): Promise<ShareableReportExportInput | null> {
  const client = await getAuthenticatedConvexClient();
  const payload = await client.query(api.auditSharing.getExportPayloadForReport, {
    reportId: reportId as Id<"auditReports">,
  });
  if (!payload) {
    return null;
  }
  return { ...payload, exportedAt: Date.now() };
}

export async function fetchShareExportPayload(
  token: string,
): Promise<ShareableReportExportInput | null> {
  const client = getPublicConvexClient();
  const payload = await client.query(api.auditSharing.getExportPayloadForShareToken, {
    token,
  });
  if (!payload) {
    return null;
  }
  return { ...payload, exportedAt: Date.now() };
}

export async function recordAuthenticatedExport(args: {
  reportId: string;
  format: "markdown" | "html" | "json";
  status: "generated" | "failed";
  sizeBytes?: number;
  error?: string;
}): Promise<void> {
  const client = await getAuthenticatedConvexClient();
  await client.mutation(api.auditSharing.recordExport, {
    reportId: args.reportId as Id<"auditReports">,
    format: args.format,
    status: args.status,
    sizeBytes: args.sizeBytes,
    error: args.error,
  });
}

export async function recordShareExport(args: {
  reportId: string;
  token: string;
  format: "markdown" | "html" | "json";
  status: "generated" | "failed";
  sizeBytes?: number;
  error?: string;
}): Promise<void> {
  const client = getPublicConvexClient();
  await client.mutation(api.auditSharing.recordExport, {
    reportId: args.reportId as Id<"auditReports">,
    format: args.format,
    status: args.status,
    sizeBytes: args.sizeBytes,
    error: args.error,
    shareToken: args.token,
  });
}
