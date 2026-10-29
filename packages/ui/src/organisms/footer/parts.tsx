// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4 and §13, D42, D44, D46, D49). What
// the five footers share: the props, the logo, the columns of links, the newsletter, the social
// links, the legal links, the payment marks, the market switcher and the copyright line. Server
// components' parts, on purpose: a footer makes every word (the logo link's name, each social
// link's name) and hands plain data to the client parts that its molecules bring (the accordion's
// Base UI parts, MarketSwitcher), so no catalog, formatter or flag reaches a client chunk (D49).
//
// The columns are drawn twice and CSS shows one (`FooterColumns`, below). Below `md` (768 px) each
// column is an AccordionItem, collapsed; from `md` up the columns stand side by side as a heading and
// a list. A collapsed accordion cannot become an always-open column with CSS alone: its trigger would
// stay a button that says "collapsed" over a list that is on screen, in the tab order and in the
// accessibility tree. So each width gets the structure that is true for it, and the other is
// `display: none`, which takes it out of the accessibility tree and the tab order. Every link is in
// the server's HTML, which is what a crawler reads: the side-by-side copy holds them at every width,
// and the accordion keeps its closed panels in the page too (`keepMounted`, Base UI's way: the panel
// stays, with `hidden`). Base UI's `hiddenUntilFound`, which lets the browser's find-in-page open a
// panel on a match, is not used: once a script asks for a link's box, Chrome lays out the content
// that the closed panel hides, and the panel's `overflow-hidden` then clips text on paper, which the
// design system's clipping check reports. A link that opens another site (`external`) opens a new
// tab, through the Link atom, which says so to a screen reader after the link's text.
//
// Every control is 44 px at least (D32): the text links have a row of `min-h-11`, the social links
// are `size-11`, the logo link has `min-h-11`. Long labels wrap and never truncate: the text links,
// the logo and the copyright break words that are longer than their box (`wrap-anywhere`), and a
// grid track shrinks (`minmax(0, ...)`) rather than push the page wider than the window. Colours are
// tokens: the footer is `bg-muted`, whose text is `foreground` (and `muted-foreground` for the
// copyright, 4.54:1 on `muted`), and the same pairs hold on `secondary`.
//
// `drawn` is for the design system's states and no shop's page passes it: it passes a column open in
// the accordion and, for the market switcher, the organisms' own "drawn open at first render"
// props (`defaultOpen`, `modal={false}`), the way the headers' `drawn` does.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { Footer, FooterColumn, Link as FooterLinkData } from "@shopblok/registry/contracts";
import { Link } from "@shopblok/ui/atoms/link";
import { Logo } from "@shopblok/ui/atoms/logo";
import { PaymentIcon } from "@shopblok/ui/atoms/payment-icon";
import { cn } from "@shopblok/ui/lib/utils";
import { AccordionItem } from "@shopblok/ui/molecules/accordion-item";
import { MarketSwitcher } from "@shopblok/ui/molecules/market-switcher";
import { NewsletterForm, type NewsletterFormProps } from "@shopblok/ui/molecules/newsletter-form";
import { Accordion } from "@shopblok/ui/primitives/accordion";
import NextLink from "next/link";
import type * as React from "react";
import { paymentMarks } from "../../atoms/payment-marks";
import { socialMarks } from "./social-marks";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/** What a footer draws open at first render, for the design system's states. */
type FooterDrawn = {
  /** The index in `columns` of the column that is open in the accordion (below `md`). */
  column?: number;
  /** The market switcher's popup in this form, open. */
  switcher?: "popover" | "drawer";
};

