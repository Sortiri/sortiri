import { NextResponse } from "next/server";
import { getPublicConvexClient } from "@/lib/server/audit-export-auth";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

type RouteContext = {
  params: Promise<{ token: string; artifactId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token, artifactId } = await context.params;
  const client = getPublicConvexClient();

  const artifact = await client.query(api.auditSharing.getShareableArtifact, {
    token,
    artifactId: artifactId as Id<"artifacts">,
  });

  if (!artifact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(artifact);
}
