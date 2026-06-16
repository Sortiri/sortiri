import type { CodeLanguage } from "@/components/landing/code-card/highlight";
import { highlightLine } from "@/components/landing/code-card/highlight";

type CodeLineProps = {
  line: string;
  language: CodeLanguage;
};

const KIND_CLASS: Record<string, string> = {
  keyword: "code-card__token--keyword",
  string: "code-card__token--string",
  comment: "code-card__token--comment",
  function: "code-card__token--function",
  property: "code-card__token--property",
  number: "code-card__token--number",
  flag: "code-card__token--flag",
  url: "code-card__token--url",
  punct: "code-card__token--punct",
};

export function CodeLine({ line, language }: CodeLineProps) {
  const tokens = highlightLine(line, language);

  return (
    <span className="code-card__line">
      {tokens.map((token, index) => (
        <span
          key={`${index}-${token.text}`}
          className={KIND_CLASS[token.kind] ?? undefined}
        >
          {token.text || "\u00a0"}
        </span>
      ))}
    </span>
  );
}
