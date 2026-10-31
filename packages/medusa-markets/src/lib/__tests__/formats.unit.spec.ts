import {
  isHostname,
  isLanguageTag,
  isMarketKey,
  isTimeZone,
  languageOfLocale,
  normalizeHost,
} from "../formats";

describe("formats", () => {
  it("normalizes a host the way the storefront does", () => {
    expect(normalizeHost(" HTTPS://Shop.Example.cy:8443/path?x#y ")).toBe("shop.example.cy");
    expect(normalizeHost("shop.example.cy.")).toBe("shop.example.cy");
    expect(normalizeHost("  ")).toBeUndefined();
    expect(normalizeHost(null)).toBeUndefined();
  });

  it("accepts hostnames and refuses the rest", () => {
    expect(isHostname("shop.example.cy")).toBe(true);
    expect(isHostname("localhost")).toBe(true);
    expect(isHostname("not a host")).toBe(false);
    expect(isHostname("-bad.example")).toBe(false);
  });

  it("asks Intl about time zones and language tags", () => {
    expect(isTimeZone("Europe/Nicosia")).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
    expect(isLanguageTag("pt-BR")).toBe(true);
    expect(isLanguageTag("pt_BR")).toBe(false);
  });

  it("reads market keys and the language of a locale", () => {
    expect(isMarketKey("en-us")).toBe(true);
    expect(isMarketKey("en-US")).toBe(false);
    expect(languageOfLocale("de-CH")).toBe("de");
  });
});
