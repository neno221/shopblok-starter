import { Inter } from "next/font/google";

// D28: Inter, self-hosted by `next/font` (downloaded at build time, served from our own origin).
// Each subset has its own `unicode-range`, so a Greek page fetches the Greek file and an English
// page doesn't. `variable` sets `--font-inter` on the element that gets the class; the shared
// stylesheet's `--font-sans` reads it (packages/ui/src/styles/globals.css). Call this once: the
// storefront's root layouts import `inter` from here.
export const inter = Inter({
  subsets: ["latin", "latin-ext", "greek"],
  axes: ["opsz"],
  display: "swap",
  // `next/font` preloads every file of the listed subsets on every page when this is true (the
  // default), so /us would fetch the Greek file too. Off, the browser takes the files it needs from
  // the @font-face `unicode-range`s: Greek text pulls the Greek file, nothing else does.
  preload: false,
  variable: "--font-inter",
});
