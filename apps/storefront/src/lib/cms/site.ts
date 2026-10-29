import "server-only";
import type { Footer, Header, SiteSetting } from "../../payload-types";
import { globalTag } from "./globals";
import { cmsRead, type CmsQuery } from "./read";
import type { Payload } from "payload";

/**
 * What the globals' references are read with (depth 1): an upload's file and size, a catalog
 * document's handle and whether Medusa deleted it, and the newsletter's form's fields (T67), which
 * is all `lib/cms/shell.ts` needs. The
 * cached entries stay small, and nothing else of a product reaches them.
 */
const POPULATE = {
  media: { url: true, filename: true, alt: true, width: true, height: true },
  products: { handle: true, deletedInMedusa: true },
  categories: { handle: true, deletedInMedusa: true },
  collections: { handle: true, deletedInMedusa: true },
  forms: { fields: true },
} as const;

function readGlobal<T>(slug: "header" | "footer" | "site-settings") {
  return cmsRead(
    async (payload: Payload, query: CmsQuery): Promise<T> =>
      (await payload.findGlobal({
        slug,
        ...query,
        locale: query.locale as never,
        depth: 1,
        populate: POPULATE as never,
      })) as T,
    { name: `cms:global:${slug}`, tags: (locale) => [globalTag(slug, locale)] },
  );
}

/**
 * The content globals in the market's language (D73, D78), each tagged `global:<slug>:<locale>`
 * so a publish refreshes it (`contentGlobal`'s hooks). `null` with no database (the build's
 * stand-in); `lib/cms/shell.ts` then gives `site.ts`'s values.
 */
export const readHeader = readGlobal<Header>("header");
export const readFooter = readGlobal<Footer>("footer");
export const readSiteSettings = readGlobal<SiteSetting>("site-settings");
