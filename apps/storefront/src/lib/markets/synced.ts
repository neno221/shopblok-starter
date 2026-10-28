import type { MarketsGlobal } from "./global";

/**
 * The `markets` global's synced part (D76): what Medusa has, written only by the sync. Regions
 * with their currency and countries (ISO 3166-1 alpha-2, lowercase, as Medusa stores them), and
 * the store's currencies and locales. Medusa 2.21.2's store has no default locale, so there is
 * none here.
 */
export type SyncedMarkets = {
  regions: { medusaId: string; name: string; currency: string; countries: string[] }[];
  currencies: string[];
  defaultCurrency: string | null;
  locales: string[];
};

/** What `findGlobal` returns for the synced group, as far as this reads it. */
export type SyncedMarketsGlobal = {
  regions?:
    | {
        medusaId?: string | null;
        name?: string | null;
        currency?: string | null;
        countries?: string[] | null;
      }[]
    | null;
  currencies?: string[] | null;
  defaultCurrency?: string | null;
  locales?: string[] | null;
} | null;

export function syncedFromGlobal(synced: SyncedMarketsGlobal | undefined): SyncedMarkets {
  return {
    regions: (synced?.regions ?? []).map((region) => ({
      medusaId: region.medusaId ?? "",
      name: region.name ?? "",
      currency: region.currency ?? "",
      countries: region.countries ?? [],
    })),
    currencies: synced?.currencies ?? [],
    defaultCurrency: synced?.defaultCurrency ?? null,
    locales: synced?.locales ?? [],
  };
}

/** Before the first sync there is nothing to check against. */
export function isSyncedEmpty(synced: SyncedMarkets): boolean {
  return synced.regions.length === 0 && synced.locales.length === 0;
}

export type SyncedProblem = { path: string; message: string };

/**
 * D76's checks of the editable part against the synced part: an enabled country is in exactly one
 * of Medusa's regions (none: its pages have no prices; two: which one would be a guess), and each
 * language's `medusaLocale` is one of the store's locales (else Medusa answers in English). The
 * paths are the form's, so the admin shows each message on its field.
 */
export function syncedMarketProblems(
  edited: MarketsGlobal,
  synced: SyncedMarkets,
): SyncedProblem[] {
  const problems: SyncedProblem[] = [];
  (edited.countries ?? []).forEach((country, index) => {
    const code = country.code;
    if (!code || country.enabled === false) return;
    const regions = synced.regions.filter((region) => region.countries.includes(code));
    if (regions.length === 0) {
      problems.push({
        path: `countries.${index}.code`,
        message: `"${code}" is in no Medusa region. Add it to a region in Medusa Admin (Settings → Regions) first, or switch it off.`,
      });
    } else if (regions.length > 1) {
      problems.push({
        path: `countries.${index}.code`,
        message: `"${code}" is in ${regions.length} Medusa regions (${regions.map((region) => region.name).join(", ")}). Keep it in one.`,
      });
    }
  });
  (edited.languages ?? []).forEach((language, index) => {
    const locale = language.medusaLocale;
    if (!locale || synced.locales.includes(locale)) return;
    problems.push({
      path: `languages.${index}.medusaLocale`,
      message: `"${locale}" is not one of the store's locales (${synced.locales.join(", ")}). Add it in Medusa Admin (Settings → Store) first.`,
    });
  });
  return problems;
}
