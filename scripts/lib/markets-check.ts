// D17, D19 and M4b D97: the market map lives in Medusa's markets module, and the regions and the
// store's locales it is built on are Medusa's too. Doctor reads the module's overview (what
// `GET /admin/markets` answers: the map, the regions, the store's locales and the warnings of D91),
// reports the warnings, and compares the map with the regions and locales itself, so a plugin whose
// own checks have a gap still shows up. Pure: the overview arrives as plain data, read by
// `doctor.ts` (through `GET /admin/markets` when the backend runs and `--online` is given, else
// through `medusa exec src/scripts/doctor-markets.ts`). The shapes are declared here because
// `scripts/` cannot import either app (T10 item 8, T13 item 6); `readMarketsOverview` and
// `readMarketMap` check the real data against them, so a change to either side shows up as an error
// from doctor, not as a wrong answer. `readBackendMarkets` reads `config/markets.ts`, the seed's
// input, which `--online` compares with the regions the running Medusa has (leftover regions).
import { jsonOf, type HttpResult } from "./http.ts";
import type { Check } from "./report.ts";

export type BackendMarkets = {
  /** `SUPPORTED_CURRENCIES`, as currency codes. */
  currencies: string[];
  /** `MARKET_REGIONS`. */
  regions: { name: string; currency: string; countries: string[] }[];
  /** `SUPPORTED_LOCALES`: the Medusa locales the store has. */
  locales: string[];
};

