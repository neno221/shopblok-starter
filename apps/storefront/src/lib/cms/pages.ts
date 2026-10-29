import "server-only";
import type { Page } from "../../payload-types";
import { cmsRead } from "./read";

/** What a page read returns until T65's template needs more: its title, slug and blocks (T63). */
export type CmsPage = { id: number; title: string; slug: string; layout: Page["layout"] };

/**
 * One page by its slug in the market's language (D73). T65 turns this into the lookup by full path
 * that `{m}/[...slug]` uses; until then the test-only page `/[market]/e2e-cms/[slug]` reads it.
 */
export const readPageBySlug = cmsRead(
  async (payload, query, slug: string): Promise<CmsPage | null> => {
    const { docs } = await payload.find({
      collection: "pages",
      ...query,
      locale: query.locale as never,
      where: { slug: { equals: slug } },
      // The blocks' uploads and internal links, populated (T63's `RenderBlocks` resolves them).
      depth: 1,
      select: { title: true, slug: true, layout: true },
      limit: 1,
      pagination: false,
    });
    const page = docs[0];
    return page === undefined
      ? null
      : { id: page.id, title: page.title, slug: page.slug, layout: page.layout ?? [] };
  },
  { name: "cms:page-by-slug", tags: (locale) => [`pages:${locale}`, "payload:pages"] },
);
