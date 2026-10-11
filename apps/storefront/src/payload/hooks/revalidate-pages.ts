import { revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from "payload";
import { DEFAULT_LOCALE } from "../locales";

/**
 * A change to a published `pages` document revalidates the tags the storefront's cached reads of
 * pages carry (SPEC §7.7, §8.3; ADR 0001): `pages:<locale>` for the language that was saved, and
 * `payload:pages` for every reader. `'max'` is stale-while-revalidate, the profile for content: the
 * first request after a save may still show the old text and starts the refresh, and the next one
 * shows the new.
 *
 * - A draft that was never published changes nothing visitors can read, so it revalidates nothing.
 *   A save that *unpublishes*, and the delete of a published page, do change it. Payload hands
 *   `afterChange` the page's latest *version* as `previousDoc`, and that is a draft when an editor
 *   saved one over the published text, so an unpublish after that looks like draft -> draft there.
 *   `rememberPublished` therefore reads, before the save, whether the page itself (the row visitors
 *   read) is published.
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

/** `req.context` key: for each page id saved in this request, whether it was published before. */
const PUBLISHED_BEFORE = "pagesPublishedBefore";

/** What Next's `revalidateTag` throws when it is called outside a Next request. */
const OUTSIDE_NEXT = "static generation store missing";

function revalidate(req: PayloadRequest): void {
  const locale = req.locale ?? DEFAULT_LOCALE;
  try {
    revalidateTag(`pages:${locale}`, "max");
    revalidateTag("payload:pages", "max");
  } catch (error) {
    if (String(error).includes(OUTSIDE_NEXT)) {
      // Not inside a Next request: there is no cache here to refresh.
      req.payload.logger.debug(`pages: no revalidation outside Next (${String(error)})`);
    } else {
      req.payload.logger.warn({
        err: error,
        msg: "pages: revalidateTag failed, so cached pages may be stale",
      });
    }
  }
}

/** Before a save: is the page visitors read (not its newest draft) published right now? */
export const rememberPublished: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const id: unknown = originalDoc?.id;
  if (operation !== "update" || (typeof id !== "number" && typeof id !== "string")) return data;
  const page = await req.payload.db.findOne<{ id: number | string; _status?: string }>({
    collection: "pages",
    where: { id: { equals: id } },
    req,
  });
  const before = (req.context[PUBLISHED_BEFORE] ??= {}) as Record<string, boolean>;
  before[String(id)] = page?._status === "published";
  return data;
};

export const revalidatePages: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  if (req.context?.["disableRevalidate"]) return doc;
  const before = req.context?.[PUBLISHED_BEFORE] as Record<string, boolean> | undefined;
  const touchesPublished =
    doc?._status === "published" ||
    previousDoc?._status === "published" ||
    before?.[String(doc?.id)] === true;
  if (!touchesPublished) return doc;
  revalidate(req);
  return doc;
};

/** A deleted page that was published leaves the cached reads; a draft never was in them. */
export const revalidateDeletedPage: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (req.context?.["disableRevalidate"]) return doc;
  if (doc?._status === "published") revalidate(req);
  return doc;
};
