import "server-only";
import { cached } from "../cache";
import { medusaRequest } from "./sdk";

/** A Medusa region as the storefront uses it: where it sells, and in which currency. */
export type Region = {
  id: string;
  name: string;
  /** ISO 4217, lowercase as Medusa has it (`eur`). */
  currencyCode: string;
  /** ISO 3166-1 alpha-2, lowercase (`cy`). */
  countries: string[];
};

const REGION_FIELDS = "id,name,currency_code,*countries";
const PAGE_SIZE = 100;

/** Every region, a page at a time: a shop with a region per country can have more than a page. */
async function fetchRegions(): Promise<Region[]> {
  const regions: Region[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await medusaRequest((sdk) =>
      sdk.store.region.list({ fields: REGION_FIELDS, limit: PAGE_SIZE, offset }),
    );
    for (const region of page.regions) {
      regions.push({
        id: region.id,
        name: region.name,
        currencyCode: region.currency_code,
        countries: (region.countries ?? []).flatMap((country) =>
          country.iso_2 ? [country.iso_2.toLowerCase()] : [],
        ),
      });
    }
    if (page.regions.length === 0 || offset + page.regions.length >= page.count) return regions;
  }
}

/**
 * Every region of the store: one call for the whole list, whatever the number of markets, so
 * opening a country is a change in Medusa and nothing here (D17). Regions are the same in every
 * language, so the call takes no locale. Tag `medusa:regions` is for the hook that revalidates them
 * when an admin edits one (M4/M6).
 */
export const listRegions = cached(fetchRegions, {
  name: "medusa:regions",
  tags: ["medusa:regions"],
  life: "hours",
});

/** The region that sells in `country` (ISO 3166-1 alpha-2, any case), or `undefined` if none does. */
export function findRegionForCountry(
  regions: readonly Region[],
  country: string,
): Region | undefined {
  const code = country.toLowerCase();
  return regions.find((region) => region.countries.includes(code));
}

/**
 * The region for a market's country. `undefined` when Medusa has no region for it, for example a
 * market opened in the `markets` global before its region exists in Medusa (SETUP.md, T07 item 3).
 */
export async function getRegionForCountry(country: string): Promise<Region | undefined> {
  return findRegionForCountry(await listRegions(), country);
}

/**
 * The currencies the store sells in: those of its regions, sorted, lowercase. This is the
 * storefront's copy of the search index's `SEARCH_PRICE_CURRENCIES` (the backend's `pricing.ts`,
 * which takes the same set from `config/markets.ts`): read from Medusa, never typed in, so the price
 * filter (`min_price_<currency>`, M3) works for a market a shop opens with no edit here (D17).
 */
export function currenciesOf(regions: readonly Region[]): string[] {
  return [...new Set(regions.map((region) => region.currencyCode.toLowerCase()))].sort();
}

export async function getSearchPriceCurrencies(): Promise<string[]> {
  return currenciesOf(await listRegions());
}
