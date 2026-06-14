"use client";

type DiffBlockProps = {
  content: string;
};

function getDiffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return "diff-block__line diff-block__line--file";
  }
  if (line.startsWith("@@")) {
    return "diff-block__line diff-block__line--hunk";
  }
  if (line.startsWith("+")) {
    return "diff-block__line diff-block__line--add";
  }
  if (line.startsWith("-")) {
    return "diff-block__line diff-block__line--remove";
  }
  return "diff-block__line";
}

export function DiffBlock({ content }: DiffBlockProps) {
  const lines = content.split("\n");

  return (
    <pre className="diff-block">
      <code>
        {lines.map((line, index) => (
          <span key={`${index}-${line.slice(0, 12)}`} className={getDiffLineClass(line)}>
            {line}
            {index < lines.length - 1 ? "\n" : ""}
          </span>
        ))}
      </code>
    </pre>
  );
}
