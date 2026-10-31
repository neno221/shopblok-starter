import type { Locale, PayloadRequest } from "payload";
import { enabledCountries } from "../lib/markets/market";
import type { MarketMap } from "../lib/markets/types";
import { DEFAULT_LOCALE } from "./locales";
import { marketMap } from "./market-map";

/** The languages of the open countries. */
export function enabledLanguages(map: MarketMap): Set<string> {
  const languages = new Set<string>();
  for (const country of enabledCountries(map)) {
    for (const language of country.languages) languages.add(language);
  }
  return languages;
}

/**
 * The locales the admin offers: the enabled languages and the default one, in the config's order.
 * It never returns `[]` (an empty list is the edge case Payload's admin does not like), and it
 * never hides the default locale, so a shop with no open market still shows English.
 */
export function pickAvailableLocales(locales: Locale[], enabled: ReadonlySet<string>): Locale[] {
  const picked = locales.filter(
    (locale) => locale.code === DEFAULT_LOCALE || enabled.has(locale.code),
  );
  return picked.length > 0 ? picked : locales.slice(0, 1);
}

/**
 * After a failed read of the map, how long the languages of the last good map (or English alone)
 * are used without asking Medusa again. A read that fails because Medusa hangs costs the SDK's
 * timeout (10 s); Payload calls the filter three times for one admin page (S3, L7), and without
 * this each of the three would wait for it.
 */
export const FAILED_READ_TTL_MS = 10_000;

type Memory = {
  /** The open languages of the last map read: what an outage falls back to. */
  lastGood?: ReadonlySet<string>;
  /** When the last read failed, if the failure is still fresh. */
  failedAt?: number;
};
const MEMORY = Symbol.for("shopblok.availableLocales");
const shared = globalThis as typeof globalThis & { [MEMORY]?: Memory };
const memory = (): Memory => (shared[MEMORY] ??= {});

/** Forgets the last good map and the failure, for a test. */
export function clearAvailableLocalesMemory(): void {
  delete shared[MEMORY];
}

type Warn = (message: string) => void;

/**
 * The open languages, from the storefront's market map, which is Medusa's (D95). It never throws:
 * a Medusa that cannot be read must not take Payload's admin down. Then the languages of the last
 * map read serve, or, with none yet, nothing is open and `pickAvailableLocales` offers the default
 * locale alone; either way the log says so, once per `FAILED_READ_TTL_MS`.
 *
 * `read` is the lazy import of the map (`marketMap`), a parameter for the test.
 */
export async function openLanguages(
  warn: Warn,
  read: () => Promise<MarketMap> = marketMap,
): Promise<ReadonlySet<string>> {
  const state = memory();
  // `performance.now()` and not `Date.now()`: the same monotonic clock `lib/markets` uses, because
  // Cache Components refuse `Date.now()` in a render (SETUP.md, T10 item 1).
  const now = performance.now();
  const empty = new Set<string>();
  if (state.failedAt !== undefined && now - state.failedAt < FAILED_READ_TTL_MS) {
    return state.lastGood ?? empty;
  }
  try {
    // The map has its own 30 s cache and shares one read between callers (`lib/markets/source.ts`).
    const languages = enabledLanguages(await read());
    state.lastGood = languages;
    delete state.failedAt;
    return languages;
  } catch (error) {
    state.failedAt = now;
    const why = error instanceof Error ? error.message : String(error);
    warn(
      state.lastGood === undefined
        ? `markets: the market map could not be read (${why}); the language selector offers the default locale only`
        : `markets: the market map could not be read (${why}); the language selector keeps the languages read earlier`,
    );
    return state.lastGood ?? empty;
  }
}

/**
 * Waits for a real request when there is one to wait for. Payload's admin page is also rendered by
 * Next's prerender (Cache Components), where `fetch()` is cut off as the prerender completes: the
 * read of Medusa's map would fail there, and a failed read renews the map held for another 30 s
 * (`source.ts`), so an admin whose first call of the three per page lands in the prerender would
 * never see a change. `connection()` makes the prerender stop here instead (the page's locale
 * selector is a dynamic part of it, as its database reads were before D95). Outside Next (a script,
 * `payload run`) there is no request and nothing to wait for.
 */
async function waitForRequest(): Promise<void> {
  let connection: () => Promise<void>;
  try {
    ({ connection } = await import("next/server"));
  } catch {
    return;
  }
  try {
    await connection();
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) return;
    throw error;
  }
}

/**
 * Payload's `localization.filterAvailableLocales`. It only filters the admin's locale selector,
 * the version view and (experimental) the publish menu; the REST and Local API still accept every
 * preloaded locale, so the storefront enforces markets itself (S3, L8). The open languages are
 * Medusa's (the market map, through a lazy import: `market-map.ts` says why) and a failed read
 * never throws (`openLanguages`); only Next's own interruption of a prerender passes through
 * (`waitForRequest`). A write calls this too, with its transaction open; nothing here reads
 * Payload's database, so there is no connection to share.
 */
export async function filterAvailableLocales({
  locales,
  req,
}: {
  locales: Locale[];
  req: PayloadRequest;
}): Promise<Locale[]> {
  await waitForRequest();
  return pickAvailableLocales(
    locales,
    await openLanguages((message) => req.payload.logger.warn(message)),
  );
}
