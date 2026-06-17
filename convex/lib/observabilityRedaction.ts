import { redactSensitiveContent } from "./sensitiveContent";

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "proxy-authorization",
  "x-csrf-token",
  "x-amz-security-token",
]);

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

const STACK_TRACE_LINE =
  /^\s*(?:at\s+.+|File\s+".+",\s+line\s+\d+|Traceback\s+\(most recent call last\):)/m;

const MAX_STACK_LINES = 12;

function redactString(value: string): string {
  let out = redactSensitiveContent(value).redacted;
  out = out.replace(EMAIL_PATTERN, "[REDACTED: EMAIL]");
  return out;
}

function redactStackTrace(value: string): string {
  if (!STACK_TRACE_LINE.test(value)) return redactString(value);
  const lines = value.split("\n");
  const kept: string[] = [];
  let stackLines = 0;
  for (const line of lines) {
    if (STACK_TRACE_LINE.test(line)) {
      stackLines += 1;
      if (stackLines > MAX_STACK_LINES) {
        kept.push("[REDACTED: STACK_TRACE_TRUNCATED]");
        break;
      }
    }
    kept.push(redactString(line));
  }
  return kept.join("\n");
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_HEADER_KEYS.has(lower)) return true;
  return (
    lower.includes("secret") ||
    lower.includes("token") ||
    lower.includes("password") ||
    lower.includes("api_key") ||
    lower.includes("apikey") ||
    lower.includes("credential")
  );
}

export function redactObservabilityValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[REDACTED: MAX_DEPTH]";
  if (value == null) return value;
  if (typeof value === "string") return redactStackTrace(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactObservabilityValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(record)) {
      if (isSensitiveKey(key)) {
        out[key] = `[REDACTED: ${key.toUpperCase()}]`;
        continue;
      }
      const lower = key.toLowerCase();
      if (lower === "headers" || lower === "request_headers" || lower === "response_headers") {
        out[key] = redactObservabilityHeaders(child);
        continue;
      }
      out[key] = redactObservabilityValue(child, depth + 1);
    }
    return out;
  }
  return value;
}

export function redactObservabilityHeaders(headers: unknown): unknown {
  if (!headers || typeof headers !== "object") return headers;
  if (Array.isArray(headers)) {
    return headers.map((entry) => redactObservabilityHeaders(entry));
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (isSensitiveKey(key) || SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      out[key] = "[REDACTED: HEADER]";
    } else if (typeof value === "string") {
      out[key] = redactString(value);
    } else {
      out[key] = redactObservabilityValue(value, 1);
    }
  }
  return out;
}

export function redactObservabilityPayload<T>(payload: T): T {
  return redactObservabilityValue(payload) as T;
}
