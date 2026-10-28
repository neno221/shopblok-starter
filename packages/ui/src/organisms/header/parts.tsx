// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13, D44, D46, D49). What the six
// headers share: the props, the skip link, the announcement bar, the logo, the navigation, the menu
// button, the utilities and the cart. A server component's parts, on purpose: a header makes every
// word (the logo link's name, the labels of the icon links) and hands plain data to its client
// parts (MegaMenu, MobileNavDrawer, MarketSwitcher, AnnouncementBar), so no catalog, formatter or
// flag reaches a client chunk. Only the transparent header has a client part of its own.
//
// What a variant returns is a fragment: the skip link, the announcement bar and then the `<header>`.
// The skip link comes first because it must be the first thing a keyboard reaches, before the bar's
// own controls. The bar is not inside the `<header>`, so a sticky header sticks alone and the bar
// scrolls away: a sticky element sticks within its parent, and the parent of a header that held the
// bar would be as tall as the bar and the header together.
//
// Each piece of a header is in the markup once and CSS places it, because the page must hold exactly
// one cart (the island fills it in, D44) and a reader's Tab order must follow what the eye sees.
// The row of every variant is a grid with the menu button in the first column, the logo in the
// middle and the cart at the end below `lg` (1024 px, SPEC §9.4), so the logo is centered whatever
// the buttons beside it; from `lg` the menu button is gone and the variant's own layout takes
// over. The search icon stays at every width (SBP navbar.md: the search icon beside the cart); the
// account and wishlist links and the navigation are for `lg` and up, and below it the drawer holds
// the account links and the switcher in its bottom-sheet form. The switcher is in the row at every
// width too, as its flag alone below `lg` (W5: the market a phone's shopper is in, one tap away).
//
// Every control is 44 px at least (D32): the icon links are `size-11` buttons, the logo link has
// `min-h-11`, and the skip link has it once it shows. Long labels wrap and never truncate: the logo
// and the text links break words that are longer than their box (`wrap-anywhere`), and a row's
// grid tracks shrink (`minmax(0, ...)`) rather than push the page wider than the window.
//
// `drawn` is for the design system's states and no shop's page passes it: it passes the organisms'
// own "drawn open at first render" props (`defaultOpenItem`, `defaultOpen`, `modal={false}`) on to
// the navigation, the drawer and the switcher, the way their stories draw them.
import type { Messages } from "@shopblok/i18n";
import { formatMessage } from "@shopblok/i18n/format";
import type { Header } from "@shopblok/registry/contracts";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { Logo } from "@shopblok/ui/atoms/logo";
import { cn } from "@shopblok/ui/lib/utils";
import { MarketSwitcher } from "@shopblok/ui/molecules/market-switcher";
import { AnnouncementBar } from "@shopblok/ui/organisms/announcement-bar";
import { CartButton } from "@shopblok/ui/organisms/header/cart-button";
import { MegaMenu } from "@shopblok/ui/organisms/mega-menu";
import { MobileNavDrawer } from "@shopblok/ui/organisms/mobile-nav-drawer";
import { HeartIcon, SearchIcon, UserIcon, type LucideIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

/** Overlays a header draws open at first render, for the design system's states. */
type HeaderDrawn = {
  /** The index in `navigation` of the dropdown or mega menu whose panel is open. */
  panel?: number;
  /**
   * Classes for that panel's content, after its own: the cap on its height that a box needs, because
   * in a box below the fold the room the window leaves under the bar means nothing. `DRAWN_PANEL_CAP`
   * unless given.
   */
  panelClassName?: string;
  /** The mobile drawer, open at its first level or at the level of the item `level` (an index in `navigation`). */
  drawer?: { level?: number };
  /** The market switcher's popup in this form, open. */
  switcher?: "popover" | "drawer";
};

type HeaderProps = Header & {
  /** The wording: the header's own, the navigation's, the drawer's and the announcement bar's. */
  copy: Pick<Messages["organisms"], "header" | "megaMenu" | "mobileNavDrawer" | "announcementBar">;
  /** MarketSwitcher's wording, for the switcher and for the one in the drawer's foot. */
  marketSwitcherCopy: Messages["molecules"]["marketSwitcher"];
  /** The market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch` for every link; the design system passes `false` (the pages 404 until M3). */
  prefetch?: boolean | null;
  /** The logo's SVG; without it the Logo atom writes the store's name. */
  logo?: React.ReactNode;
  /**
   * D44: the cart, which is per visitor. Without it the header draws CartButton with no count (the
   * placeholder a prerendered page holds); the storefront passes the island that fills it in.
   */
  cart?: React.ReactNode;
  /**
   * The search, which opens over the page (M3: SearchOverlay with the shop's search behind it, D66).
   * Without it the header draws the search link to `utilities.search`, which works with no script.
   */
  search?: React.ReactNode;
  /** The id of the page's main content, the skip link's target. `main` unless given. */
  mainId?: string;
  className?: string;
  /** Overlays drawn open for the design system's states; a shop's page never passes it. */
  drawn?: HeaderDrawn;
};

// `next/link` takes whatever an app with typed routes narrows its `href` to; the hrefs here are
// strings the app built (the same cast as CartButton's).
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

/** The height a drawn-open panel is capped at in a design system box, which the panel scrolls inside. */
const DRAWN_PANEL_CAP = "max-h-[30rem]";

/** What a drawn-open sheet changes in it, to stand still in a box: nothing slides, nothing bleeds. */
const STILL_SHEET = "[--bleed:0px] duration-0";

/** The classes of every variant's `<header>` but the transparent one's: sticky or not, and its rule. */
function headerClass(sticky: boolean, className?: string): string {
  return cn(
    "w-full border-b bg-background text-foreground",
    sticky ? "sticky top-0 z-(--z-header)" : "relative z-(--z-header)",
    className,
  );
}

/** The links the drawer's foot holds: the header's account and wishlist, with the copy's labels. */
function drawerAccount(header: HeaderProps): { label: string; href: string }[] {
  const { utilities, copy } = header;
  return [
    utilities.account === undefined
      ? null
      : { label: copy.header.account, href: utilities.account },
    utilities.wishlist === undefined
      ? null
      : { label: copy.header.wishlist, href: utilities.wishlist },
  ].filter((link) => link !== null);
}

/** Whether the market switcher is on: the shop wants it and has the markets to list. */
function hasSwitcher(header: HeaderProps): boolean {
  return header.utilities.marketSwitcher && header.market !== undefined;
}

/** Whether there is anything for the drawer to hold. */
function hasDrawer(header: HeaderProps): boolean {
  return header.navigation.length > 0 || drawerAccount(header).length > 0 || hasSwitcher(header);
}

/** The first focusable element: hidden until it has focus, then above everything (SPEC §13). */
function SkipLink({ header }: { header: HeaderProps }) {
  return (
    <a
      href={`#${header.mainId ?? "main"}`}
      data-slot="skip-link"
      className="sr-only rounded-md bg-background text-sm font-medium text-foreground shadow-md outline-none focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-(--z-toast) focus:min-h-11 focus:px-4 focus:py-3 focus-visible:ring-3 focus-visible:ring-ring"
    >
      {header.copy.header.skipToContent}
    </a>
  );
}

/** The skip link and, when the shop has one, the announcement bar: everything above the `<header>`. */
function HeaderTop({ header }: { header: HeaderProps }) {
  const { announcement, copy, locale, prefetch } = header;
  return (
    <>
      <SkipLink header={header} />
      {announcement === undefined ? null : (
        <AnnouncementBar
          {...announcement}
          copy={copy.announcementBar}
          locale={locale}
          prefetch={prefetch}
        />
      )}
    </>
  );
}

/** The logo, a link home named "{store}, home". The Logo atom draws it: the SVG, or the store's name. */
function HeaderLogo({ header, className }: { header: HeaderProps; className?: string }) {
  const { storeName, homeHref, copy, locale, logo, prefetch } = header;
  return (
    <NextLink
      href={homeHref as LinkHref}
      prefetch={prefetch}
      aria-label={formatMessage(copy.header.home, { store: storeName }, locale)}
      data-slot="header-logo"
      className={cn(
        "inline-flex min-h-11 max-w-full min-w-11 items-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
    >
      <Logo name={storeName}>{logo}</Logo>
    </NextLink>
  );
}

/**
 * The navigation as MegaMenu draws it, named by the catalog's "Main". The caller hides it below `lg`
 * (`className`). Nothing without items: an empty landmark would be noise.
 */
function HeaderNav({
  header,
  className,
  splitAt,
  center,
}: {
  header: HeaderProps;
  className?: string;
  splitAt?: number;
  center?: React.ReactNode;
}) {
  const { navigation, copy, locale, prefetch, drawn } = header;
  if (navigation.length === 0) return null;
  return (
    <MegaMenu
      items={navigation}
      copy={copy.megaMenu}
      label={copy.header.navigation}
      locale={locale}
      prefetch={prefetch}
      splitAt={splitAt}
      center={center}
      defaultOpenItem={drawn?.panel}
      panelClassName={
        drawn?.panel === undefined ? undefined : (drawn.panelClassName ?? DRAWN_PANEL_CAP)
      }
      className={className}
    />
  );
}

/**
 * The menu button and the sheet it opens, with the account links and, when the switcher is on, the
 * switcher in its bottom-sheet form at the foot. `className` is the button's.
 */
function HeaderMenuButton({ header, className }: { header: HeaderProps; className?: string }) {
  const { navigation, utilities, market, copy, marketSwitcherCopy, locale, prefetch, drawn } =
    header;
  if (!hasDrawer(header)) return null;
  const common = {
    items: navigation,
    account: drawerAccount(header),
    market: utilities.marketSwitcher ? market : undefined,
    copy: copy.mobileNavDrawer,
    marketSwitcherCopy,
    locale,
    prefetch,
    triggerClassName: className,
  };
  if (drawn?.drawer === undefined) return <MobileNavDrawer {...common} />;
  return (
    <MobileNavDrawer
      {...common}
      defaultOpen
      modal={false}
      defaultLevel={drawn.drawer.level}
      popupClassName="duration-0"
    />
  );
}

/** A 44 px icon link: the glyph is decoration and the name is hidden text, as CartButton does it. */
function IconLink({
  href,
  label,
  icon,
  slot,
  prefetch,
  className,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  slot: string;
  prefetch?: boolean | null;
  className?: string;
}) {
  return (
    <NextLink
      href={href as LinkHref}
      prefetch={prefetch}
      data-slot={slot}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), className)}
    >
      <Icon icon={icon} />
      <span className="sr-only">{label}</span>
    </NextLink>
  );
}

