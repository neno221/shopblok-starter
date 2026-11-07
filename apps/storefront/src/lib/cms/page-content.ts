import type { CmsPage as CmsPageContent } from "@shopblok/registry/contracts";
import { encodePagePath, pageAncestors, type PagePaths } from "./page-path";
import type { CmsPage } from "./pages";
import type { ResolvedBlock } from "./resolve/sections";

/**
 * A CMS page as its template draws it (D80, T65): its title, and the breadcrumbs of a page with
 * parents (Home, the parents with an address in this language, the page). Who has the `<h1>` is
 * `pageHeading`'s, once the blocks are resolved.
 */
export function cmsPageContent(
  page: Pick<CmsPage, "id" | "title">,
  paths: PagePaths,
  { home, url }: { home: string; url: (path: string) => string },
): Omit<CmsPageContent, "heading"> {
  const ancestors = pageAncestors(paths, page.id);
  return {
    title: page.title,
    ...(ancestors.length === 0
      ? {}
      : {
          breadcrumbs: {
            trail: [
              { label: home, href: url("/") },
              ...ancestors.map((each) => ({
                label: each.title,
                href: url(encodePagePath(each.path)),
              })),
            ],
            current: page.title,
          },
        }),
  };
}

/** The blocks whose `full-bleed` member draws its heading on a picture from edge to edge (T82). */
const BANDS: readonly string[] = ["mediaWithText", "promoBanner"];

/**
 * Who has the page's `<h1>`: the first block when it is a hero that is drawn (`RenderBlocks`'
 * `heroTitle`), else the title. From the resolved layout, not the stored one: a hero left out
 * (no catalog for the market, a failed read) leaves the title to the template (PR 98 review, item 1).
 * T82: a full-bleed band (the media with text's or the promo banner's) with a heading and a picture
 * takes it too, as the hero does, so it is `<main>`'s first child and the transparent header lies
 * over its picture (D103); a title drawn above it would push it down.
 */
export function pageHeading(
  blocks: readonly (Pick<ResolvedBlock, "blockType"> & {
    section?: { variant?: string | undefined; heading?: string | undefined; image?: unknown };
  })[],
): "hero" | "title" {
  const first = blocks[0];
  if (first?.blockType === "hero") return "hero";
  const band =
    first !== undefined &&
    BANDS.includes(first.blockType) &&
    first.section?.variant === "full-bleed" &&
    first.section.heading !== undefined &&
    first.section.image !== undefined;
  return band ? "hero" : "title";
}
