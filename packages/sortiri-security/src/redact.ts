import { scanSensitiveContent } from "./scan";
import type { SensitiveScanResult } from "./types";

type RedactPattern = {
  pattern: RegExp;
  replacement: string;
};

const REDACT_PATTERNS: RedactPattern[] = [
  {
    pattern: /OPENAI_API_KEY\s*=\s*[^\s'"]+/gi,
    replacement: "OPENAI_API_KEY=[REDACTED: OPENAI_API_KEY]",
  },
  {
    pattern: /ANTHROPIC_API_KEY\s*=\s*[^\s'"]+/gi,
    replacement: "ANTHROPIC_API_KEY=[REDACTED: ANTHROPIC_API_KEY]",
  },
  {
    pattern: /STRIPE_SECRET_KEY\s*=\s*[^\s'"]+/gi,
    replacement: "STRIPE_SECRET_KEY=[REDACTED: STRIPE_SECRET_KEY]",
  },
  {
    pattern: /GITHUB_TOKEN\s*=\s*[^\s'"]+/gi,
    replacement: "GITHUB_TOKEN=[REDACTED: GITHUB_TOKEN]",
  },
  {
    pattern: /\bsk_live_[A-Za-z0-9]+\b/g,
    replacement: "[REDACTED: STRIPE_SECRET_KEY]",
  },
  {
    pattern: /\bsk_test_[A-Za-z0-9]+\b/g,
    replacement: "[REDACTED: STRIPE_TEST_KEY]",
  },
  {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    replacement: "[REDACTED: PRIVATE_KEY]",
  },
  {
    pattern: /\bBearer\s+[A-Za-z0-9._\-+/=]{8,}\b/gi,
    replacement: "Bearer [REDACTED: BEARER_TOKEN]",
  },
  {
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    replacement: "[REDACTED: JWT_TOKEN]",
  },
  {
    pattern: /\b(?:postgres|postgresql|mongodb):\/\/[^\s'"]+/gi,
    replacement: "[REDACTED: DATABASE_URL]",
  },
  {
    pattern: /password\s*=\s*[^\s'"]+/gi,
    replacement: "password=[REDACTED: PASSWORD]",
  },
  {
    pattern: /secret\s*=\s*[^\s'"]+/gi,
    replacement: "secret=[REDACTED: SECRET]",
  },
  {
    pattern: /token\s*=\s*[^\s'"]+/gi,
    replacement: "token=[REDACTED: TOKEN]",
  },
];

export function redactSensitiveContent(input: string): {
  redacted: string;
  scan: SensitiveScanResult;
} {
  const scan = scanSensitiveContent(input);
  if (!scan.hasSensitiveContent) {
    return { redacted: input, scan };
  }

  let redacted = input;
  for (const { pattern, replacement } of REDACT_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }

  return {
    redacted,
    scan,
  };
}

/** @deprecated Use redactSensitiveContent */
export function redactSecrets(content: string): string {
  return redactSensitiveContent(content).redacted;
}
