// D17 and D19: the backend's `apps/backend/src/config/markets.ts` and the storefront's market map
// are two lists edited by hand in M0, and they have to agree (T14). Since T60 (D76) the `markets`
// global holds what Medusa has as well (its synced part), and doctor compares the global's two
// parts; the backend's file (the seed's input) stands in for the synced part until the first sync. Pure: both arrive as plain data,
// read by `doctor.ts` (the file through `loadExports`, the map from the `markets` global or from
// `@shopblok/fixtures`). The shapes are declared here because `scripts/` cannot import either app
// (T10 item 8, T13 item 6); `readBackendMarkets` and `readMarketMap` check the real data against them,
// so a change to either file shows up as an error from doctor, not as a wrong answer.
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

/** A `MarketMap` (the fixtures, or `mapFromGlobal`'s result) as far as the comparison reads it. */
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

/** Where the regions, currencies and locales the map is compared with come from, for the messages. */
export type MarketsSource = { name: string; currencies: string; locales: string };

export const FILE_SOURCE: MarketsSource = {
  name: "config/markets.ts",
  currencies: "SUPPORTED_CURRENCIES in config/markets.ts",
  locales: "SUPPORTED_LOCALES in config/markets.ts",
};

export const SYNCED_SOURCE: MarketsSource = {
  name: "Medusa (the markets global's synced part)",
  currencies: "the store's currencies in Medusa",
  locales: "the store's locales in Medusa",
};

/**
 * The global's synced part (T60) as doctor-payload prints it, in the backend list's shape, or
 * undefined while nothing has been synced, or why it is not what doctor expects.
 */
export function readSyncedMarkets(value: unknown): BackendMarkets | undefined | string {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return "the synced part is not an object";
  const { regions, currencies, locales } = value;
  if (
    !Array.isArray(regions) ||
    !regions.every(
      (r) =>
        isRecord(r) &&
        typeof r.name === "string" &&
        typeof r.currency === "string" &&
        isStringArray(r.countries),
    ) ||
    !isStringArray(currencies) ||
    !isStringArray(locales)
  ) {
    return "the synced part is not { regions: { name, currency, countries }[], currencies, locales }";
  }
  if (regions.length === 0 && locales.length === 0) return undefined;
  return {
    currencies,
    regions: regions.map((r) => {
      const region = r as Record<string, unknown>;
      return {
        name: String(region.name),
        currency: String(region.currency),
        countries: region.countries as string[],
      };
    }),
    locales,
  };
}

/**
 * Where the two lists disagree, as sentences. Empty means they agree. Each is a case from D17:
 *
 * - an open country with no region: its pages render the "no region" message, and nothing else warns;
 * - a region country the map does not serve: the shop sells there, nobody can reach it;
 * - a language whose `medusaLocale` the store does not have: Medusa answers in English;
 * - and the backend list against itself (a region in a currency the store lacks, a country in two
 *   regions), which the seed would trip over later.
 */
export function compareMarkets(
  backend: BackendMarkets,
  map: MarketMapData,
  source: MarketsSource = FILE_SOURCE,
): string[] {
  const problems: string[] = [];
  const open = map.countries.filter((country) => country.enabled);
  const openCodes = new Set(open.map((country) => country.code));
  const regionCountries = new Map<string, string>();

  for (const region of backend.regions) {
    if (!backend.currencies.includes(region.currency)) {
      problems.push(
        `region "${region.name}" is in "${region.currency}", which is not in ${source.currencies}`,
      );
    }
    for (const country of region.countries) {
      const other = regionCountries.get(country);
      if (other !== undefined && other !== region.name) {
        problems.push(
          `country "${country}" is in two regions, "${other}" and "${region.name}", in ${source.name}`,
        );
      }
      regionCountries.set(country, region.name);
    }
  }

  for (const country of open) {
    if (!regionCountries.has(country.code)) {
      problems.push(
        `country "${country.code}" is open in the storefront's map but no region in ${source.name} has it (its pages show the no-region message)`,
      );
    }
  }
  for (const region of backend.regions) {
    const unserved = region.countries.filter((country) => !openCodes.has(country));
    if (unserved.length > 0) {
      problems.push(
        `region "${region.name}" has ${quoted(unserved)}, which the storefront's map does not serve (not listed, or disabled)`,
      );
    }
  }

  const used = new Set(open.flatMap((country) => country.languages));
  for (const code of used) {
    const language = map.languages.find((entry) => entry.code === code);
    // A language with no Medusa locale at all is the map's own problem (marketMapProblems says so).
    if (language === undefined || language.medusaLocale === "") continue;
    if (!backend.locales.includes(language.medusaLocale)) {
      problems.push(
        `language "${code}" uses the Medusa locale "${language.medusaLocale}", which is not in ${source.locales}`,
      );
    }
  }
  return problems;
}

/** The hint for a synced part that disagrees with the edited part (D76). */
export const MARKETS_SYNCED_FIX =
  'Change the regions or the store\'s locales in Medusa Admin, or the countries and languages under Globals → Markets in Payload, until they agree (D76; SETUP.md, "Adding a market").';

/** The hint every mismatch shares: which file to edit, and what applies the edit. */
export const MARKETS_FIX =
  "Edit apps/backend/src/config/markets.ts and the markets global (Payload admin, or packages/fixtures for the seed) so they list the same countries and languages (D19); then run `pnpm bootstrap`, which applies the backend side.";

