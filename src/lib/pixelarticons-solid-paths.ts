/**
 * Pixelarticons "solid" style paths (filled · rounded corners).
 * @see https://pixelarticons.com/styles/
 */

export const PIXELARTICONS_SOLID_PATHS = {
  home: "M6 8V6h2V4h2V2h4v2h2v2h2v2h2v10h-2v2H4v-2H2V10h2V8h2Zm4 6v6h4v-6h-4Z",
  play: "M9 5h2v2h2v2h2v2h2v2h-2v2h-2v2h-2v2H9v2H7V3h2v2Z",
  grid3x3:
    "M8 22H4v-2H2v-4h6v6Zm6 0h-4v-6h4v6Zm8-6v4h-2v2h-4v-6h6ZM8 14H2v-4h6v4Zm6 0h-4v-4h4v4Zm8 0h-6v-4h6v4ZM8 8H2V4h2V2h4v6Zm6 0h-4V2h4v6Zm6-4h2v4h-6V2h4v2Z",
  message: "M20 4h2v12h-2v2H6v2H4v2H2V4h2V2h16v2Z",
  shield:
    "M14 22h-4v-2H8v-2H6v-2H4v-2H2V4h2V2h16v2h2v10h-2v2h-2v2h-2v2h-2v2Z",
  note: "M16 22H4v-2H2V4h2V2h16v2h2v12h-2v-4h-6v2h-2v6h4v2Zm2-2h-2v-2h2v2Zm2-2h-2v-2h2v2Z",
  zap: "M14 9h8v4h-2v2h-2v2h-2v2h-2v2h-2v2h-2v-8H2v-4h2V9h2V7h2V5h2V3h2V1h2v8Z",
  settings2:
    "M10 14h2v2h10v2H12v2h-2v2H6v-2H4v-2H2v-2h2v-2h2v-2h4v2Zm8-10h2v2h2v2h-2v2h-2v2h-4v-2h-2V8H2V6h10V4h2V2h4v2Z",
} as const;

export type PixelarticonsSolidName = keyof typeof PIXELARTICONS_SOLID_PATHS;
