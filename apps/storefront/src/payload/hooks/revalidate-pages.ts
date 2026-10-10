import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook } from "payload";

/**
 * A change to a published `pages` document revalidates the tags the storefront's cached reads of
 * pages carry (SPEC §7.7, §8.3; ADR 0001): `pages:<locale>` for the language that was saved, and
 * `payload:pages` for every reader. `'max'` is stale-while-revalidate, the profile for content: the
 * first request after a save may still show the old text and starts the refresh, and the next one
 * shows the new.
 *
 * - A draft that was never published changes nothing visitors can read, so it revalidates nothing;
 *   a save that *unpublishes* does, which is why the previous version counts too.
 * - `revalidateTag` works inside Next (here: Payload's REST handler, which is where the admin
 *   saves) and throws elsewhere (a Payload script, `payload migrate`). The call is wrapped, because
 *   a save from a script must not fail for lack of a cache to refresh.
 * - A caller that writes many documents (an M4 seed, an import) sets `req.context.disableRevalidate`
 *   and revalidates once at the end.
 *
 * M4 extends this with the tags its cached reads use; the readers of `pages:<locale>` today are the
 * test-only routes under `/next/e2e`.
 */
export const revalidatePages: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  if (req.context?.["disableRevalidate"]) return doc;
  const touchesPublished = doc?._status === "published" || previousDoc?._status === "published";
  if (!touchesPublished) return doc;
  const locale = req.locale ?? "en";
  try {
    revalidateTag(`pages:${locale}`, "max");
    revalidateTag("payload:pages", "max");
  } catch (error) {
    // Not inside a Next request: there is no cache here to refresh.
    req.payload.logger.debug(`pages: no revalidation outside Next (${String(error)})`);
  }
  return doc;
};
