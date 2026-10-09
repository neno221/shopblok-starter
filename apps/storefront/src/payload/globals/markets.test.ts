import type { TextFieldSingleValidation } from "payload";
import { describe, expect, it } from "vitest";
import { countryCode } from "./markets";

type Options = Parameters<TextFieldSingleValidation>[1];
// What Payload's own `text` validator reads from the request.
const req = { payload: { config: {} }, t: (key: string) => key };
const optional = { req, required: false } as unknown as Options;
const required = { req, required: true } as unknown as Options;
const message = "Use the two-letter ISO 3166-1 code in lowercase, for example cy";

describe("countryCode", () => {
  it("accepts a two-letter lowercase code", () => {
    expect(countryCode("cy", required)).toBe(true);
    expect(countryCode("ch", optional)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of ["CY", "c", "cyp", "c1", " cy", "el-cy"]) {
      expect(countryCode(value, optional)).toBe(message);
    }
  });

  it("lets an optional field stay empty (primaryCountry)", () => {
    for (const value of [undefined, null, ""]) expect(countryCode(value, optional)).toBe(true);
  });

  it("keeps Payload's required check for a required field (a country's code)", () => {
    for (const value of [undefined, null, ""]) {
      expect(countryCode(value, required)).toBe("validation:required");
    }
  });
});
