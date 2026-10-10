import "server-only";
import { draftMode } from "next/headers";
import { cached } from "../cache";
import { getPayloadClient } from "../cms/payload";
import { bump } from "./runs";

// The cached Local API reads behind the test-only routes under `/next/e2e` (plan T17 step 4). They
// are ADR 0001's prototype reads (S1, commit `dbfec6e`), kept small: what they check is that a
// Payload read inside `"use cache"` is served from the cache, that `revalidateTag` (from Payload's
// hook or from a route handler) refreshes it, and that Draft Mode never reaches a public response.

export type PagesRead = { runId: number; at: string; draft: boolean; titles: string[] };

type Read = (locale: string) => Promise<PagesRead>;

/** `cached()` takes its tags when it is created (ADR 0001), so one wrapper per language and kind. */
function perLocale(make: (locale: string) => Read): Read {
  const reads = new Map<string, Read>();
  return (locale) => {
    let read = reads.get(locale);
    if (read === undefined) {
      read = make(locale);
      reads.set(locale, read);
    }
    return read(locale);
  };
}

// An hour of freshness, so a refresh in a test comes from a tag and never from the clock.
const LIFE = { stale: 300, revalidate: 3600, expire: 86_400 } as const;

async function findPages(language: string, draft: boolean) {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "pages",
    locale: language as never,
    fallbackLocale: false,
    draft,
    // A preview route would have checked its secret by now; a public read is subject to access
    // control and sees published pages only.
    overrideAccess: draft,
    depth: 0,
    pagination: false,
    sort: "createdAt",
  });
  return docs.map((doc) => doc.title ?? "(none)");
}

/**
 * The published titles in one language, under the tags a `pages` hook revalidates
 * (`pages:<locale>` and `payload:pages`): the check that an admin's save shows up.
 */
export const readPublished: Read = perLocale((locale) =>
  cached(
    async (language: string): Promise<PagesRead> => {
      const runId = bump(`published:${language}`);
      const titles = await findPages(language, false);
      return { runId, at: new Date().toISOString(), draft: false, titles };
    },
    {
      name: `e2e:published:${locale}`,
      tags: [`pages:${locale}`, "payload:pages"],
      life: LIFE,
    },
  ),
);

/**
 * The same read under a tag no Payload hook touches (`e2e:pages:<locale>`), so a test can change a
 * page and then decide, with `revalidateTag` from a route handler, when the cache learns of it.
 */
export const readByTag: Read = perLocale((locale) =>
  cached(
    async (language: string): Promise<PagesRead> => {
      const runId = bump(`by-tag:${language}`);
      const titles = await findPages(language, false);
      return { runId, at: new Date().toISOString(), draft: false, titles };
    },
    { name: `e2e:by-tag:${locale}`, tags: [`e2e:pages:${locale}`], life: LIFE },
  ),
);

/**
 * The draft-aware read: `draftMode()` is read **inside** the cached function, the pattern of
 * GHSA-3w37-wq28-93x7. With Draft Mode on it returns the newest drafts; without it, the published
 * pages only. ADR 0001 (Spec changes) says this is evidence that the advisory's fix holds, not a
 * pattern for M4's preview code, which reads `draftMode()` outside and passes `isEnabled` in.
 */
export const readForPreview: Read = perLocale((locale) =>
  cached(
    async (language: string): Promise<PagesRead> => {
      const { isEnabled } = await draftMode();
      const runId = bump(`${isEnabled ? "draft" : "preview-public"}:${language}`);
      const titles = await findPages(language, isEnabled);
      return { runId, at: new Date().toISOString(), draft: isEnabled, titles };
    },
    { name: `e2e:preview:${locale}`, tags: [`e2e:preview:${locale}`], life: LIFE },
  ),
);
