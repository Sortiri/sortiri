async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifyGithubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }
  const digest = await hmacSha256Hex(secret, rawBody);
  const expected = `sha256=${digest}`;
  return timingSafeEqual(expected, signatureHeader);
}

const DEFAULT_TOLERANCE_SECONDS = 300;

export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
): Promise<boolean> {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts.filter((part) => part.startsWith("v1="));

  if (!timestampPart || signatureParts.length === 0) {
    return false;
  }

  const timestamp = Number.parseInt(timestampPart.slice(2), 10);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = await hmacSha256Hex(secret, signedPayload);

  return signatureParts.some((part) => {
    const provided = part.slice(3);
    return timingSafeEqual(expected, provided);
  });
}

export async function buildStripeSignatureHeader(
  rawBody: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = await hmacSha256Hex(secret, signedPayload);
  return `t=${timestamp},v1=${signature}`;
}

export function verifyPostHogBearer(
  authHeader: string | null,
  secret: string,
): boolean {
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.replace("Bearer ", "").trim();
  return timingSafeEqual(token, secret);
}

export async function verifySlackSignature(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  signingSecret: string,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
): Promise<boolean> {
  if (!timestampHeader || !signatureHeader?.startsWith("v0=")) {
    return false;
  }

  const timestamp = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const basestring = `v0:${timestamp}:${rawBody}`;
  const digest = await hmacSha256Hex(signingSecret, basestring);
  const expected = `v0=${digest}`;
  return timingSafeEqual(expected, signatureHeader);
}

export async function buildSlackSignatureHeader(
  rawBody: string,
  signingSecret: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<{ timestamp: string; signature: string }> {
  const basestring = `v0:${timestamp}:${rawBody}`;
  const digest = await hmacSha256Hex(signingSecret, basestring);
  return {
    timestamp: String(timestamp),
    signature: `v0=${digest}`,
  };
}

export async function verifyObservabilitySignature(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  signingSecret: string,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
): Promise<boolean> {
  return verifySlackSignature(
    rawBody,
    timestampHeader,
    signatureHeader,
    signingSecret,
    toleranceSeconds,
  );
}

export async function buildObservabilitySignatureHeader(
  rawBody: string,
  signingSecret: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<{ timestamp: string; signature: string }> {
  return buildSlackSignatureHeader(rawBody, signingSecret, timestamp);
}
