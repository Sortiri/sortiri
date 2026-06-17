/** Convex HTTP Actions base URL for backend API E2E checks. */
export function getConvexHttpUrl(): string {
  const direct =
    process.env.SORTIRI_API_URL ??
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    process.env.CONVEX_SITE_URL;
  if (direct) {
    return direct.replace(/\/$/, "");
  }

  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (cloud) {
    return cloud.replace(/\.convex\.cloud\/?$/, ".convex.site").replace(/\/$/, "");
  }

  throw new Error(
    "Set SORTIRI_API_URL or NEXT_PUBLIC_CONVEX_URL for Convex HTTP E2E tests",
  );
}
