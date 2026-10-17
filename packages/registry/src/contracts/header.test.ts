import { describe, expect, it } from "vitest";
import { AnnouncementBar, Header, MarketSuggestion, MobileNav, Navigation } from "./header";

// The header contracts' own rules (T35): how many messages a bar takes and how long each stays, a
// suggestion that would send a visitor where they already are, and a switcher with no markets.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const message = {
  message: "Free delivery over $75",
  link: { label: "Details", href: "/us/pages/shipping" },
};

const markets = {
  markets: [
    {
      country: "us",
      flagCode: "US",
      currencyCode: "USD",
      languages: [{ language: "en", htmlLang: "en-US", href: "/us", current: true }],
    },
    {
      country: "de",
      flagCode: "DE",
      currencyCode: "EUR",
      languages: [{ language: "de", htmlLang: "de-DE", href: "/de", current: false }],
    },
  ],
};

const navigation = [{ kind: "link", label: "New in", href: "/us/collections/new" }];

const header = {
  storeName: "Shopblok",
  homeHref: "/us",
  cartHref: "/us/cart",
  navigation,
  utilities: { search: "/us/search", account: "/us/account", marketSwitcher: true },
  market: markets,
  announcement: { messages: [message], dismissible: true },
  sticky: true,
};

describe("AnnouncementBar", () => {
  it("takes one message, or up to five in turn", () => {
    expect(issues(AnnouncementBar, { messages: [message], dismissible: false })).toEqual([]);
    const five = Array.from({ length: 5 }, () => message);
    expect(
      issues(AnnouncementBar, { messages: five, rotateSeconds: 6, dismissible: true }),
    ).toEqual([]);
    expect(
      issues(AnnouncementBar, { messages: [...five, message], dismissible: true }),
    ).not.toEqual([]);
    expect(issues(AnnouncementBar, { messages: [], dismissible: true })).not.toEqual([]);
  });

  it("keeps each message from 5 to 20 whole seconds: shorter is too quick to read (WCAG 2.2.2)", () => {
    for (const rotateSeconds of [4, 21, 6.5])
      expect(
        issues(AnnouncementBar, { messages: [message, message], rotateSeconds, dismissible: true }),
      ).not.toEqual([]);
  });
});

describe("Navigation and MobileNav", () => {
  it("want an item at least", () => {
    expect(issues(Navigation, { items: navigation })).toEqual([]);
    expect(issues(Navigation, { items: [] })).not.toEqual([]);
    expect(issues(MobileNav, { items: [], account: [] })).not.toEqual([]);
  });

  it("end the drawer with up to four account links and, optionally, the markets", () => {
    const account = [{ label: "Sign in", href: "/us/account/login" }];
    expect(issues(MobileNav, { items: navigation, account })).toEqual([]);
    expect(issues(MobileNav, { items: navigation, account, market: markets })).toEqual([]);
    expect(
      issues(MobileNav, {
        items: navigation,
        account: Array.from({ length: 5 }, () => account[0]),
      }),
    ).not.toEqual([]);
  });
});

describe("MarketSuggestion", () => {
  const suggestion = {
    current: { country: "us" },
    suggested: {
      country: "de",
      language: "de",
      htmlLang: "de-DE",
      currencyCode: "EUR",
      href: "/de",
    },
  };

  it("takes another market, with or without the markets global's own message", () => {
    expect(issues(MarketSuggestion, suggestion)).toEqual([]);
    expect(issues(MarketSuggestion, { ...suggestion, message: "Shop in Germany" })).toEqual([]);
    expect(issues(MarketSuggestion, { ...suggestion, message: "" })).not.toEqual([]);
  });

  it("refuses to suggest the market the visitor is already in", () => {
    expect(issues(MarketSuggestion, { ...suggestion, current: { country: "de" } })).toEqual([
      "the suggested country is not the current one",
    ]);
  });
});

describe("Header", () => {
  it("takes the content every variant draws", () => {
    expect(issues(Header, header)).toEqual([]);
    // A shop with no wishlist and no search, and no announcement: each is optional.
    const { announcement: _announcement, ...plain } = header;
    expect(issues(Header, { ...plain, utilities: { marketSwitcher: false } })).toEqual([]);
  });

  it("refuses the market switcher with no markets to choose from", () => {
    const { market: _market, ...noMarkets } = header;
    expect(issues(Header, noMarkets)).toEqual([
      "a header with the market switcher has the markets",
    ]);
    expect(
      issues(Header, { ...noMarkets, utilities: { ...header.utilities, marketSwitcher: false } }),
    ).toEqual([]);
  });

  it("wants the logo's name and paths from / or http(s) URLs", () => {
    expect(issues(Header, { ...header, storeName: "" })).not.toEqual([]);
    expect(issues(Header, { ...header, cartHref: "//evil.example/cart" })).not.toEqual([]);
  });
});
