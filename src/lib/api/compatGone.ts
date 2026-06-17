import { getSortiriApiUrl } from "@/lib/sortiri/apiUrl";

export function goneResponse(convexPath: string): Response {
  const base = getSortiriApiUrl();
  return Response.json(
    {
      error: "This endpoint has moved to Convex HTTP",
      migrateTo: `${base}/${convexPath.replace(/^\//, "")}`,
      docs: "Set SORTIRI_API_URL to your Convex site URL (https://<deployment>.convex.site)",
    },
    { status: 410 },
  );
}
