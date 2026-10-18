import type {
  Footer,
  FooterColumn,
  Link,
  MarketOption,
  PaymentMethod,
  SocialLink,
} from "@shopblok/registry/contracts";
import type { Context } from "../context";
import { fixtureNow } from "../now";
import type { CommerceFixture } from "../types";

// The footer's sample data (T36): the content every footer variant draws, and the least a shop can
// have. The words are in `copy/` (`footer`); the markets are the fixture's own, so the footer's
// switcher and the header's list the same countries, and the payment marks are those of the
// checkout's ways to pay. The social profiles are links to other sites, the same in every locale.

/** The shop's profiles: five of the eight networks the footer has a mark for. */
const socialProfiles: SocialLink[] = [
  { network: "instagram", href: "https://www.instagram.com/shopblok" },
  { network: "facebook", href: "https://www.facebook.com/shopblok" },
  { network: "tiktok", href: "https://www.tiktok.com/@shopblok" },
  { network: "pinterest", href: "https://www.pinterest.com/shopblok" },
  { network: "youtube", href: "https://www.youtube.com/@shopblok" },
];

export function buildFooter(
  ctx: Context,
  markets: MarketOption[],
  paymentMethods: PaymentMethod[],
): CommerceFixture["footer"] {
  const { copy } = ctx;
  const { footer } = copy;
  const page = (label: string, path: string): Link => ({ label, href: ctx.href(path) });
  const columns: FooterColumn[] = [
    {
      title: footer.shop,
      links: [
        page(copy.navigation.newIn, "/new-in"),
        { label: copy.categories.women, href: ctx.categoryHref("women") },
        { label: copy.categories.men, href: ctx.categoryHref("men") },
        { label: copy.categories.accessories, href: ctx.categoryHref("accessories") },
        page(copy.navigation.sale, "/sale"),
      ],
    },
    {
      title: footer.help,
      links: [
        page(footer.shipping, "/shipping-returns"),
        page(footer.sizeGuide, "/size-guide"),
        page(footer.contact, "/contact"),
        page(footer.faq, "/faq"),
        page(footer.trackOrder, "/account/orders"),
      ],
    },
    {
      title: footer.company,
      links: [
        page(footer.about, "/about"),
        page(footer.sustainability, "/sustainability"),
        // The one link that leaves the store: it opens in a new tab.
        { label: footer.careers, href: "https://careers.example.com", external: true },
        page(footer.stores, "/stores"),
      ],
    },
  ];
  const terms = page(footer.terms, "/terms");
  const privacy = page(footer.privacy, "/privacy");
  const storeName = ctx.ds.ordinary.storeName;
  const copyright = footer.copyright(storeName, new Date(fixtureNow).getUTCFullYear());
  return {
    content: {
      storeName,
      homeHref: ctx.root,
      columns,
      newsletter: { email: "", privacyHref: privacy.href },
      social: socialProfiles.map((profile) => ({ ...profile })),
      legalLinks: [
        terms,
        privacy,
        page(footer.cookies, "/cookies"),
        page(footer.imprint, "/legal-notice"),
      ],
      paymentIcons: [...new Set(paymentMethods.flatMap((method) => method.brands))],
      marketSwitcher: true,
      market: { markets },
      copyright,
    },
    bare: {
      storeName,
      homeHref: ctx.root,
      columns: [],
      social: [],
      legalLinks: [terms, privacy],
      paymentIcons: [],
      marketSwitcher: false,
      copyright,
    } satisfies Footer,
  };
}
