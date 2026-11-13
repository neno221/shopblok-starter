import { describe, expect, it } from "vitest";
import {
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  consentCookieLine,
  consentFromCookieHeader,
  formatConsent,
  parseConsent,
} from "./consent-cookie";

// M6 D123 (T97): the `_shopblok_consent` cookie's value.
const day = new Date("2026-11-12T23:30:00Z");

describe("the consent cookie (D123)", () => {
  it("writes the version, the two answers and the day (UTC)", () => {
    expect(formatConsent({ analytics: true, marketing: false }, day)).toBe("v1.1.0.2026-11-12");
    expect(formatConsent({ analytics: false, marketing: true }, day)).toBe("v1.0.1.2026-11-12");
  });

  it("reads back what it wrote", () => {
    for (const choice of [
      { analytics: true, marketing: true },
      { analytics: false, marketing: false },
    ])
      expect(parseConsent(formatConsent(choice, day))).toEqual({ choice, date: "2026-11-12" });
  });

  it("reads another version, or a value it did not write, as no choice: the banner asks again", () => {
    expect(CONSENT_VERSION).toBe(1);
    for (const value of [
      undefined,
      null,
      "",
      "v0.1.1.2026-11-12",
      "v2.1.1.2026-11-12",
      "v1.2.0.2026-11-12",
      "v1.1.0",
      "yes",
      " v1.1.0.2026-11-12",
    ])
      expect(parseConsent(value)).toBeNull();
  });

  it("finds the cookie in a Cookie header among others", () => {
    expect(
      consentFromCookieHeader(
        "a=1; _shopblok_consent=v1.1.0.2026-11-12; _shopblok_consentx=v1.0.0.2026-11-12",
      ),
    ).toEqual({ analytics: true, marketing: false });
    expect(consentFromCookieHeader("_shopblok_consentx=v1.1.1.2026-11-12")).toBeNull();
    expect(consentFromCookieHeader("")).toBeNull();
  });

  it("keeps it for the whole site, twelve months, SameSite=Lax, Secure on https", () => {
    const choice = { analytics: true, marketing: false };
    expect(consentCookieLine(choice, true, day)).toBe(
      `_shopblok_consent=v1.1.0.2026-11-12; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax; Secure`,
    );
    expect(consentCookieLine(choice, false, day)).not.toContain("Secure");
    expect(CONSENT_MAX_AGE).toBe(31_536_000);
  });
});
