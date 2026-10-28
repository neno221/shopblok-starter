import "server-only";
import { cmsRead } from "./read";

/** What a page read returns until T63's blocks and T65's template need more. */
export type CmsPage = { id: number; title: string; slug: string };

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
      depth: 0,
      select: { title: true, slug: true },
      limit: 1,
      pagination: false,
    });
    const page = docs[0];
    return page === undefined ? null : { id: page.id, title: page.title, slug: page.slug };
  },
  { name: "cms:page-by-slug", tags: (locale) => [`pages:${locale}`, "payload:pages"] },
);
