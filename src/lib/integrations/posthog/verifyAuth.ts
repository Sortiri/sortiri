import { timingSafeEqual } from "node:crypto";

export function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return null;
  return match[1].trim();
}

export function verifyBearerAuth(
  authHeader: string | null,
  expectedSecret: string,
): boolean {
  const token = parseBearerToken(authHeader);
  if (!token || !expectedSecret) return false;

  const tokenBuf = Buffer.from(token, "utf8");
  const expectedBuf = Buffer.from(expectedSecret, "utf8");
  if (tokenBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(tokenBuf, expectedBuf);
}