// ---------------------------------------------------------------------------------------------
// The checks

const MARKETS_GLOBAL = { id: "markets-global", title: "Markets global" } as const;
const MARKETS_SYNC = { id: "markets-sync", title: "Markets: backend and storefront" } as const;

/** What reading the `markets` global gave. */
export type MarketsGlobalRead =
  /** Not attempted: the Postgres check failed, so Payload was not started. */
  | { skipped: true }
  | {
      ok: true;
      map: MarketMapData;
      problems: string[];
      /** The synced part (T60), or undefined before the first sync. */
      synced?: BackendMarkets;
    }
  | { ok: false; cause: string; fix: string };

/** The check on the `markets` global, and the map to compare when it is filled in. */
export function marketsGlobalCheck(read: MarketsGlobalRead): {
  check: Check;
  map: MarketMapData | undefined;
} {
  if ("skipped" in read) {
    return {
      map: undefined,
      check: {
        ...MARKETS_GLOBAL,
        level: "warn",
        message: "not read: the Postgres check above failed, so Payload was not started.",
      },
    };
  }
  if (!read.ok) {
    return {
      map: undefined,
      check: {
        ...MARKETS_GLOBAL,
        level: "error",
        message: `could not read it: ${read.cause}.`,
        fix: read.fix,
      },
    };
  }
  if (read.map.countries.length === 0) {
    return {
      map: undefined,
      check: {
        ...MARKETS_GLOBAL,
        level: "warn",
        message:
          "the `markets` global is empty, so development and `next build` use the seeded fixtures (and say so); a production server answers 500 on every page.",
        fix: "Run `pnpm bootstrap`, which fills it, or add the countries in the Payload admin.",
      },
    };
  }
  return {
    map: read.map,
    check:
      read.problems.length === 0
        ? {
            ...MARKETS_GLOBAL,
            level: "ok",
            message: `${read.map.countries.filter((c) => c.enabled).length} open countries, ${read.map.languages.length} languages.`,
          }
        : {
            ...MARKETS_GLOBAL,
            level: "warn",
            message:
              "the global is filled in but cannot serve a shop as it is (the storefront keeps the last good map, or the fixtures in development).",
            details: read.problems,
            fix: "Fix it in the Payload admin under Globals → Markets.",
          },
  };
}

/**
 * D17 and D19: the backend's list against the storefront's map. The map is the global's when it is
 * filled in, else the seeded fixtures (what development and `next build` use then). Also hands back
 * what it read, for the `--online` comparison with the running Medusa.
 */
export function marketsSyncCheck(input: {
  backendFile: { exports: Record<string, unknown> } | { error: string };
  /** The fixtures' map, or why it could not be read. */
  fixtures: MarketMapData | string;
  /** The `markets` global's map, when it was read and is filled in. */
  global: MarketMapData | undefined;
  /** The global's synced part (T60), when a sync has filled it. */
  synced?: BackendMarkets;
}): { check: Check; backend: BackendMarkets | undefined; map: MarketMapData | undefined } {
  const { backendFile, fixtures, global, synced } = input;
  const source = global ?? fixtures;
  const map = typeof source === "string" ? undefined : source;
  const warn = (message: string): Check => ({ ...MARKETS_SYNC, level: "warn", message });

  // D76: once a sync has run, the global's two parts are compared; the backend's file is still
  // read, for `--online`.
  if (synced !== undefined) {
    const read = "error" in backendFile ? undefined : readBackendMarkets(backendFile.exports);
    const backend = typeof read === "object" ? read : undefined;
    if (typeof source === "string") return { map, backend, check: warn(source) };
    const problems = compareMarkets(synced, source, SYNCED_SOURCE);
    const where = global === undefined ? "the seeded fixtures" : "the markets global's countries";
    return {
      map,
      backend,
      check:
        problems.length === 0
          ? {
              ...MARKETS_SYNC,
              level: "ok",
              message: `Medusa's regions and locales (the synced part) and ${where} agree.`,
            }
          : {
              ...MARKETS_SYNC,
              level: "warn",
              message: `Medusa's regions and locales (the synced part) and ${where} disagree (D76).`,
              details: problems,
              fix: MARKETS_SYNCED_FIX,
            },
    };
  }

  if ("error" in backendFile) {
    return {
      map,
      backend: undefined,
      check: warn(`could not read apps/backend/src/config/markets.ts (${backendFile.error}).`),
    };
  }
  const backend = readBackendMarkets(backendFile.exports);
  if (typeof backend === "string") {
    return {
      map,
      backend: undefined,
      check: warn(`apps/backend/src/config/markets.ts is not what doctor expects: ${backend}.`),
    };
  }
  // No global, and the fixtures could not be read: `source` is the reason.
  if (typeof source === "string") return { map, backend, check: warn(source) };

  const problems = compareMarkets(backend, source);
  const where = global === undefined ? "the seeded fixtures" : "the markets global";
  return {
    map,
    backend,
    check:
      problems.length === 0
        ? {
            ...MARKETS_SYNC,
            level: "ok",
            message: `apps/backend/src/config/markets.ts and ${where} list the same countries and languages.`,
          }
        : {
            ...MARKETS_SYNC,
            level: "warn",
            message: `apps/backend/src/config/markets.ts and ${where} disagree (D17).`,
            details: problems,
            fix: MARKETS_FIX,
          },
  };
}
