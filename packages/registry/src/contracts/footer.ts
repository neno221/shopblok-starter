import { z } from "zod";
import { Href, Link } from "./content";
import { MarketChoice } from "./market";
import { FooterColumn } from "./navigation";
import { PaymentBrand } from "./payment";
import { NewsletterSignup } from "./site";

// The footer every variant draws (T36; SPEC §7.3's `footer` global, §9.4): the columns of links,
// the newsletter, the shop's social profiles, the legal links, the marks of the ways to pay, the
// market switcher and the copyright line. Labels, the copyright and the links are content (Payload's,
// localized); the words of the landmarks and controls are copy (D43). The variant is the family's
// (D46), not a field here.

/** The networks the footer has a mark for, copied from Simple Icons as PaymentIcon's are (T34). */
export const SocialNetwork = z.enum([
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "pinterest",
  "x",
  "threads",
  "bluesky",
]);

/** The shop's profile on a network (`footer.social[]`): the mark is the network's. */
export const SocialLink = z.object({
  network: SocialNetwork,
  href: Href.refine((href) => href.startsWith("https://"), "a profile is an https URL"),
});

export const Footer = z
  .object({
    storeName: z.string().min(1).describe("The logo's and the wordmark's name"),
    homeHref: Href,
    columns: z.array(FooterColumn).max(5).describe("Up to five columns of links, in order"),
    newsletter: NewsletterSignup.optional().describe("The signup form, when the shop has one"),
    social: z.array(SocialLink).max(8),
    legalLinks: z.array(Link).max(6).describe("Terms, privacy, cookies, the legal notice"),
    paymentIcons: z.array(PaymentBrand).max(8).describe("The marks of the ways to pay, in order"),
    marketSwitcher: z.boolean(),
    market: MarketChoice.optional(),
    copyright: z.string().min(1).describe("The last line (`© 2026 Shopblok`)"),
  })
  .refine(
    (footer) => !footer.marketSwitcher || footer.market !== undefined,
    "a footer with the market switcher has the markets",
  )
  .refine(
    (footer) => new Set(footer.social.map((link) => link.network)).size === footer.social.length,
    "one profile per network",
  )
  .refine(
    (footer) => new Set(footer.paymentIcons).size === footer.paymentIcons.length,
    "each payment mark once",
  );

export type SocialNetwork = z.infer<typeof SocialNetwork>;
export type SocialLink = z.infer<typeof SocialLink>;
export type Footer = z.infer<typeof Footer>;
