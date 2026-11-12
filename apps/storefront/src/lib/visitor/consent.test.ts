// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseConsent, isCookieSettingsLink, onConsentChange } from "./consent";
import { readConsentCookie } from "./consent-cookie";
import { getSnapshot, resetVisitor, setVisitor } from "./store";

// M6 D123 (T97): a choice kept, shown and told; the control.
afterEach(() => {
  document.cookie = "_shopblok_consent=; Path=/; Max-Age=0";
  resetVisitor();
});

describe("chooseConsent (D123)", () => {
  it("writes the cookie, puts the choice in the store and tells each listener", () => {
    setVisitor({ cartCount: 0, consent: null });
    const listener = vi.fn();
    const stop = onConsentChange(listener);
    chooseConsent({ analytics: true, marketing: false });
    expect(readConsentCookie()).toEqual({ analytics: true, marketing: false });
    expect(getSnapshot()).toMatchObject({ consent: { analytics: true, marketing: false } });
    expect(listener).toHaveBeenCalledWith({ analytics: true, marketing: false });
    stop();
    chooseConsent({ analytics: false, marketing: false });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(readConsentCookie()).toEqual({ analytics: false, marketing: false });
  });
});

describe("isCookieSettingsLink", () => {
  const link = (href: string) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    return anchor;
  };
  it("is a link on this site to #cookie-settings, whatever its page", () => {
    expect(
      isCookieSettingsLink(
        link("https://shop.test/us/privacy#cookie-settings"),
        "https://shop.test",
      ),
    ).toBe(true);
    expect(
      isCookieSettingsLink(link("https://shop.test/privacy#cookie-settings"), "https://shop.test"),
    ).toBe(true);
    expect(isCookieSettingsLink(link("https://shop.test/privacy"), "https://shop.test")).toBe(
      false,
    );
    expect(
      isCookieSettingsLink(link("https://other.test/privacy#cookie-settings"), "https://shop.test"),
    ).toBe(false);
  });
});