/** A 44 px text link with its glyph, for a bar that has the room for words. */
function TextLink({
  href,
  label,
  icon,
  slot,
  prefetch,
  className,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  slot: string;
  prefetch?: boolean | null;
  className?: string;
}) {
  return (
    <NextLink
      href={href as LinkHref}
      prefetch={prefetch}
      data-slot={slot}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "max-w-full text-sm wrap-anywhere",
        className,
      )}
    >
      <Icon icon={icon} />
      {label}
    </NextLink>
  );
}

/**
 * The search: the page's `search` slot (the overlay, M3), or an icon link named "Search" to the
 * search page, which works without JavaScript.
 */
/**
 * The page's search slot in the place the header gives its own search (PR 75 review, item 1): the
 * variant's grid placement is on this box, so an overlay's trigger sits where the link would.
 */
function SearchSlot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-slot="header-search-slot" className={cn("flex shrink-0 items-center", className)}>
      {children}
    </div>
  );
}

function HeaderSearch({ header, className }: { header: HeaderProps; className?: string }) {
  const { utilities, copy, prefetch } = header;
  if (header.search !== undefined)
    return <SearchSlot className={className}>{header.search}</SearchSlot>;
  if (utilities.search === undefined) return null;
  return (
    <IconLink
      href={utilities.search}
      label={copy.header.search}
      icon={SearchIcon}
      slot="header-search"
      prefetch={prefetch}
      className={className}
    />
  );
}

