import type { SensitiveFinding, SensitiveFindingSeverity, SensitiveScanResult } from "./types";
import { SEVERITY_RANK } from "./types";

type PatternDef = {
  type: string;
  label: string;
  severity: SensitiveFindingSeverity;
  pattern: RegExp;
};

const PATTERNS: PatternDef[] = [
  {
    type: "openai_api_key",
    label: "OpenAI API Key",
    severity: "critical",
    pattern: /OPENAI_API_KEY\s*=\s*[^\s'"]+/gi,
  },
  {
    type: "anthropic_api_key",
    label: "Anthropic API Key",
    severity: "critical",
    pattern: /ANTHROPIC_API_KEY\s*=\s*[^\s'"]+/gi,
  },
  {
    type: "stripe_secret_key",
    label: "Stripe Secret Key",
    severity: "critical",
    pattern: /STRIPE_SECRET_KEY\s*=\s*[^\s'"]+/gi,
  },
  {
    type: "github_token",
    label: "GitHub Token",
    severity: "critical",
    pattern: /GITHUB_TOKEN\s*=\s*[^\s'"]+/gi,
  },
  {
    type: "stripe_sk",
    label: "Stripe Secret Key",
    severity: "critical",
    pattern: /\bsk_live_[A-Za-z0-9]+\b/g,
  },
  {
    type: "stripe_test_sk",
    label: "Stripe Test Key",
    severity: "high",
    pattern: /\bsk_test_[A-Za-z0-9]+\b/g,
  },
  {
    type: "private_key",
    label: "Private Key",
    severity: "critical",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    type: "bearer_token",
    label: "Bearer Token",
    severity: "high",
    pattern: /\bBearer\s+[A-Za-z0-9._\-+/=]{8,}\b/gi,
  },
  {
    type: "jwt_token",
    label: "JWT Token",
    severity: "high",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    type: "database_url",
    label: "Database URL",
    severity: "high",
    pattern: /\b(?:postgres|postgresql|mongodb):\/\/[^\s'"]+/gi,
  },
  {
    type: "password_assignment",
    label: "Password Assignment",
    severity: "high",
    pattern: /password\s*=\s*[^\s'"]+/gi,
  },
  {
    type: "secret_assignment",
    label: "Secret Assignment",
    severity: "high",
    pattern: /secret\s*=\s*[^\s'"]+/gi,
  },
  {
    type: "token_assignment",
    label: "Token Assignment",
    severity: "high",
    pattern: /token\s*=\s*[^\s'"]+/gi,
  },
  {
    type: "env_line",
    label: "Environment Variable",
    severity: "medium",
    pattern: /^[A-Z][A-Z0-9_]{2,}\s*=\s*[^\s'"]+/gm,
  },
];

function mergeFindings(findings: SensitiveFinding[]): SensitiveFinding[] {
  const map = new Map<string, SensitiveFinding>();
  for (const finding of findings) {
    const key = `${finding.type}:${finding.severity}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += finding.count;
    } else {
      map.set(key, { ...finding });
    }
  }
  return Array.from(map.values());
}

export function scanSensitiveContent(input: string): SensitiveScanResult {
  if (!input) {
    return {
      hasSensitiveContent: false,
      maxSeverity: "low",
      findings: [],
    };
  }

  const findings: SensitiveFinding[] = [];
  for (const def of PATTERNS) {
    const matches = input.match(def.pattern);
    if (matches && matches.length > 0) {
      findings.push({
        type: def.type,
        label: def.label,
        count: matches.length,
        severity: def.severity,
      });
    }
  }

  const merged = mergeFindings(findings);
  if (merged.length === 0) {
    return {
      hasSensitiveContent: false,
      maxSeverity: "low",
      findings: [],
    };
  }

  const maxSeverity = merged.reduce<SensitiveFindingSeverity>(
    (max, finding) =>
      SEVERITY_RANK[finding.severity] > SEVERITY_RANK[max] ? finding.severity : max,
    "low",
  );

  return {
    hasSensitiveContent: true,
    maxSeverity,
    findings: merged,
  };
}

export function truncateForScan(input: string, maxChars = 50_000): string {
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars);
}