type FooterProps = Footer & {
  /** The wording: the footer's own, from the catalog's `organisms.footer`. */
  copy: Messages["organisms"]["footer"];
  /** NewsletterForm's wording, `molecules.newsletterForm`. */
  newsletterCopy: Messages["molecules"]["newsletterForm"];
  /** MarketSwitcher's wording, `molecules.marketSwitcher`. */
  marketSwitcherCopy: Messages["molecules"]["marketSwitcher"];
  /** The market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch` for every link; the design system passes `false` (the pages 404 until M3). */
  prefetch?: boolean | null;
  /** The logo's SVG; without it the Logo atom writes the store's name. */
  logo?: React.ReactNode;
  /** What the newsletter form's `<form action>` takes (M3's server action). */
  newsletterAction?: NewsletterFormProps["action"];
  /**
   * The shop's own signup, drawn in the newsletter's place instead of the plain form (T67: the
   * island that keeps the server action's answer). Drawn only when `newsletter` is set.
   */
  newsletterSlot?: React.ReactNode;
  /** The level of the footer's headings (the columns', the social links', the newsletter's). Default 2. */
  headingLevel?: HeadingLevel;
  className?: string;
  /** Overlays and sections drawn open for the design system's states; a shop's page never passes it. */
  drawn?: FooterDrawn;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; the hrefs here are
// strings the app built (the same cast as the headers').
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** The page's width and gutters, as the headers have them. */
const CONTAINER = "mx-auto w-full max-w-page px-4 sm:px-6 lg:px-8";

/** What a drawn-open sheet changes in it, to stand still in a box: nothing slides, nothing bleeds. */
const STILL_SHEET = "[--bleed:0px] duration-0";

/** The classes of every variant's `<footer>`: the page's ground a step down, and a rule on top. */
function footerClass(className?: string): string {
  return cn("w-full border-t bg-muted text-foreground", className);
}

/** Whether the market switcher is on: the shop wants it and has the markets to list. */
function hasSwitcher(footer: FooterProps): boolean {
  return footer.marketSwitcher && footer.market !== undefined;
}

/** A heading of the footer, `text-sm` and strong, at the level the page needs. */
function FooterHeading({
  level = 2,
  className,
  children,
}: {
  level?: HeadingLevel;
  className?: string;
  children: React.ReactNode;
}) {
  const Heading = `h${level}` as const;
  return (
    <Heading
      data-slot="footer-heading"
      className={cn("text-sm leading-snug font-semibold wrap-anywhere", className)}
    >
      {children}
    </Heading>
  );
}

/**
 * The logo, a link home named "{store}, home". The Logo atom draws it: the SVG, or the store's name.
 * `w-fit` and `self-start` keep the hit area to the logo in a column that would stretch it.
 */
function FooterLogo({ footer, className }: { footer: FooterProps; className?: string }) {
  const { storeName, homeHref, copy, locale, logo, prefetch } = footer;
  return (
    <NextLink
      href={homeHref as LinkHref}
      prefetch={prefetch}
      aria-label={formatMessage(copy.home, { store: storeName }, locale)}
      data-slot="footer-logo"
      className={cn(
        "inline-flex min-h-11 w-fit max-w-full min-w-11 items-center self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
    >
      <Logo name={storeName}>{logo}</Logo>
    </NextLink>
  );
}

/**
 * A text link in a list: a 44 px row (the Link atom's `standalone`, as a block so the row is not
 * a line box's baseline), the foreground colour, underlined as the accordion's links are. A link the
 * contract marks `external` opens a new tab and says so after its text.
 */
function FooterLink({
  link,
  footer,
  className,
}: {
  link: FooterLinkData;
  footer: FooterProps;
  className?: string;
}) {
  const { copy, prefetch } = footer;
  return (
    <Link
      href={link.href as LinkHref}
      prefetch={prefetch}
      variant="standalone"
      target={link.external === true ? "_blank" : undefined}
      newTabLabel={link.external === true ? copy.newTab : undefined}
      data-slot="footer-link"
      className={cn(
        "flex w-fit max-w-full min-w-11 py-1 text-sm text-foreground wrap-anywhere hover:decoration-2",
        className,
      )}
    >
      {link.label}
    </Link>
  );
}

/** A column's links as a list of 44 px rows. */
function ColumnLinks({ column, footer }: { column: FooterColumn; footer: FooterProps }) {
  return (
    <ul data-slot="footer-links" className="m-0 flex list-none flex-col p-0">
      {column.links.map((link, index) => (
        <li key={`${index}-${link.href}`} className="min-w-0">
          <FooterLink link={link} footer={footer} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The columns, in one navigation landmark named by the catalog's "Footer", drawn twice and shown
 * once each (the header above explains why): an accordion of AccordionItems below `md`, collapsed,
 * and from `md` up a grid of headings and lists whose tracks are as many as fit at 10rem (`auto-fit`,
 * so that three columns share the row and five wrap in two when the room is short). Nothing without
 * columns: an empty landmark would be noise. The accordion lets several columns be open at once, as
 * a reader of a footer would expect, and keeps its panels in the page, closed (`keepMounted`).
 */
function FooterColumns({ footer, className }: { footer: FooterProps; className?: string }) {
  const { columns, copy, headingLevel = 2, drawn } = footer;
  if (columns.length === 0) return null;
  const open = drawn?.column !== undefined && drawn.column < columns.length ? drawn.column : null;
  return (
    <nav
      aria-label={copy.navigation}
      data-slot="footer-columns"
      className={cn("min-w-0", className)}
    >
      <Accordion
        multiple
        keepMounted
        defaultValue={open === null ? undefined : [`column-${open}`]}
        data-slot="footer-accordion"
        className="border-y md:hidden"
      >
        {columns.map((column, index) => (
          <AccordionItem
            key={`${index}-${column.title}`}
            value={`column-${index}`}
            title={column.title}
            headingLevel={headingLevel}
          >
            <ColumnLinks column={column} footer={footer} />
          </AccordionItem>
        ))}
      </Accordion>
      <div
        data-slot="footer-column-grid"
        className="hidden gap-x-10 gap-y-10 md:grid md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]"
      >
        {columns.map((column, index) => (
          <div key={`${index}-${column.title}`} data-slot="footer-column" className="min-w-0">
            <FooterHeading level={headingLevel} className="mb-2">
              {column.title}
            </FooterHeading>
            <ColumnLinks column={column} footer={footer} />
          </div>
        ))}
      </div>
    </nav>
  );
}

/**
 * The newsletter signup, NewsletterForm at the footer's heading level. Its layout is a container
 * query on its own width (a row when it is 28rem wide, stacked below), so the box around it must
 * have a width of its own: a block, or a flex or grid item that may shrink (`min-w-0`).
 */
function FooterNewsletter({ footer, className }: { footer: FooterProps; className?: string }) {
  const {
    newsletter,
    newsletterCopy,
    newsletterAction,
    newsletterSlot,
    locale,
    prefetch,
    headingLevel = 2,
  } = footer;
  if (newsletter === undefined) return null;
  return (
    <div data-slot="footer-newsletter" className={cn("min-w-0", className)}>
      {newsletterSlot ?? (
        <NewsletterForm
          newsletter={newsletter}
          copy={newsletterCopy}
          locale={locale}
          action={newsletterAction}
          headingLevel={headingLevel}
          prefetch={prefetch}
        />
      )}
    </div>
  );
}

/**
 * The shop's profiles: a heading and a list of icon links, each a `size-11` target named "{store} on
 * {network}" (the network's own name, from the mark's title, since a brand's name is not translated)
 * and drawing the network's mark in `currentColor`, hidden from assistive technology. `hideHeading`
 * keeps the heading for a screen reader and leaves it off the screen, for a row that has no room for
 * words (the minimal footer's). Nothing without profiles.
 */
function FooterSocial({
  footer,
  hideHeading = false,
  className,
}: {
  footer: FooterProps;
  hideHeading?: boolean;
  className?: string;
}) {
  const { social, storeName, copy, locale, prefetch, headingLevel = 2 } = footer;
  if (social.length === 0) return null;
  return (
    <div data-slot="footer-social" className={cn("flex min-w-0 flex-col gap-1", className)}>
      <FooterHeading level={headingLevel} className={hideHeading ? "sr-only" : undefined}>
        {copy.social}
      </FooterHeading>
      <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
        {social.map((profile) => {
          const mark = socialMarks[profile.network];
          return (
            <li key={profile.network}>
              <NextLink
                href={profile.href as LinkHref}
                prefetch={prefetch}
                aria-label={formatMessage(
                  copy.socialLink,
                  { store: storeName, network: mark.title },
                  locale,
                )}
                data-slot="footer-social-link"
                data-network={profile.network}
                className="inline-flex size-11 items-center justify-center rounded-md text-foreground outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-5 shrink-0 fill-current"
                >
                  <path d={mark.path} />
                </svg>
              </NextLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The legal links (terms, privacy, cookies, the legal notice) in a navigation landmark of their own,
 * named by the catalog's "Legal": they stand apart from the columns, in the bottom row or bar. A list
 * of text links that wrap onto more rows when the room is short. Nothing without links.
 */
function FooterLegal({ footer, className }: { footer: FooterProps; className?: string }) {
  const { legalLinks, copy } = footer;
  if (legalLinks.length === 0) return null;
  return (
    <nav aria-label={copy.legal} data-slot="footer-legal" className={cn("min-w-0", className)}>
      <ul className="m-0 flex list-none flex-wrap gap-x-6 p-0">
        {legalLinks.map((link, index) => (
          <li key={`${index}-${link.href}`} className="max-w-full min-w-0">
            <FooterLink link={link} footer={footer} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The marks of the ways to pay, a list named "Ways to pay" of PaymentIcon images, each labelled with
 * its brand's own name (Simple Icons' title: "Visa", "PayPal"). They say what the shop accepts and
 * are not controls, so they have no 44 px target. Nothing without marks.
 */
function FooterPayments({ footer, className }: { footer: FooterProps; className?: string }) {
  const { paymentIcons, copy } = footer;
  if (paymentIcons.length === 0) return null;
  return (
    <ul
      aria-label={copy.payment}
      data-slot="footer-payments"
      className={cn("m-0 flex list-none flex-wrap items-center gap-2 p-0", className)}
    >
      {paymentIcons.map((brand) => (
        <li key={brand} className="flex">
          <PaymentIcon
            brand={brand}
            label={paymentMarks[brand].title}
            className="text-foreground"
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * The market switcher in its `auto` form: a popover from `md` up, a bottom sheet below (SPEC §9.4),
 * both triggers in the markup and CSS showing one at each width. The markets go in as they are,
 * and the flags are made on the server inside it (D49). Nothing without `marketSwitcher` and the
 * markets. `drawn.switcher` draws one form open, for the design system's states.
 */
function FooterSwitcher({ footer, className }: { footer: FooterProps; className?: string }) {
  const { market, marketSwitcherCopy, locale, drawn } = footer;
  if (!hasSwitcher(footer) || market === undefined) return null;
  const form = drawn?.switcher;
  if (form === undefined) {
    return (
      <MarketSwitcher
        markets={market.markets}
        copy={marketSwitcherCopy}
        locale={locale}
        className={cn("min-w-0", className)}
      />
    );
  }
  return (
    <MarketSwitcher
      markets={market.markets}
      copy={marketSwitcherCopy}
      locale={locale}
      className={cn("min-w-0", className)}
      form={form}
      defaultOpen
      modal={false}
      popupClassName={form === "drawer" ? STILL_SHEET : undefined}
    />
  );
}

/** The last line, as small text. */
function FooterCopyright({ footer, className }: { footer: FooterProps; className?: string }) {
  return (
    <p
      data-slot="footer-copyright"
      className={cn("min-w-0 text-sm leading-snug wrap-anywhere text-muted-foreground", className)}
    >
      {footer.copyright}
    </p>
  );
}

/**
 * The bottom row of the multi-column, newsletter-first and wordmark footers: the social links and
 * the market switcher, then the legal links and the payment marks, then the copyright, under a rule.
 * A part that the shop has none of is left out, with the row it would have been on.
 */
function FooterBottom({ footer, className }: { footer: FooterProps; className?: string }) {
  const first = footer.social.length > 0 || hasSwitcher(footer);
  const second = footer.legalLinks.length > 0 || footer.paymentIcons.length > 0;
  return (
    <div data-slot="footer-bottom" className={cn("flex flex-col gap-6 border-t pt-8", className)}>
      {first ? (
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
          <FooterSocial footer={footer} />
          <FooterSwitcher footer={footer} />
        </div>
      ) : null}
      {second ? (
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <FooterLegal footer={footer} />
          <FooterPayments footer={footer} />
        </div>
      ) : null}
      <FooterCopyright footer={footer} />
    </div>
  );
}

export {
  CONTAINER,
  ColumnLinks,
  FooterBottom,
  FooterColumns,
  FooterCopyright,
  FooterHeading,
  FooterLegal,
  FooterLink,
  FooterLogo,
  FooterNewsletter,
  FooterPayments,
  FooterSocial,
  FooterSwitcher,
  footerClass,
  hasSwitcher,
};
export type { FooterDrawn, FooterProps, HeadingLevel, LinkHref };
