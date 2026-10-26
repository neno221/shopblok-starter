import { describe, expect, it } from "vitest";

import { currencyForCountry, type Region } from "./regions";

const regions: Region[] = [
  { id: "reg_eu", name: "Europe", currencyCode: "eur", countries: ["cy", "de"] },
  { id: "reg_us", name: "US", currencyCode: "usd", countries: ["us"] },
];

describe("currencyForCountry (PR 75 review, item 9)", () => {
  it("is the currency of the country's region, upper case, and nothing for a country no region has", () => {
    const currencyOf = currencyForCountry(regions);
    expect(currencyOf("de")).toBe("EUR");
    expect(currencyOf("us")).toBe("USD");
    expect(currencyOf("gb")).toBeUndefined();
  });
});
