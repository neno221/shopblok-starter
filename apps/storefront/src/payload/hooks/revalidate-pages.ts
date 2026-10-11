import { revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from "payload";
import { DEFAULT_LOCALE } from "../locales";

/**
 * `req.context` key: for each page id saved in this request, whether it was published before. A
 * bulk update runs its documents on one shared `req`, so this is a record by id, not one flag.
 */
const PUBLISHED_BEFORE = "pagesPublishedBefore";
type PublishedBefore = Record<string, boolean>;

/** What Next's `revalidateTag` throws when it is called outside a Next request. */
export const OUTSIDE_NEXT = "static generation store missing";

function revalidate(req: PayloadRequest): void {
  if (req.context?.["disableRevalidate"]) return;
  const locale = req.locale ?? DEFAULT_LOCALE;
  try {
    revalidateTag(`pages:${locale}`, "max");
    revalidateTag("payload:pages", "max");
  } catch (error) {
    if (String(error).includes(OUTSIDE_NEXT)) {
      // Not inside a Next request: there is no cache here to refresh.
      req.payload.logger.debug(`pages: no revalidation outside Next (${String(error)})`);
    } else {
      req.payload.logger.warn(
        { err: error },
        "pages: revalidateTag failed, so cached pages may be stale",
      );
    }
  }
}

/**
 * Before a save: is the page visitors read (the row, not its newest draft) published right now?
 * Payload hands `afterChange` the page's latest *version* as `previousDoc`, and that is a draft
 * when an editor saved one over the published text, so an unpublish after that looks like
 * draft -> draft there; `revalidatePages` reads the answer back from `req.context`.
 */
export const rememberPublished: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const id = originalDoc?.id;
  if (operation !== "update" || id == null || req.context?.["disableRevalidate"]) return data;
  const page = await req.payload.db.findOne<{ id: number | string; _status?: string }>({
    collection: "pages",
    where: { id: { equals: id } },
    select: { _status: true },
    req,
  });
  const before = (req.context[PUBLISHED_BEFORE] ??= {}) as PublishedBefore;
  before[String(id)] = page?._status === "published";
  return data;
};

/**
 * A change to a published `pages` document revalidates the tags the storefront's cached reads of
 * pages carry (SPEC §7.7, §8.3; ADR 0001): `pages:<locale>` for the language that was saved, and
 * `payload:pages` for every reader. `'max'` is stale-while-revalidate, the profile for content: the
 * first request after a save may still show the old text and starts the refresh, and the next one
 * shows the new.
 *
 * - A draft that was never published changes nothing visitors can read, so it revalidates nothing.
 *   A save that *unpublishes* does change it, even over a newer draft (`rememberPublished`), and so
 *   does the delete of a published page (`revalidateDeletedPage`).
 * - `revalidateTag` works inside Next (here: Payload's REST handler, which is where the admin
 *   saves) and throws elsewhere (a Payload script, `payload migrate`). The call is wrapped, because
 *   a save from a script must not fail for lack of a cache to refresh. Only that case is quiet: any
 *   other failure is logged as a warning, because the cache would then serve stale pages for hours.
 * - A caller that writes many documents (an M4 seed, an import) sets `req.context.disableRevalidate`
 *   and revalidates once at the end.
 *
 * M4 extends this with the tags its cached reads use; the readers of `pages:<locale>` today are the
 * test-only routes under `/next/e2e`.
 */
export const revalidatePages: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  const before = req.context?.[PUBLISHED_BEFORE] as PublishedBefore | undefined;
  const touchesPublished =
    doc?._status === "published" ||
    previousDoc?._status === "published" ||
    before?.[String(doc?.id)] === true;
  if (touchesPublished) revalidate(req);
  return doc;
};

/** A deleted page that was published leaves the cached reads; a draft never was in them. */
export const revalidateDeletedPage: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (doc?._status === "published") revalidate(req);
  return doc;
};
