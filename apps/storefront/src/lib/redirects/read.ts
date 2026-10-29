import "server-only";
import type { Redirect } from "../../payload-types";
import { postPath } from "../cms/paths";
import { encodePagePath } from "../cms/page-path";
import { pageAddresses } from "../cms/pages";
import { postSlugsIn } from "../cms/posts";
import { cmsRead } from "../cms/read";
import { getRenderMarketMap } from "../markets/cached-market-map";
import { listMarkets } from "../markets/market";
import { referenceOf, storedEntry, type RedirectList, type StoredRedirect } from "./rules";
import { REDIRECTS_TAG } from "../cms/tags";

/**
 * Every redirect as Payload stores it (D82): one cached entry, tagged `redirects`. They are not
 * localized, so the read is English's, whatever the market.
 */
const readRedirectDocs = cmsRead(
  async (payload, query): Promise<StoredRedirect[]> => {
    const { docs } = await payload.find({
      collection: "redirects",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: { from: true, to: true, type: true },
      limit: 0,
      pagination: false,
      sort: "createdAt",
    });
    return docs as Pick<Redirect, "from" | "to" | "type">[];
  },
  { name: "cms:redirects", tags: () => [REDIRECTS_TAG] },
);

/**
 * The redirects the proxy answers (D82, `/next/redirects`): each `from` as written, and its target
 * as a custom URL or as the page's or post's address in every language the open markets speak,
 * from the same cached reads the pages' routes and hreflang use (`pages:<locale>`,
 * `posts:<locale>`), so a renamed page moves its redirects with it. A redirect to a page or post
 * with no published address is left out. No database: no redirects.
 */
export async function readRedirectList(): Promise<RedirectList> {
  const docs = await readRedirectDocs({ market: { language: "en" }, draft: false });
  if (docs === null || docs.length === 0) return { redirects: [] };
  const map = await getRenderMarketMap();
  const languages = [...new Set(listMarkets(map).map((market) => market.language))];
  const addresses = await Promise.all(
    docs.map(async (doc): Promise<Record<string, string> | undefined> => {
      const reference = referenceOf(doc);
      if (reference === undefined) return undefined;
      if (reference.relationTo === "pages") {
        const paths = await pageAddresses(reference.id, languages);
        return Object.fromEntries(
          Object.entries(paths).map(([language, path]) => [language, encodePagePath(path)]),
        );
      }
      const slugs = await postSlugsIn(reference.id, languages);
      return Object.fromEntries(
        Object.entries(slugs).flatMap(([language, slug]) => {
          const path = postPath(slug);
          return path === null ? [] : [[language, path]];
        }),
      );
    }),
  );
  const redirects = docs.flatMap((doc, index) => {
    const entry = storedEntry(doc, () => addresses[index]);
    if (entry === undefined) return [];
    return "paths" in entry.to && Object.keys(entry.to.paths).length === 0 ? [] : [entry];
  });
  return { redirects };
}
