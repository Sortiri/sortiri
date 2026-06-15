export {
  redactSecrets,
  redactSensitiveContent,
  scanSensitiveContent,
  truncateForScan,
} from "@sortiri/security";

export const MAX_ARTIFACT_CONTENT_CHARS = 12000;
export const TRUNCATION_SUFFIX = "\n[Sortiri truncated this diff]";
export const MAX_COMMAND_OUTPUT_CHARS = 20000;
export const COMMAND_TRUNCATION_SUFFIX = "\n[Sortiri truncated this command output]";

const SENSITIVE_BASENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".wasm",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".mov",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
]);

export function isSensitiveArtifactPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const baseName = normalized.split("/").pop() ?? normalized;

  if (SENSITIVE_BASENAMES.has(baseName)) {
    return true;
  }

  if (baseName.endsWith(".pem") || baseName.endsWith(".key")) {
    return true;
  }

  if (normalized.includes("/.env") || normalized.startsWith(".env")) {
    return true;
  }

  return false;
}

export function isBinaryExtension(ext: string): boolean {
  return BINARY_EXTENSIONS.has(ext.toLowerCase());
}

export function truncateArtifactContent(
  content: string,
  maxChars = MAX_ARTIFACT_CONTENT_CHARS,
): { content: string; truncated: boolean } {
  if (content.length <= maxChars) {
    return { content, truncated: false };
  }

  return {
    content: `${content.slice(0, maxChars)}${TRUNCATION_SUFFIX}`,
    truncated: true,
  };
}

export function truncateCommandOutput(
  content: string,
  maxChars = MAX_COMMAND_OUTPUT_CHARS,
): { content: string; truncated: boolean } {
  if (content.length <= maxChars) {
    return { content, truncated: false };
  }

  return {
    content: `${content.slice(0, maxChars)}${COMMAND_TRUNCATION_SUFFIX}`,
    truncated: true,
  };
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    const rounded = seconds >= 10 ? Math.round(seconds) : Math.round(seconds * 10) / 10;
    return `${rounded}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
