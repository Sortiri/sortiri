import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function parseEncryptionKey(): Buffer {
  const raw = process.env.SORTIRI_SECRET_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "Missing SORTIRI_SECRET_ENCRYPTION_KEY — set a 32-byte key as base64 or hex in .env.local",
    );
  }

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) {
    return base64;
  }

  const hex = Buffer.from(raw, "hex");
  if (hex.length === 32) {
    return hex;
  }

  throw new Error(
    "SORTIRI_SECRET_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or hex)",
  );
}

export function encryptSecret(rawSecret: string): string {
  const key = parseEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(rawSecret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(encryptedSecret: string): string {
  const key = parseEncryptionKey();
  const data = Buffer.from(encryptedSecret, "base64");
  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Invalid encrypted secret payload");
  }
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export type MaskableIntegrationSource = "stripe" | "github" | "posthog";

export function maskSecret(
  rawSecret: string,
  source: MaskableIntegrationSource = "stripe",
): string {
  const last4 = rawSecret.length >= 4 ? rawSecret.slice(-4) : rawSecret;
  if (source === "github") {
    return `whsec_sortiri_••••${last4}`;
  }
  if (source === "posthog") {
    return `phsec_sortiri_••••${last4}`;
  }
  return `whsec_••••${last4}`;
}
