import { describe, expect, it } from "vitest";
import { Footer, SocialLink } from "./footer";
import { ConsentChoice, CookieConsent, LoadingSkeleton } from "./site";

// The footer's and the site organisms' own rules (T36): a switcher with no markets, a network or a
// payment mark twice, a profile that is not https, a consent category the store does not know, and
// a skeleton's layout and size.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const markets = {
  markets: [
    {
      country: "us",
      flagCode: "US",
      currencyCode: "USD",
      languages: [{ language: "en", htmlLang: "en-US", href: "/us", current: true }],
    },
  ],
};

const footer = {
  storeName: "Shopblok",
  homeHref: "/us",
  columns: [{ title: "Help", links: [{ label: "Contact us", href: "/us/contact" }] }],
  newsletter: { email: "", privacyHref: "/us/privacy" },
  social: [{ network: "instagram", href: "https://www.instagram.com/shopblok" }],
  legalLinks: [{ label: "Privacy policy", href: "/us/privacy" }],
  paymentIcons: ["visa", "mastercard"],
  marketSwitcher: true,
  market: markets,
  copyright: "© 2026 Shopblok",
};

describe("Footer", () => {
  it("takes the content every variant draws", () => {
    expect(issues(Footer, footer)).toEqual([]);
  });

  it("takes the least a shop can have: a name, a home and the copyright", () => {
    const bare = {
      storeName: "Shopblok",
      homeHref: "/us",
      columns: [],
      social: [],
      legalLinks: [],
      paymentIcons: [],
      marketSwitcher: false,
      copyright: "© 2026 Shopblok",
    };
    expect(issues(Footer, bare)).toEqual([]);
    expect(issues(Footer, { ...bare, copyright: "" })).not.toEqual([]);
  });

  it("refuses the market switcher with no markets to choose from", () => {
    const { market: _market, ...withoutMarkets } = footer;
    expect(issues(Footer, withoutMarkets)).toEqual([
      "a footer with the market switcher has the markets",
    ]);
    expect(issues(Footer, { ...withoutMarkets, marketSwitcher: false })).toEqual([]);
  });

  it("refuses a network or a payment mark twice, and a sixth column", () => {
    const twice = { ...footer.social[0], href: "https://www.instagram.com/shopblok.us" };
    expect(issues(Footer, { ...footer, social: [...footer.social, twice] })).toEqual([
      "one profile per network",
    ]);
    expect(issues(Footer, { ...footer, paymentIcons: ["visa", "visa"] })).toEqual([
      "each payment mark once",
    ]);
    const six = Array.from({ length: 6 }, () => footer.columns[0]);
    expect(issues(Footer, { ...footer, columns: six })).not.toEqual([]);
    expect(issues(Footer, { ...footer, paymentIcons: ["maestro"] })).not.toEqual([]);
  });
});

describe("SocialLink", () => {
  it("takes a network it has a mark for and an https profile", () => {
    expect(issues(SocialLink, { network: "bluesky", href: "https://bsky.app/profile/a" })).toEqual(
      [],
    );
    expect(issues(SocialLink, { network: "x", href: "http://x.com/shopblok" })).toEqual([
      "a profile is an https URL",
    ]);
    expect(issues(SocialLink, { network: "x", href: "/social" })).toEqual([
      "a profile is an https URL",
    ]);
    expect(issues(SocialLink, { network: "myspace", href: "https://myspace.com/a" })).not.toEqual(
      [],
    );
  });
});

describe("CookieConsent and ConsentChoice", () => {
  it("take the policy and, optionally, the shop's own sentence", () => {
    expect(issues(CookieConsent, { policyHref: "/us/cookies" })).toEqual([]);
    expect(issues(CookieConsent, { policyHref: "/us/cookies", message: "" })).not.toEqual([]);
    expect(issues(CookieConsent, { policyHref: "pages/cookies" })).not.toEqual([]);
  });

  it("choose analytics and marketing; necessary is not a choice, nor a category it does not know", () => {
    expect(issues(ConsentChoice, { analytics: true, marketing: false })).toEqual([]);
    expect(
      issues(ConsentChoice, { necessary: false, analytics: false, marketing: false }),
    ).not.toEqual([]);
    expect(issues(ConsentChoice, { analytics: true })).not.toEqual([]);
  });
});

describe("LoadingSkeleton", () => {
  it("takes one of the four layouts and from 1 to 24 items", () => {
    expect(issues(LoadingSkeleton, { layout: "product-grid" })).toEqual([]);
    expect(issues(LoadingSkeleton, { layout: "cart", items: 3 })).toEqual([]);
    expect(issues(LoadingSkeleton, { layout: "cart", items: 0 })).not.toEqual([]);
    expect(issues(LoadingSkeleton, { layout: "cart", items: 25 })).not.toEqual([]);
    expect(issues(LoadingSkeleton, { layout: "cart", items: 1.5 })).not.toEqual([]);
    expect(issues(LoadingSkeleton, { layout: "home" })).not.toEqual([]);
  });
});