/**
 * The same link drawn as a wide field from `lg` up (the mega menu header's): the icon and the word
 * "Search" in a bordered box, and an icon alone below `lg`. It is one link at every width, so
 * the page holds one search link, and the word is its name at every width (WCAG 2.5.3).
 */
function HeaderWideSearch({ header, className }: { header: HeaderProps; className?: string }) {
  const { utilities, copy, prefetch } = header;
  // The slot is the overlay's own button, the same at every width, in the field's place.
  if (header.search !== undefined)
    return <SearchSlot className={className}>{header.search}</SearchSlot>;
  if (utilities.search === undefined) return null;
  return (
    <NextLink
      href={utilities.search as LinkHref}
      prefetch={prefetch}
      data-slot="header-search"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-md text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring lg:h-auto lg:min-h-11 lg:w-full lg:justify-start lg:border lg:border-input lg:px-4 lg:text-muted-foreground",
        className,
      )}
    >
      <Icon icon={SearchIcon} />
      <span className="sr-only lg:not-sr-only lg:wrap-anywhere">{copy.header.search}</span>
    </NextLink>
  );
}

/** The account and wishlist as icon links, for `lg` and up; below it the drawer has them. */
function HeaderAccountIcons({ header, className }: { header: HeaderProps; className?: string }) {
  const { utilities, copy, prefetch } = header;
  return (
    <>
      {utilities.account === undefined ? null : (
        <IconLink
          href={utilities.account}
          label={copy.header.account}
          icon={UserIcon}
          slot="header-account"
          prefetch={prefetch}
          className={cn("hidden lg:inline-flex", className)}
        />
      )}
      {utilities.wishlist === undefined ? null : (
        <IconLink
          href={utilities.wishlist}
          label={copy.header.wishlist}
          icon={HeartIcon}
          slot="header-wishlist"
          prefetch={prefetch}
          className={cn("hidden lg:inline-flex", className)}
        />
      )}
    </>
  );
}

