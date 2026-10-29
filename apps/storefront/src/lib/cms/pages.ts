import "server-only";
import type { Page } from "../../payload-types";
import { pageIdOf, pagePaths, type PageNode, type PagePaths } from "./page-path";
import { cmsRead } from "./read";
import { readSiteSettings } from "./site";
import { pageTags } from "./tags";

/** What a page read returns: its id, title, slug, parent and blocks (T63, T65). */
export type CmsPage = {
  id: number;
  title: string;
  slug: string;
  parent: number | null;
  layout: Page["layout"];
};

const toCmsPage = (page: Pick<Page, "id" | "title" | "slug" | "parent" | "layout">): CmsPage => ({
  id: page.id,
  title: page.title,
  slug: page.slug,
  parent: pageIdOf(page.parent),
  layout: page.layout ?? [],
});

/** The page fields a page read selects; the blocks' uploads and internal links come populated. */
const PAGE_SELECT = { title: true, slug: true, parent: true, layout: true } as const;

/**
 * Every page's address in the market's language (D80): the pages a visitor can read (in Draft Mode,
 * an editor's latest versions), each slug as that language reads it (its own, else English's), so
 * an untranslated page keeps its English address in every market. One cached entry per language,
 * tagged `pages:<locale>`, that the route, the static params, hreflang and the links all read.
 */
export const readPagePaths = cmsRead(
  async (payload, query): Promise<PagePaths> => {
    const { docs } = await payload.find({
      collection: "pages",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: { slug: true, title: true, parent: true },
      limit: 0,
      pagination: false,
      // Oldest first, so of two pages with one address the older keeps it (`pagePaths`).
      sort: "createdAt",
    });
    return pagePaths(docs as PageNode[]);
  },
  { name: "cms:page-paths", tags: (locale) => pageTags(locale) },
);

/** One page by its id, in the market's language, with its blocks (read at depth 1). */
export const readPageById = cmsRead(
  async (payload, query, id: number): Promise<CmsPage | null> => {
    const { docs } = await payload.find({
      collection: "pages",
      ...query,
      locale: query.locale as never,
      where: { id: { equals: id } },
      depth: 1,
      select: PAGE_SELECT,
      limit: 1,
      pagination: false,
    });
    const page = docs[0];
    return page === undefined ? null : toCmsPage(page);
  },
  { name: "cms:page-by-id", tags: (locale) => pageTags(locale) },
);

/**
 * One page by its slug in the market's language, whatever its parent: the test-only page
 * `/[market]/e2e-cms/[slug]` reads it (`cms-blocks`, `cms-commerce-blocks` and `forms` specs).
 */
export const readPageBySlug = cmsRead(
  async (payload, query, slug: string): Promise<CmsPage | null> => {
    const { docs } = await payload.find({
      collection: "pages",
      ...query,
      locale: query.locale as never,
      where: { slug: { equals: slug } },
      depth: 1,
      select: PAGE_SELECT,
      limit: 1,
      pagination: false,
    });
    const page = docs[0];
    return page === undefined ? null : toCmsPage(page);
  },
  { name: "cms:page-by-slug", tags: (locale) => pageTags(locale) },
);

type Reader = Parameters<typeof readPagePaths>[0];

/**
 * The page at `path` inside the market (D80's route), with every address of its language: `null`
 * when no page a visitor (or, in Draft Mode, the editor) can read has that address, or with no
 * database.
 */
export async function readPageByPath(
  reader: Reader,
  path: string,
): Promise<{ page: CmsPage; paths: PagePaths } | null> {
  const paths = await readPagePaths(reader);
  const id = paths?.byPath[path];
  if (paths === null || id === undefined) return null;
  const page = await readPageById(reader, id);
  return page === null ? null : { page, paths };
}

/**
 * The page `site-settings.homepage` names (D80), if a visitor can read it (it is published; in
 * Draft Mode, the editor's latest version): `{m}/` then draws it. `null` when none is named, it is
 * not published, or there is no database, and `{m}/` draws M3's home.
 */
export async function readHomepage(reader: Reader): Promise<CmsPage | null> {
  const settings = await readSiteSettings(reader);
  const id = pageIdOf(settings?.homepage);
  return id === null ? null : readPageById(reader, id);
}

/** The homepage's id, when the site settings name one (the homepage's own address points home). */
export async function readHomepageId(reader: Reader): Promise<number | null> {
  return pageIdOf((await readSiteSettings(reader))?.homepage);
}

/**
 * A page's address in each of `languages` (published, D80's hreflang): English's slug where a
 * language has none of its own. A language where the page has no address is left out.
 */
export async function pageAddresses(
  id: number,
  languages: readonly string[],
): Promise<Record<string, string>> {
  const found = await Promise.all(
    languages.map(async (language) => {
      const paths = await readPagePaths({ market: { language }, draft: false });
      return [language, paths?.byId[String(id)]?.path] as const;
    }),
  );
  return Object.fromEntries(
    found.filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
