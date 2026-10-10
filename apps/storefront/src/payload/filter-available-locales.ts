import type { Locale, Payload, PayloadRequest } from "payload";
import { DEFAULT_LOCALE } from "./locales";

type MarketsDoc = {
  countries?: { enabled?: boolean | null; languages?: string[] | null }[] | null;
};

/** The languages of the enabled countries. */
export function enabledLanguages(markets: MarketsDoc): Set<string> {
  const languages = new Set<string>();
  for (const country of markets.countries ?? []) {
    if (country.enabled === false) continue;
    for (const language of country.languages ?? []) languages.add(language);
  }
  return languages;
}

/**
 * The locales the admin offers: the enabled languages and the default one, in the config's order.
 * It never returns `[]` (an empty list is the edge case Payload's admin does not like), and it
 * never hides the default locale, so a fresh database with no markets still shows English.
 */
export function pickAvailableLocales(locales: Locale[], enabled: ReadonlySet<string>): Locale[] {
  const picked = locales.filter(
    (locale) => locale.code === DEFAULT_LOCALE || enabled.has(locale.code),
  );
  return picked.length > 0 ? picked : locales.slice(0, 1);
}

/** Postgres `undefined_table`; drizzle puts the driver's error on `cause`. */
const UNDEFINED_TABLE = "42P01";

export function isMissingTable(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ((current as { code?: unknown }).code === UNDEFINED_TABLE) return true;
  }
  return false;
}

async function readEnabledLanguages(payload: Payload, req?: PayloadRequest) {
  try {
    // Not on behalf of the signed-in user: which languages exist is the shop's setting, so an
    // editor who may not read `markets` still gets the same selector. And with the caller's `req`
    // only inside a write's transaction (`filterAvailableLocales`): a result that is shared between
    // requests (below) must not depend on one.
    const markets = await payload.findGlobal({
      slug: "markets",
      depth: 0,
      overrideAccess: true,
      ...(req && { req }),
    });
    return enabledLanguages(markets);
  } catch (error) {
    // A missing table (before `payload migrate`) must not take the admin down. Any other error is
    // not "no markets enabled": it is left to fail the request rather than shrink the selector.
    if (!isMissingTable(error)) throw error;
    payload.logger.warn({ err: error }, "markets: the table is missing, run `payload migrate`");
    return new Set<string>();
  }
}

/**
 * How long one read of `markets` serves every call, in milliseconds.
 *
 * Payload calls the filter three times for one admin page load (the root layout twice and the page
 * once, S3 L7), and each call gets a `req` of its own: `initReq` hands out a copy of the request,
 * and its `context` with it. What the first call keeps in `req.context` is not there for the
 * others, and a variable in this module is no better, because the layout and the page each load
 * their own instance of it. A memo that works has to live on `globalThis`, and it has to be keyed
 * by time: nothing in the calls says which HTTP request they belong to (`req.headers` is a new
 * Proxy per `headers()` call, and React's `cache()` scope was shared by only two of the three).
 * Two seconds is long enough for one page and short enough that a person who saved `markets`
 * reads the new list on the next page; a save clears it at once (`clearEnabledLanguagesAfterSave`).
 * Another server process is up to this much behind, counted in that process's own running time.
 */
export const ENABLED_LANGUAGES_TTL_MS = 2_000;

/**
 * How long after a save the memo is cleared a second time. Payload runs a global's `afterChange`
 * hooks and only then commits the save's transaction, so a read that starts between the two still
 * sees the old `markets` and would be kept for `ENABLED_LANGUAGES_TTL_MS`. A commit is one round
 * trip to the database; a quarter of a second is far more than it takes.
 */
export const COMMIT_GRACE_MS = 250;

type Memo = { payload: Payload; at: number; enabled: Promise<Set<string>> };
const MEMO = Symbol.for("shopblok.enabledLanguages");
const shared = globalThis as typeof globalThis & { [MEMO]?: Memo };

/** Forgets the read, so the next call reads `markets` again. */
export function clearEnabledLanguages(): void {
  delete shared[MEMO];
}

/** The `markets` global calls it from `afterChange`: now, and again once the save has committed. */
export function clearEnabledLanguagesAfterSave(): void {
  clearEnabledLanguages();
  setTimeout(clearEnabledLanguages, COMMIT_GRACE_MS).unref();
}

function sharedRead(payload: Payload): Promise<Set<string>> {
  // `performance.now()` and not `Date.now()`: the same monotonic clock `lib/markets` uses, because
  // Cache Components refuse `Date.now()` in a render (SETUP.md, T10 item 1).
  const now = performance.now();
  const memo = shared[MEMO];
  if (memo?.payload === payload && now - memo.at < ENABLED_LANGUAGES_TTL_MS) return memo.enabled;
  const entry: Memo = { payload, at: now, enabled: readEnabledLanguages(payload) };
  shared[MEMO] = entry;
  // A read that failed is not kept: the next call tries again.
  entry.enabled.catch(() => {
    if (shared[MEMO] === entry) delete shared[MEMO];
  });
  return entry.enabled;
}

/**
 * Payload's `localization.filterAvailableLocales`. It only filters the admin's locale selector,
 * the version view and (experimental) the publish menu; the REST and Local API still accept every
 * preloaded locale, so the storefront enforces markets itself (S3, L8). The read of `markets` is
 * shared between the calls Payload makes for one page (`ENABLED_LANGUAGES_TTL_MS`). A write calls
 * it too (to choose the locales that get a publication status, once `localizeStatus` is on), with
 * its transaction open and holding a connection: that read joins the transaction and is not
 * shared, or each write would wait for a second connection while it holds the first.
 */
export async function filterAvailableLocales({
  locales,
  req,
}: {
  locales: Locale[];
  req: PayloadRequest;
}): Promise<Locale[]> {
  const enabled = req.transactionID
    ? await readEnabledLanguages(req.payload, req)
    : await sharedRead(req.payload);
  return pickAvailableLocales(locales, enabled);
}
