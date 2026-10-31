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

/**
 * The currency a country's region sells in, upper case (`EUR`), or `undefined` for a country no
 * region has: the switcher's and the banner's lookup (PR 75 review, item 9).
 */
export function currencyForCountry(
  regions: readonly Region[],
): (country: string) => string | undefined {
  return (country) =>
    regions.find((region) => region.countries.includes(country))?.currencyCode.toUpperCase();
}

const REGION_FIELDS = "id,name,currency_code,*countries";
const PAGE_SIZE = 100;

/**
 * Every region, a page at a time. The next page starts after the rows received, because a server
 * may cap `limit` below `PAGE_SIZE`.
 */
async function fetchRegions(): Promise<Region[]> {
  const regions: Region[] = [];
  let offset = 0;
  for (;;) {
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
    offset += page.regions.length;
    if (page.regions.length === 0 || offset >= page.count) return regions;
  }
}

/**
 * Every region of the store: one call for the whole list, whatever the number of markets, so
 * opening a country is a change in Medusa and nothing here (D17). Regions are the same in every
 * language, so the call takes no locale. `minutes`, so a market opened in Medusa's markets does
 * not show "no region" for an hour. The backend revalidates tag `medusa:regions` on every
 * `region.*` event (T49), so this life only bounds a call that never arrived.
 */
export const listRegions = cached(fetchRegions, {
  name: "medusa:regions",
  tags: ["medusa:regions"],
  life: "minutes",
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
 * market opened before its region exists in Medusa (SETUP.md, T07 item 3).
 */
export async function getRegionForCountry(country: string): Promise<Region | undefined> {
  return findRegionForCountry(await listRegions(), country);
}
