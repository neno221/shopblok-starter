import { describe, expect, it } from "vitest";
import marketsJson from "./markets.json";
import { markets } from "./markets";

describe("markets.json", () => {
  // The backend's seed (CommonJS) reads the map as JSON, because this package exports raw
  // TypeScript (M4b, T73). It must be `markets`, key for key and in the same order.
  it("equals the seeded market map", () => {
    expect(marketsJson).toEqual(markets);
    expect(marketsJson.countries.map((country) => country.code)).toEqual(
      markets.countries.map((country) => country.code),
    );
  });
});
