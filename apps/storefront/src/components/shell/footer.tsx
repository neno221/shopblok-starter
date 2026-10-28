import type { Messages } from "@shopblok/i18n";
import { FooterMinimal } from "@shopblok/ui/organisms/footer/minimal";
import { FooterMultiColumn } from "@shopblok/ui/organisms/footer/multi-column";
import { FooterNewsletterFirst } from "@shopblok/ui/organisms/footer/newsletter-first";
import type { FooterProps } from "@shopblok/ui/organisms/footer/parts";
import { FooterTwoTier } from "@shopblok/ui/organisms/footer/two-tier";
import { FooterWordmark } from "@shopblok/ui/organisms/footer/wordmark";
import { getMessages } from "next-intl/server";
import type { ReactElement } from "react";
import { SHELL_PREFETCH, type FooterVariant } from "../../lib/site";
import { ShellLogo } from "./logo";
import { getShellData } from "./shell-data";

// The shop's footer (D66): the `footer` global's design, columns, profiles, legal links, payment
// marks and copyright (T61, D78; until it is saved, `site.ts`'s columns: the top-level categories
// and the help links), the market switcher and the logo. A footer draws nothing for an empty list.
// The newsletter's signup arrives with T67's forms (D81).

const FOOTERS: Record<FooterVariant, (props: FooterProps) => ReactElement> = {
  "multi-column": FooterMultiColumn,
  "newsletter-first": FooterNewsletterFirst,
  minimal: FooterMinimal,
  wordmark: FooterWordmark,
  "two-tier": FooterTwoTier,
};

export async function SiteFooter() {
  const [{ market, url, choice, footer, settings }, messages] = await Promise.all([
    getShellData(),
    getMessages() as Promise<Messages>,
  ]);
  const Footer = FOOTERS[footer.design];
  const switcher = footer.marketSwitcher ? choice : undefined;
  return (
    <Footer
      storeName={settings.storeName}
      homeHref={url("/")}
      columns={footer.columns}
      social={footer.social}
      legalLinks={footer.legalLinks}
      paymentIcons={footer.paymentIcons}
      marketSwitcher={switcher !== undefined}
      {...(switcher === undefined ? {} : { market: switcher })}
      copyright={footer.copyright}
      {...(footer.logo === undefined ? {} : { logo: <ShellLogo image={footer.logo} /> })}
      copy={messages.organisms.footer}
      newsletterCopy={messages.molecules.newsletterForm}
      marketSwitcherCopy={messages.molecules.marketSwitcher}
      locale={market.htmlLang}
      prefetch={SHELL_PREFETCH}
    />
  );
}
