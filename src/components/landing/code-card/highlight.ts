export type CodeLanguage = "typescript" | "python" | "bash";

export type TokenKind =
  | "plain"
  | "keyword"
  | "string"
  | "comment"
  | "function"
  | "property"
  | "number"
  | "flag"
  | "url"
  | "punct";

export type CodeToken = {
  text: string;
  kind: TokenKind;
};

const TS_KEYWORDS = new Set([
  "import",
  "from",
  "const",
  "await",
  "new",
  "export",
  "type",
  "as",
]);

const PY_KEYWORDS = new Set(["from", "import", "def", "return", "class", "await"]);

function pushPlain(tokens: CodeToken[], text: string) {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last?.kind === "plain") {
    last.text += text;
    return;
  }
  tokens.push({ text, kind: "plain" });
}

function tokenizeStrings(line: string, quote: "'" | '"' | "`"): CodeToken[] {
  const tokens: CodeToken[] = [];
  let i = 0;

  while (i < line.length) {
    const start = line.indexOf(quote, i);
    if (start === -1) {
      pushPlain(tokens, line.slice(i));
      break;
    }

    pushPlain(tokens, line.slice(i, start));
    let end = start + 1;
    while (end < line.length) {
      if (line[end] === "\\") {
        end += 2;
        continue;
      }
      if (line[end] === quote) {
        end += 1;
        break;
      }
      end += 1;
    }

    tokens.push({ text: line.slice(start, end), kind: "string" });
    i = end;
  }

  return tokens;
}

function tokenizeTypeScriptLine(line: string): CodeToken[] {
  const base = tokenizeStrings(line, '"');
  const tokens: CodeToken[] = [];

  for (const chunk of base) {
    if (chunk.kind !== "plain") {
      tokens.push(chunk);
      continue;
    }

    const parts = chunk.text.split(/(\b[a-zA-Z_$][\w$]*\b|[{}()[\].,:;]|\/\/.*$)/g).filter(Boolean);
    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi];
      if (part.startsWith("//")) {
        tokens.push({ text: part, kind: "comment" });
        continue;
      }
      if (TS_KEYWORDS.has(part)) {
        tokens.push({ text: part, kind: "keyword" });
        continue;
      }
      if (/^\d+$/.test(part)) {
        tokens.push({ text: part, kind: "number" });
        continue;
      }
      if (/^[{}()[\].,:;]$/.test(part)) {
        tokens.push({ text: part, kind: "punct" });
        continue;
      }
      if (/^[a-zA-Z_$][\w$]*$/.test(part)) {
        const next = parts[pi + 1];
        tokens.push({
          text: part,
          kind: next === "(" ? "function" : "property",
        });
        continue;
      }
      pushPlain(tokens, part);
    }
  }

  return tokens;
}

function tokenizePythonLine(line: string): CodeToken[] {
  const base = tokenizeStrings(line, '"');
  const tokens: CodeToken[] = [];

  for (const chunk of base) {
    if (chunk.kind !== "plain") {
      tokens.push(chunk);
      continue;
    }

    const parts = chunk.text.split(/(\b[a-zA-Z_][\w]*\b|#.*$|[{}()[\].,:;=]|\/\/.*$)/g).filter(Boolean);
    for (const part of parts) {
      if (part.startsWith("#")) {
        tokens.push({ text: part, kind: "comment" });
        continue;
      }
      if (PY_KEYWORDS.has(part)) {
        tokens.push({ text: part, kind: "keyword" });
        continue;
      }
      if (/^[{}()[\].,:;=]$/.test(part)) {
        tokens.push({ text: part, kind: "punct" });
        continue;
      }
      if (/^[a-zA-Z_][\w]*$/.test(part)) {
        tokens.push({ text: part, kind: "function" });
        continue;
      }
      pushPlain(tokens, part);
    }
  }

  return tokens;
}

function tokenizeBashLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const parts = line.split(/('[^']*'|"[^"]*"|\s+|--[\w-]+|https?:\/\/[^\s]+|\$[\w_]+)/g).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith("#")) {
      tokens.push({ text: part, kind: "comment" });
      continue;
    }
    if (part.startsWith("'") || part.startsWith('"')) {
      tokens.push({ text: part, kind: "string" });
      continue;
    }
    if (part.startsWith("--")) {
      tokens.push({ text: part, kind: "flag" });
      continue;
    }
    if (part.startsWith("http")) {
      tokens.push({ text: part, kind: "url" });
      continue;
    }
    if (part.startsWith("$")) {
      tokens.push({ text: part, kind: "property" });
      continue;
    }
    if (/^(curl|sortiri|pnpm|pip|-X|-H|-d)$/i.test(part.trim())) {
      tokens.push({ text: part, kind: "keyword" });
      continue;
    }
    pushPlain(tokens, part);
  }

  return tokens;
}

export function highlightLine(line: string, language: CodeLanguage): CodeToken[] {
  if (language === "typescript") return tokenizeTypeScriptLine(line);
  if (language === "python") return tokenizePythonLine(line);
  return tokenizeBashLine(line);
}

export function highlightCode(code: string, language: CodeLanguage): CodeToken[][] {
  return code.split("\n").map((line) => highlightLine(line, language));
}
