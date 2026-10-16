import type { Metadata } from "next";

/**
 * The metadata of every DS root layout: never indexed, never followed, and (T26) left out of the
 * sitemap and robots.txt (SPEC §9.6). A page adds its own title.
 */
export const designSystemMetadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};
