// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chooseConsent,
  closeConsentSettings,
  getServerSettings,
  getSettings,
  isCookieSettingsLink,
  onConsentChange,
  openConsentSettings,
  subscribeSettings,
} from "./consent";
import { readConsentCookie } from "./consent-cookie";
import { getSnapshot, resetVisitor, setVisitor } from "./store";

// M6 D123 (T97): a choice kept, shown and told; the settings dialog's store; the control.
afterEach(() => {
  document.cookie = "_shopblok_consent=; Path=/; Max-Age=0";
  closeConsentSettings();
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

describe("the settings dialog's store", () => {
  it("is closed on the server, opens with its opener and closes", () => {
    expect(getServerSettings()).toEqual({ open: false });
    const listener = vi.fn();
    const stop = subscribeSettings(listener);
    const opener = document.createElement("a");
    openConsentSettings(opener);
    expect(getSettings()).toEqual({ open: true, opener });
    // The same state again tells no one.
    openConsentSettings(opener);
    expect(listener).toHaveBeenCalledTimes(1);
    closeConsentSettings();
    expect(getSettings()).toEqual({ open: false });
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
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
