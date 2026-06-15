const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

function parseEncryptionKeyBytes(): Uint8Array {
  const raw = process.env.SORTIRI_SECRET_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "Missing SORTIRI_SECRET_ENCRYPTION_KEY — set a 32-byte key as base64 or hex in Convex env",
    );
  }

  const fromBase64 = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  if (fromBase64.length === 32) {
    return fromBase64;
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1) {
      bytes[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  throw new Error(
    "SORTIRI_SECRET_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or hex)",
  );
}

async function importKey(): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(parseEncryptionKeyBytes());
  return crypto.subtle.importKey("raw", keyBytes, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(rawSecret: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(rawSecret);
  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const encryptedBytes = new Uint8Array(encrypted);
  const authTag = encryptedBytes.slice(-16);
  const ciphertext = encryptedBytes.slice(0, -16);
  const packed = new Uint8Array(iv.length + authTag.length + ciphertext.length);
  packed.set(iv, 0);
  packed.set(authTag, iv.length);
  packed.set(ciphertext, iv.length + authTag.length);
  return btoa(String.fromCharCode(...packed));
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

export function maskSecretForSource(
  secretLast4: string,
  source: string,
): string {
  if (source === "github") {
    return maskSecret(`placeholder_${secretLast4}`, "github");
  }
  if (source === "posthog") {
    return maskSecret(`placeholder_${secretLast4}`, "posthog");
  }
  return maskSecret(`placeholder_${secretLast4}`, "stripe");
}
