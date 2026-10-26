import type { Messages } from "@shopblok/i18n";
import { FooterMinimal } from "@shopblok/ui/organisms/footer/minimal";
import { FooterMultiColumn } from "@shopblok/ui/organisms/footer/multi-column";
import { FooterNewsletterFirst } from "@shopblok/ui/organisms/footer/newsletter-first";
import type { FooterProps } from "@shopblok/ui/organisms/footer/parts";
import { FooterTwoTier } from "@shopblok/ui/organisms/footer/two-tier";
import { FooterWordmark } from "@shopblok/ui/organisms/footer/wordmark";
import { getMessages } from "next-intl/server";
import type { ReactElement } from "react";
import { footerColumns, SHELL_PREFETCH, SITE, type FooterVariant } from "../../lib/site";
import { getShellData } from "./shell-data";

// The shop's footer (D66): the variant `site.ts` names, with the top-level categories and the help
// links as its columns (`site.ts`, until M4's `footer` global), the market switcher and the
// copyright. No newsletter, profiles, legal links or payment marks yet: M4's global gives the shop
// its own, and a footer draws nothing for an empty list.

const FOOTERS: Record<FooterVariant, (props: FooterProps) => ReactElement> = {
  "multi-column": FooterMultiColumn,
  "newsletter-first": FooterNewsletterFirst,
  minimal: FooterMinimal,
  wordmark: FooterWordmark,
  "two-tier": FooterTwoTier,
};

/** The year the copyright line names: the build's, as a prerendered page keeps it. */
const YEAR = new Date().getUTCFullYear();

export async function SiteFooter() {
  const [{ market, url, categories, choice }, messages] = await Promise.all([
    getShellData(),
    getMessages() as Promise<Messages>,
  ]);
  const Footer = FOOTERS[SITE.footer];
  return (
    <Footer
      storeName={SITE.storeName}
      homeHref={url("/")}
      columns={footerColumns(
        market.language,
        categories.map((category) => ({ label: category.title, href: category.href })),
        url,
      )}
      social={[]}
      legalLinks={[]}
      paymentIcons={[]}
      marketSwitcher={choice !== undefined}
      {...(choice === undefined ? {} : { market: choice })}
      copyright={`© ${YEAR} ${SITE.storeName}`}
      copy={messages.organisms.footer}
      newsletterCopy={messages.molecules.newsletterForm}
      marketSwitcherCopy={messages.molecules.marketSwitcher}
      locale={market.htmlLang}
      prefetch={SHELL_PREFETCH}
    />
  );
}
