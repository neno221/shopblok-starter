import type { CmsPage as CmsPageContent } from "@shopblok/registry/contracts";
import { encodePagePath, pageAncestors, type PagePaths } from "./page-path";
import type { CmsPage } from "./pages";

/**
 * A CMS page as its template draws it (D80, T65): its title; the breadcrumbs of a page with
 * parents (Home, the parents with an address in this language, the page); and who has the `<h1>`,
 * the first block when it is a hero (`RenderBlocks`' `heroTitle`), else the title.
 */
export function cmsPageContent(
  page: Pick<CmsPage, "id" | "title" | "layout">,
  paths: PagePaths,
  { home, url }: { home: string; url: (path: string) => string },
): CmsPageContent {
  const ancestors = pageAncestors(paths, page.id);
  return {
    title: page.title,
    heading: page.layout?.[0]?.blockType === "hero" ? "hero" : "title",
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
