import type {
  Announcement,
  AnnouncementBar,
  MarketOption,
  MarketSuggestion,
  NavItem,
} from "@shopblok/registry/contracts";
import type { Context } from "../context";
import { fixtureImage } from "../images";
import type { CommerceFixture } from "../types";

// The header's sample data (T35): the content every header variant draws, the announcement bar's
// messages, the market suggestion, the mobile drawer's foot and the transparent header's picture.
// The words are in `copy/` (`header`, and `announcement` for the first message); the navigation and
// the markets are the fixture's own, so a header and the mega menu show the same items.

export function buildHeader(
  ctx: Context,
  navigation: NavItem[],
  markets: MarketOption[],
  cartCount: number,
): CommerceFixture["header"] {
  const { header, announcement } = ctx.copy;
  const message = (copy: { message: string; link: string }, path: string): Announcement => ({
    message: copy.message,
    link: { label: copy.link, href: ctx.href(path) },
  });
  const [returns, collection] = header.announcements;
  const first = message(announcement, "/shipping-returns");
  const rotating: AnnouncementBar = {
    messages: [
      first,
      message(returns, "/returns"),
      message(collection, "/autumn-edit"),
    ],
    rotateSeconds: 6,
    dismissible: true,
  };
  const account = [
    { label: header.account.signIn, href: ctx.href("/account/login") },
    { label: header.account.orders, href: ctx.href("/account/orders") },
    { label: header.account.wishlist, href: ctx.href("/account/wishlist") },
  ];
  const suggestion = suggestionFor(ctx, markets);
  return {
    content: {
      storeName: ctx.ds.ordinary.storeName,
      homeHref: ctx.root,
      cartHref: ctx.href("/cart"),
      navigation,
      utilities: {
        search: ctx.href("/search"),
        account: ctx.href("/account"),
        wishlist: ctx.href("/account/wishlist"),
        marketSwitcher: true,
      },
      market: { markets },
      announcement: rotating,
      sticky: false,
    },
    cartCount,
    announcements: {
      single: { messages: [first], dismissible: false },
      rotating,
      long: {
        messages: [message(header.longAnnouncement, "/shipping-returns")],
        dismissible: true,
      },
    },
    suggestions: {
      copy: suggestion,
      message: { ...suggestion, message: header.suggestionMessage },
    },
    mobileNav: { items: navigation, account, market: { markets } },
    hero: fixtureImage({ seed: 33, ratio: "16:9", alt: header.heroAlt }),
  };
}

/**
 * The first other seeded market, in its default language: what M3 would suggest to a visitor whose
 * request comes from that country.
 */
function suggestionFor(ctx: Context, markets: MarketOption[]): MarketSuggestion {
  const other = markets.find((market) => market.country !== ctx.market.country);
  const language = other?.languages[0];
  if (other === undefined || language === undefined)
    throw new Error("The fixtures have one market only: nothing to suggest");
  return {
    current: { country: ctx.market.country },
    suggested: {
      country: other.country,
      language: language.language,
      htmlLang: language.htmlLang,
      currencyCode: other.currencyCode,
      href: language.href,
    },
  };
}
