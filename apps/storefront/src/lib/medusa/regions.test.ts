import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUBLISHABLE_KEY, stubMedusaFetch } from "../../test-support/medusa-fetch";
import { currenciesOf, findRegionForCountry, type Region } from "./regions";

vi.mock("next/cache", () => ({ cacheTag: vi.fn(), cacheLife: vi.fn() }));

const europe: Region = {
  id: "reg_eu",
  name: "Europe",
  currencyCode: "eur",
  countries: ["cy", "de", "fr"],
};
const us: Region = { id: "reg_us", name: "United States", currencyCode: "usd", countries: ["us"] };
const brazil: Region = { id: "reg_br", name: "Brazil", currencyCode: "brl", countries: ["br"] };
const mongolia: Region = { id: "reg_mn", name: "Mongolia", currencyCode: "mnt", countries: ["mn"] };

describe("findRegionForCountry", () => {
  it("finds the region that sells in the country, in any case", () => {
    expect(findRegionForCountry([europe, us], "cy")).toBe(europe);
    expect(findRegionForCountry([europe, us], "CY")).toBe(europe);
    expect(findRegionForCountry([europe, us], "us")).toBe(us);
  });

  it("returns undefined for a country no region sells in (a market opened before its region)", () => {
    expect(findRegionForCountry([europe, us], "br")).toBeUndefined();
    expect(findRegionForCountry([], "cy")).toBeUndefined();
  });

  it("does not match part of a code", () => {
    expect(findRegionForCountry([europe], "c")).toBeUndefined();
    expect(findRegionForCountry([europe], "cyp")).toBeUndefined();
  });
});

describe("currenciesOf (D17: the search price currencies come from Medusa, never from a list here)", () => {
  it("is the regions' currencies, once each, sorted, lowercase", () => {
    expect(currenciesOf([us, europe, { ...europe, id: "reg_eu2", countries: ["it"] }])).toEqual([
      "eur",
      "usd",
    ]);
    expect(currenciesOf([{ ...us, currencyCode: "USD" }])).toEqual(["usd"]);
  });

  it("follows the regions: a shop with Brazil and Mongolia gets BRL and MNT with no edit here", () => {
    expect(currenciesOf([brazil, mongolia])).toEqual(["brl", "mnt"]);
    expect(currenciesOf([europe, us, brazil, mongolia])).toEqual(["brl", "eur", "mnt", "usd"]);
  });

  it("is empty when there are no regions", () => {
    expect(currenciesOf([])).toEqual([]);
  });
});

const wire = (region: Region) => ({
  id: region.id,
  name: region.name,
  currency_code: region.currencyCode,
  countries: region.countries.map((iso_2) => ({ iso_2, display_name: iso_2.toUpperCase() })),
});

describe("listRegions and getRegionForCountry, through the SDK", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MEDUSA_BACKEND_URL", "http://medusa.test:9000");
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", PUBLISHABLE_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("asks for the fields it maps, and maps the answer to lowercase codes", async () => {
    const calls = stubMedusaFetch(() => ({
      body: {
        regions: [
          { ...wire(europe), countries: [{ iso_2: "CY" }, { iso_2: "de" }, { iso_2: "" }, {}] },
        ],
        count: 1,
        offset: 0,
        limit: 100,
      },
    }));
    const { listRegions } = await import("./regions");
    expect(await listRegions()).toEqual([
      { id: "reg_eu", name: "Europe", currencyCode: "eur", countries: ["cy", "de"] },
    ]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url.searchParams.get("fields")).toBe("id,name,currency_code,*countries");
    expect(calls[0]!.headers.get("x-publishable-api-key")).toBe(PUBLISHABLE_KEY);
  });

  it("reads every page, however many regions there are", async () => {
    const all = Array.from({ length: 230 }, (_, i) => ({
      ...wire(europe),
      id: `reg_${i}`,
      name: `Region ${i}`,
    }));
    const calls = stubMedusaFetch(({ url }) => {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit"));
      return {
        body: { regions: all.slice(offset, offset + limit), count: all.length, offset, limit },
      };
    });
    const { listRegions } = await import("./regions");
    const regions = await listRegions();
    expect(regions).toHaveLength(230);
    expect(regions.at(-1)?.id).toBe("reg_229");
    expect(calls.map((call) => call.url.searchParams.get("offset"))).toEqual(["0", "100", "200"]);
  });

  it("stops on an empty page even if the count is wrong", async () => {
    const calls = stubMedusaFetch(({ url }) => ({
      body: { regions: [], count: 999, offset: Number(url.searchParams.get("offset")), limit: 100 },
    }));
    const { listRegions } = await import("./regions");
    expect(await listRegions()).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("gives the region for a country and undefined for one without a region", async () => {
    stubMedusaFetch(() => ({
      body: { regions: [wire(europe), wire(us)], count: 2, offset: 0, limit: 100 },
    }));
    const { getRegionForCountry, getSearchPriceCurrencies } = await import("./regions");
    expect(await getRegionForCountry("CY")).toMatchObject({ id: "reg_eu", currencyCode: "eur" });
    expect(await getRegionForCountry("br")).toBeUndefined();
    expect(await getSearchPriceCurrencies()).toEqual(["eur", "usd"]);
  });
});
