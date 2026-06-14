import localFont from "next/font/local";

/** PP Mondwest — display headings (matches sortiri-content landing). */
export const ppMondwest = localFont({
  src: "../fonts/PPMondwest-Regular.otf",
  variable: "--font-pp-mondwest",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: false,
});

/** Departure Mono — header nav (swap with ppNeueBit via navLink in typography). */
export const departureMono = localFont({
  src: "../fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: false,
});

/** PP NeueBit — bitmap UI alt for header nav. */
export const ppNeueBit = localFont({
  src: "../fonts/PPNeueBit-Bold.otf",
  weight: "700",
  style: "normal",
  variable: "--font-pp-neue-bit",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: false,
});