/** The account and wishlist as text links, for a bar (the two-tier header's); `lg` and up. */
function HeaderAccountText({ header, className }: { header: HeaderProps; className?: string }) {
  const { utilities, copy, prefetch } = header;
  return (
    <>
      {utilities.account === undefined ? null : (
        <TextLink
          href={utilities.account}
          label={copy.header.account}
          icon={UserIcon}
          slot="header-account"
          prefetch={prefetch}
          className={className}
        />
      )}
      {utilities.wishlist === undefined ? null : (
        <TextLink
          href={utilities.wishlist}
          label={copy.header.wishlist}
          icon={HeartIcon}
          slot="header-wishlist"
          prefetch={prefetch}
          className={className}
        />
      )}
    </>
  );
}

/**
 * The market switcher in its `auto` form: a popover from `md` up, a bottom sheet below (SPEC §9.4),
 * both triggers in the markup and CSS showing one. Nothing without `utilities.marketSwitcher`.
 * `className` goes on its box; the caller decides at which widths it shows. `compact` shows the
 * flag alone below `lg`, where a header's row has room for an icon only (W5).
 */
function HeaderSwitcher({
  header,
  className,
  compact,
}: {
  header: HeaderProps;
  className?: string;
  compact?: boolean;
}) {
  const { market, marketSwitcherCopy, locale, drawn } = header;
  if (!hasSwitcher(header) || market === undefined) return null;
  const form = drawn?.switcher;
  if (form === undefined) {
    return (
      <MarketSwitcher
        markets={market.markets}
        copy={marketSwitcherCopy}
        locale={locale}
        className={className}
        compact={compact}
      />
    );
  }
  return (
    <MarketSwitcher
      markets={market.markets}
      copy={marketSwitcherCopy}
      locale={locale}
      className={className}
      compact={compact}
      form={form}
      defaultOpen
      modal={false}
      popupClassName={form === "drawer" ? STILL_SHEET : undefined}
    />
  );
}

/**
 * The cart, visible at every width and in the markup once (D44): the page's slot (the island that
 * knows the count), or CartButton with no count, the placeholder a prerendered page holds.
 */
function HeaderCart({ header }: { header: HeaderProps }) {
  const { cart, cartHref, copy, locale, prefetch } = header;
  return (
    cart ?? <CartButton href={cartHref} copy={copy.header} locale={locale} prefetch={prefetch} />
  );
}

export {
  HeaderAccountIcons,
  HeaderAccountText,
  HeaderCart,
  HeaderLogo,
  HeaderMenuButton,
  HeaderNav,
  HeaderSearch,
  HeaderSwitcher,
  HeaderTop,
  HeaderWideSearch,
  drawerAccount,
  hasDrawer,
  hasSwitcher,
  headerClass,
};
export type { HeaderDrawn, HeaderProps, LinkHref };
