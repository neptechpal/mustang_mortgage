import { Fraunces, IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from "next/font/google";

// Display serif: H1/H2, large numerals. Variable with soft optical sizing.
export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

// UI + body.
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  variable: "--font-plex",
  display: "swap",
});

// Nepali (Devanagari). Not preloaded: only downloaded when Devanagari glyphs appear (unicode-range).
export const plexDevanagari = IBM_Plex_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-deva",
  display: "swap",
  preload: false,
});

export const webFontVars = [fraunces.variable, plexSans.variable, plexDevanagari.variable].join(" ");
