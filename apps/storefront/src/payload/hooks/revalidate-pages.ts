import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook } from "payload";

/**
 * S1 prototype of the `pages` hook: a change that touches published content revalidates the tags
 * the storefront's cached reads carry. `revalidateTag` works only inside Next (a route handler or
 * a server function), so a Payload script or `payload migrate` outside Next skips it.
 */
export const revalidatePages: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  const touchesPublished = doc._status === "published" || previousDoc?._status === "published";
  if (req.headers?.get("x-s1-skip-revalidate")) return doc;
  if (!touchesPublished) return doc;
  const locale = req.locale ?? "en";
  try {
    revalidateTag(`pages:${locale}`, "max");
    revalidateTag("payload:pages", "max");
    console.log(`[s1] revalidateTag pages:${locale} ok (status ${doc._status})`);
  } catch (error) {
    // Not inside a Next request (scripts, migrations): nothing to revalidate.
    console.log(`[s1] revalidateTag pages:${locale} threw: ${String(error)}`);
  }
  return doc;
};
