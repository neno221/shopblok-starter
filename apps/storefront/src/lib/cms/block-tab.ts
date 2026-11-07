import "server-only";
import { CATALOG_HEADERS } from "../listing/handlers";
import { getMarketContext, type MarketContext } from "../market-context";
import { MedusaRequestError } from "../medusa/sdk";
import {
  readCategorySections,
  readCollectionSections,
  readProductSections,
} from "./catalog";
import { parseDocumentRef, type SectionBlocks, type SectionsDocument } from "./catalog-sections";
import { readPageById } from "./pages";
import type { CatalogReads } from "./resolve/catalog";
import { catalogReads } from "./resolve/market";
import { storedVariant } from "./resolve/shared";
import { MAX_TABS, resolveTab, tabVersion, type StoredTab } from "./resolve/tabs";
import { readTemplateSections } from "./templates";

// `GET /next/block-tab?market=&doc=&block=&tab=&v=` (T81, M5 plan §5 T81, PR 113's review): one tab's
// products of a `tabs` product collection, for its island. The route is the catalog's, as
// `/next/listing` is: the answer is the same for every visitor of the market, so a shared cache may
// keep it a minute. What it trusts is only what an editor published:
// - `doc` names the document that holds the block, read **published** only, never a draft whatever
//   cookies come with the request: the read is `draft: false`, so no cookie is read at all. A page
//   by its id (`7`, its layout); since T87 (D104) a product's, a category's or a collection's own
//   sections by its kind and handle (`product:demo-tee`, only while its `sectionsMode` is `own`, so
//   only blocks its page draws), and the `templates` global's default sections by their page
//   (`templates:product`, `templates:listing`; `catalog-sections.ts` writes and reads them);
// - `block` is the block's id in that document's blocks, which must be a `productCollection` whose
//   stored design is `tabs`, `tab` the tab's place among its stored tabs, and `v` that stored
//   tab's fingerprint (`tabVersion`, its label and source): a tab moved, edited or removed since
//   the page was drawn is a 404, never another tab's products under its label from a cache;
// - the tab's **stored** source is resolved in the market's region (`getMarketContext`, as the
//   listing's route does) through the catalog's cached reads, the same entries the page's first
//   tab is read through. No region, source, limit or sort is read from the query.
// Anything else (an unknown market, document, block or tab, a block that is not `tabs`, a tab with
// nothing the market sells) is a 404; Medusa down is a 503.

/** What the route reads: injected by the tests, the shop's own otherwise. */
type TabContext = Pick<MarketContext, "market" | "region" | "hrefs" | "url">;

export type BlockTabDeps = {
  marketContext: (key: string) => Promise<TabContext | null>;
  /** The document's published blocks in the market's language, or `null` for no such document. */
  readBlocks: (
    market: MarketContext["market"],
    document: SectionsDocument,
  ) => Promise<SectionBlocks | null>;
  reads: (context: TabContext) => CatalogReads;
};

const OWN_SECTIONS = {
  products: readProductSections,
  categories: readCategorySections,
  collections: readCollectionSections,
} as const;

/** The blocks a published document holds, as its page draws them: none for anything else. */
async function publishedBlocks(
  market: MarketContext["market"],
  document: SectionsDocument,
): Promise<SectionBlocks | null> {
  const reader = { market, draft: false };
  if (document.kind === "page") return (await readPageById(reader, document.id))?.layout ?? null;
  if (document.kind === "templates") return readTemplateSections(reader, document.page);
  const stored = await OWN_SECTIONS[document.kind](reader, document.handle);
  return stored?.mode === "own" ? stored.sections : null;
}

const shopDeps: BlockTabDeps = {
  marketContext: getMarketContext,
  readBlocks: publishedBlocks,
  reads: catalogReads,
};

const nothing = (status: number) =>
  Response.json(null, { status, headers: { "Cache-Control": "no-store" } });

/** A block's id as Payload writes them (24 hex characters), or any short id of letters and digits. */
const BLOCK = /^[A-Za-z0-9_-]{1,64}$/;

export async function blockTabResponse(
  request: Request,
  deps: BlockTabDeps = shopDeps,
): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const doc = parseDocumentRef(params.get("doc") ?? "");
  const block = params.get("block") ?? "";
  const tab = Number(params.get("tab") ?? "");
  if (doc === null || !BLOCK.test(block) || !Number.isInteger(tab) || tab < 0 || tab >= MAX_TABS)
    return nothing(404);
  // `tab=1.0`, `tab= 1`: only the plain digit is a tab.
  if (params.get("tab") !== String(tab)) return nothing(404);
  try {
    const context = await deps.marketContext(params.get("market") ?? "");
    if (context === null) return nothing(404);
    const blocks = await deps.readBlocks(context.market, doc);
    const found = (blocks ?? []).find((each) => each.id === block);
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
