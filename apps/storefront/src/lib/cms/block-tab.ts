import "server-only";
import { CATALOG_HEADERS } from "../listing/handlers";
import { getMarketContext, type MarketContext } from "../market-context";
import { MedusaRequestError } from "../medusa/sdk";
import { readPageById, type CmsPage } from "./pages";
import type { CatalogReads } from "./resolve/catalog";
import { catalogReads } from "./resolve/market";
import { storedVariant } from "./resolve/shared";
import { MAX_TABS, resolveTab, tabVersion, type StoredTab } from "./resolve/tabs";

// `GET /next/block-tab?market=&doc=&block=&tab=&v=` (T81, M5 plan §5 T81, PR 113's review): one tab's
// products of a `tabs` product collection, for its island. The route is the catalog's, as
// `/next/listing` is: the answer is the same for every visitor of the market, so a shared cache may
// keep it a minute. What it trusts is only what an editor published:
// - `doc` names the page that holds the block (a page's id; T87 adds the catalog documents' and the
//   `templates` global's sections), read **published** only, never a draft whatever cookies come
//   with the request: the read is `draft: false`, so no cookie is read at all;
// - `block` is the block's id in that page's layout, which must be a `productCollection` whose
//   stored design is `tabs`, `tab` the tab's place among its stored tabs, and `v` that stored
//   tab's fingerprint (`tabVersion`, its label and source): a tab moved, edited or removed since
//   the page was drawn is a 404, never another tab's products under its label from a cache;
// - the tab's **stored** source is resolved in the market's region (`getMarketContext`, as the
//   listing's route does) through the catalog's cached reads, the same entries the page's first
//   tab is read through. No region, source, limit or sort is read from the query.
// Anything else (an unknown market, page, block or tab, a block that is not `tabs`, a tab with
// nothing the market sells) is a 404; Medusa down is a 503.

/** What the route reads: injected by the tests, the shop's own otherwise. */
type TabContext = Pick<MarketContext, "market" | "region" | "hrefs" | "url">;

export type BlockTabDeps = {
  marketContext: (key: string) => Promise<TabContext | null>;
  /** The page's published version in the market's language, or `null`. */
  readPage: (market: MarketContext["market"], id: number) => Promise<CmsPage | null>;
  reads: (context: TabContext) => CatalogReads;
};

const shopDeps: BlockTabDeps = {
  marketContext: getMarketContext,
  readPage: (market, id) => readPageById({ market, draft: false }, id),
  reads: catalogReads,
};

const nothing = (status: number) =>
  Response.json(null, { status, headers: { "Cache-Control": "no-store" } });

/** A page's id as the query writes it: digits only, no sign, no zero first. */
const DOC = /^[1-9][0-9]{0,9}$/;
/** A block's id as Payload writes them (24 hex characters), or any short id of letters and digits. */
const BLOCK = /^[A-Za-z0-9_-]{1,64}$/;

export async function blockTabResponse(
  request: Request,
  deps: BlockTabDeps = shopDeps,
): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const doc = params.get("doc") ?? "";
  const block = params.get("block") ?? "";
  const tab = Number(params.get("tab") ?? "");
  if (!DOC.test(doc) || !BLOCK.test(block) || !Number.isInteger(tab) || tab < 0 || tab >= MAX_TABS)
    return nothing(404);
  // `tab=1.0`, `tab= 1`: only the plain digit is a tab.
  if (params.get("tab") !== String(tab)) return nothing(404);
  try {
    const context = await deps.marketContext(params.get("market") ?? "");
    if (context === null) return nothing(404);
    const page = await deps.readPage(context.market, Number(doc));
    const found = (page?.layout ?? []).find((each) => each.id === block);
    if (
      found?.blockType !== "productCollection" ||
      storedVariant("product-collection", found.variant) !== "tabs"
    )
      return nothing(404);
    const stored = ((found.tabs ?? []) as StoredTab[]).slice(0, MAX_TABS)[tab];
    if (stored === undefined || params.get("v") !== tabVersion(stored)) return nothing(404);
    const resolved = await resolveTab(
      stored,
      deps.reads(context),
      context.hrefs,
      context.url("/store"),
    );
    if (resolved === null) return nothing(404);
    return Response.json({ products: resolved.products }, { headers: CATALOG_HEADERS });
  } catch (error) {
    if (error instanceof MedusaRequestError) return nothing(503);
    throw error;
  }
}
