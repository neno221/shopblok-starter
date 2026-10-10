import "server-only";
import { draftMode } from "next/headers";
import { cached } from "../cache";
import { getPayloadClient } from "../cms/payload";

// S1 prototype (docs/plans/M0.md §6). Not for main: D13 keeps spike code on its branch.

type Runs = Record<string, number>;
const holder = globalThis as typeof globalThis & { __s1Runs?: Runs };
/** How often each loader really ran, per process. A cache hit does not move it. Shared through
 * `globalThis`, because the page and the counter route are different bundles. */
export const runs: Runs = (holder.__s1Runs ??= {});

export type PagesRead = { runId: number; at: string; draft: boolean; titles: string[] };

function bump(key: string): number {
  runs[key] = (runs[key] ?? 0) + 1;
  return runs[key];
}

const published = new Map<string, (locale: string) => Promise<PagesRead>>();

/** The titles of the published `pages` in one language, cached under `pages:<locale>`. One wrapper
 * per language, because `cached()` takes its tags when it is created (S1 finding). */
export function readPublished(locale: string): Promise<PagesRead> {
  let read = published.get(locale);
  if (read === undefined) {
    read = cached(
      async (language: string): Promise<PagesRead> => {
        const payload = await getPayloadClient();
        const runId = bump(`published:${language}`);
        const { docs } = await payload.find({
          collection: "pages",
          locale: language as never,
          fallbackLocale: false,
          overrideAccess: false,
          depth: 0,
          pagination: false,
          sort: "createdAt",
        });
        return {
          runId,
          at: new Date().toISOString(),
          draft: false,
          titles: docs.map((doc) => doc.title ?? "(none)"),
        };
      },
      {
        name: `s1:published:${locale}`,
        tags: [`pages:${locale}`, "payload:pages"],
        life: { stale: 300, revalidate: 3600, expire: 86_400 },
      },
    );
    published.set(locale, read);
  }
  return read(locale);
}

const drafts = new Map<string, (locale: string) => Promise<PagesRead>>();

/** The draft-aware variant: `draftMode()` is read inside the cached function, which is the pattern
 * of GHSA-3w37-wq28-93x7. With Draft Mode on it returns the newest drafts (access control skipped,
 * as a preview route would after checking its secret); otherwise the published pages only. */
export function readForPreview(locale: string): Promise<PagesRead> {
  let read = drafts.get(locale);
  if (read === undefined) {
    read = cached(
      async (language: string): Promise<PagesRead> => {
        const { isEnabled } = await draftMode();
        const payload = await getPayloadClient();
        const runId = bump(`${isEnabled ? "draft" : "preview-public"}:${language}`);
        const { docs } = await payload.find({
          collection: "pages",
          locale: language as never,
          fallbackLocale: false,
          draft: isEnabled,
          overrideAccess: isEnabled,
          depth: 0,
          pagination: false,
          sort: "createdAt",
        });
        return {
          runId,
          at: new Date().toISOString(),
          draft: isEnabled,
          titles: docs.map((doc) => doc.title ?? "(none)"),
        };
      },
      {
        name: `s1:preview:${locale}`,
        tags: [`pages:${locale}`, "payload:pages"],
        life: { stale: 300, revalidate: 3600, expire: 86_400 },
      },
    );
    drafts.set(locale, read);
  }
  return read(locale);
}
