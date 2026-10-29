import type { Messages } from "@shopblok/i18n";
import { FooterMinimal } from "@shopblok/ui/organisms/footer/minimal";
import { FooterMultiColumn } from "@shopblok/ui/organisms/footer/multi-column";
import { FooterNewsletterFirst } from "@shopblok/ui/organisms/footer/newsletter-first";
import type { FooterProps } from "@shopblok/ui/organisms/footer/parts";
import { FooterTwoTier } from "@shopblok/ui/organisms/footer/two-tier";
import { FooterWordmark } from "@shopblok/ui/organisms/footer/wordmark";
import { getMessages } from "next-intl/server";
import type { ReactElement } from "react";
import { submitForm } from "../../lib/actions/form";
import type { NewsletterTarget } from "../../lib/cms/resolve/forms";
import type { Market } from "../../lib/markets/types";
import { SHELL_PREFETCH, type FooterVariant } from "../../lib/site";
import { FormHoneypot } from "../cms/form-honeypot";
import { NewsletterFormIsland } from "../cms/newsletter-form-island";
import { ShellLogo } from "./logo";
import { getShellData } from "./shell-data";

// The shop's footer (D66): the `footer` global's design, columns, profiles, legal links, payment
// marks and copyright (T61, D78; until it is saved, `site.ts`'s columns: the top-level categories
// and the help links), the market switcher and the logo. A footer draws nothing for an empty list.
// The newsletter (T67, D81) is the footer global's form, drawn by the island that keeps the forms'
// server action's answer; the footer draws none without one.

const FOOTERS: Record<FooterVariant, (props: FooterProps) => ReactElement> = {
  "multi-column": FooterMultiColumn,
  "newsletter-first": FooterNewsletterFirst,
  minimal: FooterMinimal,
  wordmark: FooterWordmark,
  "two-tier": FooterTwoTier,
};

/**
 * The footer's newsletter: the form's privacy page, and the island that posts to the form. Without
 * scripts it posts to the market's home, a page prerendered whole, which draws the answer in its
 * footer from any page (`form-island-state.ts`).
 */
function newsletterProps(
  signup: NewsletterTarget,
  market: Market,
  homeHref: string,
  messages: Messages,
): Pick<FooterProps, "newsletter" | "newsletterSlot"> {
  const newsletter = { email: "", privacyHref: signup.privacyHref };
  return {
    newsletter,
    newsletterSlot: (
      <NewsletterFormIsland
        newsletter={newsletter}
        copy={messages.molecules.newsletterForm}
        locale={market.htmlLang}
        headingLevel={2}
        prefetch={SHELL_PREFETCH}
        fieldName={signup.fieldName}
        hiddenFields={<FormHoneypot label={messages.sections.form.honeypot} />}
        submit={submitForm.bind(null, { market: market.key, form: signup.formId })}
        formId="footer-newsletter"
        permalink={`${homeHref}#footer-newsletter`}
      />
    ),
  };
}

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
      {...(footer.newsletter === undefined
        ? {}
        : newsletterProps(footer.newsletter, market, url("/"), messages))}
      marketSwitcherCopy={messages.molecules.marketSwitcher}
      locale={market.htmlLang}
      prefetch={SHELL_PREFETCH}
    />
  );
}
