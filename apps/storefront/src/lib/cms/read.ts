import "server-only";
import { headers } from "next/headers";
import type { Payload } from "payload";
import { cached } from "../cache";
import { env, type RawEnv } from "../env";
import { getPayloadClient } from "./payload";

/**
 * The content reads' life (D73): `CATALOG_LIFE`'s shape. Five minutes stale, an hour's
 * `revalidate` for a change no hook reports, and 30 days' `expire` as the outage budget (ADR 0004,
 * reading 3), now for Payload's database as it is for Medusa: while it is down, a page keeps the
 * content it last read. A publish refreshes the entries through their tags (`revalidateOnPublish`).
 */
export const CMS_LIFE = { stale: 300, revalidate: 3600, expire: 2_592_000 } as const;

/** Every language falls back to English, the language every document is written in first. */
export const CMS_FALLBACK_LOCALE = "en";

/** The signed-in staff member a draft read runs as (Payload's `users`, never an integration). */
type StaffUser = NonNullable<Awaited<ReturnType<Payload["auth"]>>["user"]>;

/**
 * The options every Local API call of a content read spreads in (SPEC §7.1, D73): the locale, its
 * fallback, `draft` and the user the access rules run for. `overrideAccess` is always `false`, so
 * Payload's own rules decide what a read sees: a public read is anonymous (`user: null`) and sees
 * published documents only; a draft read runs as the staff member Draft Mode was opened by. Each
 * loader still names its `depth` and `select`.
 */
export type CmsQuery = {
  locale: string;
  fallbackLocale: typeof CMS_FALLBACK_LOCALE;
  draft: boolean;
  overrideAccess: false;
  user: StaffUser | null;
};

/** What a loader gets: the Local API and the options above. */
export type CmsLoader<Args extends unknown[], Result> = (
  payload: Payload,
  query: CmsQuery,
  ...args: Args
) => Promise<Result>;

/** Who reads: the market's language (ADR 0003: never the request's) and whether Draft Mode is on. */
export type CmsReader = {
  market: { language: string };
  /** `(await draftMode()).isEnabled`, read by the page outside any cached function (ADR 0001). */
  draft: boolean;
};

export type CmsReadOptions<Args extends unknown[]> = {
  /** The cache entry's name, unique per read (see `cached`). */
  name: string;
  /** The entry's tags, per language and arguments (D73: `pages:<locale>`, `global:<slug>:<locale>`…). */
  tags: (locale: string, ...args: Args) => readonly string[];
};

/** No database configured: `next build` in CI, or a fresh clone (D10's stand-in, ADR 0004). */
export function cmsUnavailable(source: RawEnv = env): boolean {
  return !source.PAYLOAD_DATABASE_URL;
}

/**
 * The staff member signed in to Payload on this request, read from its cookie. Only a draft read
 * calls this, and only in Draft Mode, where the page is rendered per request anyway (`private,
 * no-store`), so reading the headers costs no cache.
 */
export async function draftUser(): Promise<StaffUser | null> {
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: await headers() });
  return user?.collection === "users" ? user : null;
}

/**
 * A content read through Payload's Local API, the only way the storefront reads content (D70, D73).
 *
 * - **Published:** cached with `CMS_LIFE` and the tags `tags(locale, …args)`; the key is the name,
 *   the market's language and the arguments, so nothing about the request reaches it.
 * - **Draft:** only when the page passes `draft: true` (Draft Mode is on) *and* a staff member is
 *   signed in to Payload: the read runs as that user with `draft: true` and `overrideAccess: false`,
 *   uncached (Draft Mode re-runs and saves nothing anyway). With Draft Mode on and nobody signed in
 *   (the editor signed out, or the account was removed) it is the published read, so the Draft Mode
 *   cookie alone shows nothing.
 * - **No database** (`PAYLOAD_DATABASE_URL` unset): `null`, without loading Payload. The caller
 *   uses its code default or `notFound()`.
 */
export function cmsRead<Args extends unknown[], Result>(
  load: CmsLoader<Args, Result>,
  { name, tags }: CmsReadOptions<Args>,
): (reader: CmsReader, ...args: Args) => Promise<Result | null> {
  const query = (locale: string, user: StaffUser | null): CmsQuery => ({
    locale,
    fallbackLocale: CMS_FALLBACK_LOCALE,
    draft: user !== null,
    overrideAccess: false,
    user,
  });

  const published = cached(
    async (locale: string, ...args: Args): Promise<Result> =>
      load(await getPayloadClient(), query(locale, null), ...args),
    { name, tags: [], tagsFor: tags, life: CMS_LIFE },
  );

  return async ({ market, draft }, ...args) => {
    if (cmsUnavailable()) return null;
    const locale = market.language;
    const user = draft ? await draftUser() : null;
    if (user === null) return published(locale, ...args);
    return load(await getPayloadClient(), query(locale, user), ...args);
  };
}