export type MarketMapData = {
  countries: { code: string; enabled: boolean; languages: string[] }[];
  languages: { code: string; medusaLocale: string }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** The three lists out of the module's exports, or why they are not what doctor expects. */
export function readBackendMarkets(exports: Record<string, unknown>): BackendMarkets | string {
  const { SUPPORTED_CURRENCIES, MARKET_REGIONS, SUPPORTED_LOCALES } = exports;

  if (
    !Array.isArray(SUPPORTED_CURRENCIES) ||
    !SUPPORTED_CURRENCIES.every((c) => isRecord(c) && typeof c.currency_code === "string")
  ) {
    return "SUPPORTED_CURRENCIES is not a list of { currency_code }";
  }
  if (
    !Array.isArray(MARKET_REGIONS) ||
    !MARKET_REGIONS.every(
      (r) =>
        isRecord(r) &&
        typeof r.name === "string" &&
        typeof r.currency_code === "string" &&
        isStringArray(r.countries),
    )
  ) {
    return "MARKET_REGIONS is not a list of { name, currency_code, countries }";
  }
  if (!isStringArray(SUPPORTED_LOCALES)) return "SUPPORTED_LOCALES is not a list of strings";

  return {
    currencies: SUPPORTED_CURRENCIES.map((c) =>
      String((c as Record<string, unknown>).currency_code),
    ),
    regions: MARKET_REGIONS.map((r) => {
      const region = r as Record<string, unknown>;
      return {
        name: String(region.name),
        currency: String(region.currency_code),
        countries: region.countries as string[],
      };
    }),
    locales: SUPPORTED_LOCALES,
  };
}

/** A `MarketMap` (the fixtures, or the module's) as far as the comparison reads it. */
export function readMarketMap(value: unknown): MarketMapData | string {
  if (!isRecord(value)) return "the market map is not an object";
  const { countries, languages } = value;
  if (
    !Array.isArray(countries) ||
    !countries.every(
      (c) =>
        isRecord(c) &&
        typeof c.code === "string" &&
        typeof c.enabled === "boolean" &&
        isStringArray(c.languages),
    )
  ) {
    return "the market map's countries are not a list of { code, enabled, languages }";
  }
  if (
    !Array.isArray(languages) ||
    !languages.every(
      (l) => isRecord(l) && typeof l.code === "string" && typeof l.medusaLocale === "string",
    )
  ) {
    return "the market map's languages are not a list of { code, medusaLocale }";
  }
  return {
    countries: countries.map((c) => {
      const country = c as Record<string, unknown>;
      return {
        code: String(country.code),
        enabled: country.enabled === true,
        languages: country.languages as string[],
      };
    }),
    languages: languages.map((l) => {
      const language = l as Record<string, unknown>;
      return { code: String(language.code), medusaLocale: String(language.medusaLocale) };
    }),
  };
}

const quoted = (values: readonly string[]): string => values.map((v) => `"${v}"`).join(", ");

/** One region as the markets overview lists it: its countries are ISO 3166-1 alpha-2, lowercase. */
export type OverviewRegion = { name: string; currency: string; countries: string[] };

/** What doctor needs of `GET /admin/markets`. */
export type MarketsOverviewData = {
  /** The module's map: every country of a region, closed ones included. */
  map: MarketMapData;
  regions: OverviewRegion[];
  /** The store's locales (Store → Locales). */
  locales: string[];
  /** The warnings of D91 (`marketsProblems`), as sentences. */
  problems: string[];
};

/** The overview out of the route's answer (or the doctor script's), or why it is not what doctor expects. */
export function readMarketsOverview(value: unknown): MarketsOverviewData | string {
  if (!isRecord(value)) return "the markets overview is not an object";
  const map = readMarketMap(value.map);
  if (typeof map === "string") return map;
  const { regions, locales, problems } = value;
  if (
    !Array.isArray(regions) ||
    !regions.every(
      (r) =>
        isRecord(r) &&
        typeof r.name === "string" &&
        typeof r.currency_code === "string" &&
        isStringArray(r.countries),
    )
  ) {
    return "the overview's regions are not a list of { name, currency_code, countries }";
  }
  if (!isStringArray(locales)) return "the overview's locales are not a list of strings";
  if (
    !Array.isArray(problems) ||
    !problems.every((p) => isRecord(p) && typeof p.message === "string")
  ) {
    return "the overview's problems are not a list of { code, message }";
  }
  return {
    map,
    regions: regions.map((r) => {
      const region = r as Record<string, unknown>;
      return {
        name: String(region.name),
        currency: String(region.currency_code),
        countries: region.countries as string[],
      };
    }),
    locales,
    problems: problems.map((p) => String((p as Record<string, unknown>).message)),
  };
}

/**
 * Where the module's map and Medusa's regions and locales disagree, as sentences. Empty means they
 * agree. These are the invariants of D90, checked from outside the plugin:
 *
 * - an open country with no region: its pages show the "no region" message, and nothing else warns;
 * - a country in two regions: which one sells there would be a guess;
 * - a region's country the map does not list: the map is meant to list every country of a region
 *   (closed until it is switched on), so the storefront could not tell it from an unknown one;
 * - a language whose `medusaLocale` the store does not have: Medusa answers in English.
 *
 * A closed country in a region is not a problem: it is how a market waits to be switched on.
 */
export function compareMarkets(
  live: { regions: readonly OverviewRegion[]; locales: readonly string[] },
  map: MarketMapData,
): string[] {
  const problems: string[] = [];
  const open = map.countries.filter((country) => country.enabled);
  const listed = new Set(map.countries.map((country) => country.code));
  const regionOf = new Map<string, string>();

  for (const region of live.regions) {
    for (const country of region.countries) {
      const other = regionOf.get(country);
      if (other !== undefined && other !== region.name) {
        problems.push(`country "${country}" is in two regions, "${other}" and "${region.name}"`);
      }
      regionOf.set(country, region.name);
    }
  }
  for (const country of open) {
    if (!regionOf.has(country.code)) {
      problems.push(
        `country "${country.code}" is open in the markets map but no region has it (its pages show the no-region message)`,
      );
    }
  }
  for (const region of live.regions) {
    const missing = region.countries.filter((country) => !listed.has(country));
    if (missing.length > 0) {
      problems.push(
        `region "${region.name}" has ${quoted(missing)}, which the markets map does not list (it lists every country of a region)`,
      );
    }
  }

  const used = new Set(open.flatMap((country) => country.languages));
  for (const code of used) {
    const language = map.languages.find((entry) => entry.code === code);
    // A language with no Medusa locale at all is the module's own warning (`problems`).
    if (language === undefined || language.medusaLocale === "") continue;
    if (!live.locales.includes(language.medusaLocale)) {
      problems.push(
        `language "${code}" uses the Medusa locale "${language.medusaLocale}", which is not one of the store's locales`,
      );
    }
  }
  return problems;
}

/** The hint every mismatch shares: where each thing is edited now (M4b). */
export const MARKETS_FIX =
  "Change it in Medusa Admin: countries in the region's form (Settings → Regions), locales under Settings → Store, and a market's languages and the primary country in the Markets panels on those pages. (SETUP.md, \"Adding a market\".)";

// ---------------------------------------------------------------------------------------------
// The check

const MARKETS = { id: "markets", title: "Markets (Medusa's map)" } as const;

/** What reading the markets overview gave. */
export type MarketsRead =
  /** Not attempted: the Postgres check for the medusa database failed. */
  | { skipped: true }
  | {
      ok: true;
      /** Where it was read: `GET /admin/markets` of the running backend, or the database through `medusa exec`. */
      source: "admin-api" | "medusa-exec";
      overview: MarketsOverviewData;
    }
  | { ok: false; cause: string; fix: string };

/**
 * The check on the markets module (D97): its own warnings, then the map against the regions and
 * locales. Also hands back the map it read.
 */
export function marketsCheck(read: MarketsRead): { check: Check; map: MarketMapData | undefined } {
  if ("skipped" in read) {
    return {
      map: undefined,
      check: {
        ...MARKETS,
        level: "warn",
        message: "not read: the Postgres check above failed, so Medusa was not started.",
      },
    };
  }
  if (!read.ok) {
    return {
      map: undefined,
      check: {
        ...MARKETS,
        level: "error",
        message: `could not read it: ${read.cause}.`,
        fix: read.fix,
      },
    };
  }
  const { overview } = read;
  const { map } = overview;
  const where =
    read.source === "admin-api" ? "GET /admin/markets" : "the markets module (medusa exec)";
  if (map.countries.length === 0) {
    return {
      map: undefined,
      check: {
        ...MARKETS,
        level: "warn",
        message: `${where} lists no country: no region has one, so development and \`next build\` use the seeded fixtures (and say so), and a production storefront answers 500 on every page.`,
        fix: "Run `pnpm bootstrap`, which seeds the regions and the markets, or add countries to a region in Medusa Admin.",
      },
    };
  }
  const details = [...overview.problems, ...compareMarkets(overview, map)];
  const open = map.countries.filter((country) => country.enabled).length;
  if (details.length === 0) {
    return {
      map,
      check: {
        ...MARKETS,
        level: "ok",
        message: `${open} open of ${map.countries.length} countries, ${map.languages.length} languages; the map, Medusa's regions and the store's locales agree.`,
      },
    };
  }
  return {
    map,
    check: {
      ...MARKETS,
      level: "warn",
      message: `the markets in Medusa cannot serve a shop as they are (the storefront keeps the last good map, or the fixtures in development).`,
      details: [...new Set(details)],
      fix: MARKETS_FIX,
    },
  };
}

/**
 * `GET /admin/markets` with the bootstrap admin's token (`--online`, backend running) as a read, or
 * `undefined` when it did not answer with the overview (no server, a refused login, another app on
 * the port): doctor then reads the database with `medusa exec` instead.
 */
export function readAdminMarkets(answer: HttpResult | undefined): MarketsRead | undefined {
  if (answer === undefined || answer.kind !== "response" || answer.status !== 200) return undefined;
  const overview = readMarketsOverview(jsonOf(answer));
  return typeof overview === "string"
    ? {
        ok: false,
        cause: `GET /admin/markets answered something doctor does not understand (${overview})`,
        fix: "Doctor and the markets plugin disagree about the overview's shape.",
      }
    : { ok: true, source: "admin-api", overview };
}
