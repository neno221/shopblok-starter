import type { Page } from "../../payload-types";
import type { CatalogContentSlug } from "./tags";

// D104 (T87): the sections a product's, a category's or a collection's page shows, after the
// product's information or the listing's results. Pure, so the reads (`catalog.ts`,
// `templates.ts`), the pages, the tab route (`block-tab.ts`) and their tests share it.

/** What a synced document's `sectionsMode` says: the `templates` global's, its own, or none. */
export const CATALOG_SECTIONS_MODES = ["default", "own", "none"] as const;
export type CatalogSectionsMode = (typeof CATALOG_SECTIONS_MODES)[number];

/** The page a document's sections show on, and whose default sections it takes. */
export type SectionsPage = "productPage" | "listing";

/** The blocks as Payload stores them (a page's `layout`'s shape: the sections offer a subset). */
export type SectionBlocks = NonNullable<Page["layout"]>;

/** A synced document's sections as stored: its mode and its own blocks. */
export type StoredSections = { mode: CatalogSectionsMode; sections: SectionBlocks };

/** The page the sections of a synced collection's document show on. */
export const SECTIONS_PAGE: Record<CatalogContentSlug, SectionsPage> = {
  products: "productPage",
  categories: "listing",
  collections: "listing",
};

/**
 * Which document holds a block the page draws, as `/next/block-tab`'s `doc` names it (T81's tab
 * island): a page by its id (`7`), a synced document's own sections by its kind and handle
 * (`product:demo-tee`), the `templates` global's defaults by their tab (`templates:listing`).
 */
export type SectionsDocument =
  | { kind: "page"; id: number }
  | { kind: CatalogContentSlug; handle: string }
  | { kind: "templates"; page: SectionsPage };

const KIND_NAME: Record<CatalogContentSlug, string> = {
  products: "product",
  categories: "category",
  collections: "collection",
};
const TEMPLATE_TAB: Record<SectionsPage, string> = { productPage: "product", listing: "listing" };

/** A document as the route's `doc` writes it. */
export function documentRef(document: SectionsDocument): string {
  if (document.kind === "page") return String(document.id);
  if (document.kind === "templates") return `templates:${TEMPLATE_TAB[document.page]}`;
  return `${KIND_NAME[document.kind]}:${document.handle}`;
}

/** A page's id as the query writes it: digits only, no sign, no zero first. */
const PAGE_ID = /^[1-9][0-9]{0,9}$/;
/** A Medusa handle as the URLs use it: letters, digits, `-` and `_`. */
const HANDLE = /^[A-Za-z0-9_-]{1,128}$/;

/** The route's `doc` read back, or `null` for anything it does not write. */
export function parseDocumentRef(ref: string): SectionsDocument | null {
  if (PAGE_ID.test(ref)) return { kind: "page", id: Number(ref) };
  const colon = ref.indexOf(":");
  if (colon < 0) return null;
  const [kind, rest] = [ref.slice(0, colon), ref.slice(colon + 1)];
  if (kind === "templates") {
    const page = (Object.keys(TEMPLATE_TAB) as SectionsPage[]).find(
      (each) => TEMPLATE_TAB[each] === rest,
    );
    return page === undefined ? null : { kind: "templates", page };
  }
  const slug = (Object.keys(KIND_NAME) as CatalogContentSlug[]).find(
    (each) => KIND_NAME[each] === kind,
  );
  return slug === undefined || !HANDLE.test(rest) ? null : { kind: slug, handle: rest };
}

/** A stored `sectionsMode`: `default` for a document written before T87 or a value it does not know. */
export function sectionsModeOf(value: unknown): CatalogSectionsMode {
  return (CATALOG_SECTIONS_MODES as readonly unknown[]).includes(value)
    ? (value as CatalogSectionsMode)
    : "default";
}

/** A stored blocks field as blocks: an array, or none. */
export const blocksOf = (value: unknown): SectionBlocks =>
  Array.isArray(value) ? (value as SectionBlocks) : [];

/**
 * The sections a page shows (D104's precedence) and the document that holds them: the document's
 * own with `own` (none if it has none), nothing with `none`, and the `templates` global's for its
 * page with `default`, which is also what a page with no Payload document shows (the sync has not
 * written it yet). `defaults` is `null` with no database, or a global never saved: nothing then.
 */
export function chooseSections(
  stored: StoredSections | null,
  defaults: SectionBlocks | null,
  owner: { kind: CatalogContentSlug; handle: string },
): { blocks: SectionBlocks; document: SectionsDocument } | null {
  const mode = stored?.mode ?? "default";
  if (mode === "none") return null;
  if (mode === "own") {
    const blocks = stored?.sections ?? [];
    return blocks.length === 0 ? null : { blocks, document: owner };
  }
  return defaults === null || defaults.length === 0
    ? null
    : { blocks: defaults, document: { kind: "templates", page: SECTIONS_PAGE[owner.kind] } };
}
