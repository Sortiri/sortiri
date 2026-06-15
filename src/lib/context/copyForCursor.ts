import type { ContextPackFormatted } from "@/types/context-packs";

export function formatContextPackForCursor(formatted: ContextPackFormatted): string {
  const lines = [
    formatted.text,
    "",
    "---",
    "Note: Correlation only — do not claim causation from timeline evidence.",
    `Context pack: ${formatted.pack.title} (${formatted.pack.id})`,
  ];
  return lines.join("\n");
}
