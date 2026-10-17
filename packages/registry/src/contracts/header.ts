import { z } from "zod";
import { CountryCode } from "./address";
import { Announcement, Href, Link } from "./content";
import { MarketChoice } from "./market";
import { CurrencyCode } from "./money";
import { NavItem } from "./navigation";

// The header's organisms (T35; SPEC §7.3's `header` global, §9.4): the announcement bar, the
// navigation as the mega menu draws it on a wide screen and the drawer on a narrow one, the market
// suggestion, and the header the six variants share. Labels and messages are content (Payload's,
// localized); the words of the controls are copy (D43). What a visitor alone sees (the cart count,
// the suggestion) is not part of the header's contract: the header takes it as a slot (D44).

/** The announcement bar (`announcementBar`): one message, or up to five shown in turn. */
export const AnnouncementBar = z.object({
  messages: z.array(Announcement).min(1).max(5),
  rotateSeconds: z
    .number()
    .int()
    .min(5)
    .max(20)
    .optional()
    .describe("Seconds each message stays when there are several (6 unless given)"),
  dismissible: z.boolean().describe("A close button; the page decides how long it stays closed"),
});

/** The header's `navigation.items[]`: links, dropdowns and mega menus, in order. */
export const Navigation = z.object({ items: z.array(NavItem).min(1) });

/**
 * The drawer a narrow screen opens from the menu button: the same items, a level per dropdown or
 * mega menu, and at its foot the account's links and, when the header has one, the market switcher.
 */
export const MobileNav = z.object({
  items: z.array(NavItem).min(1),
  account: z.array(Link).max(4).describe("Sign in or the account, orders, the wishlist"),
  market: MarketChoice.optional(),
});

/**
 * The store a visitor's country points to, when it is not the one they are in (SPEC §7.3, the
 * `markets` global's suggestion banner). M3 decides it from the request; it is per visitor, so the
 * banner is a slot of the page (D44).
 */
export const MarketSuggestion = z
  .object({
    current: z.object({ country: CountryCode }),
    suggested: z.object({
      country: CountryCode,
      language: z.string().regex(/^[a-z]{2}$/, "ISO 639-1, lower case"),
      htmlLang: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, "`{language}-{COUNTRY}`"),
      currencyCode: CurrencyCode,
      href: Href.describe("The current page in the suggested market"),
    }),
    message: z
      .string()
      .min(1)
      .optional()
      .describe("The `markets` global's own message, in place of the copy's"),
  })
  .refine(
    (suggestion) => suggestion.current.country !== suggestion.suggested.country,
    "the suggested country is not the current one",
  );

/** What the header shows besides the navigation (`utilities`): each link only when the shop has it. */
export const HeaderUtilities = z.object({
  search: Href.optional().describe("The search page; the search overlay arrives with T37"),
  account: Href.optional(),
  wishlist: Href.optional(),
  marketSwitcher: z.boolean(),
});

/** The header every variant draws (`header`): the variant is the family's (D46), not a field here. */
export const Header = z
  .object({
    storeName: z.string().min(1).describe("The logo's accessible name"),
    homeHref: Href,
    cartHref: Href,
    navigation: z.array(NavItem),
    utilities: HeaderUtilities,
    market: MarketChoice.optional(),
    announcement: AnnouncementBar.optional(),
    sticky: z.boolean().describe("Stays at the top of the window while the page scrolls"),
  })
  .refine(
    (header) => !header.utilities.marketSwitcher || header.market !== undefined,
    "a header with the market switcher has the markets",
  );

export type AnnouncementBar = z.infer<typeof AnnouncementBar>;
export type Navigation = z.infer<typeof Navigation>;
export type MobileNav = z.infer<typeof MobileNav>;
export type MarketSuggestion = z.infer<typeof MarketSuggestion>;
export type HeaderUtilities = z.infer<typeof HeaderUtilities>;
export type Header = z.infer<typeof Header>;
