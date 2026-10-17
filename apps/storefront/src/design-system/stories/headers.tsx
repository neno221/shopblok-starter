// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13, D44, D45, D46). The stories
// of the six headers. Sample data is `commerceFixtures[ctx.locale].header` (the header every
// variant draws, the announcement bar's messages, the hero picture of the transparent header),
// `.navigation` and `.long.navItem`, the copy is `catalogs[ctx.locale]`, and the locale every `Intl`
// call uses is the market's `<html lang>`. Every link is drawn with `prefetch={false}`: the pages a
// header points to answer 404 until M3.
//
// The live render is the header the way a page draws it: the fixtures' header with the storefront's
// cart island in its `cart` slot (D44) and a `VisitorFixture` beside it that hands the island the
// fixtures' visitor once the page has hydrated, as M3's answer will arrive. Nothing else in a live
// render puts a number into the cart. The states are pictures, so they hand `CartButton` a count
// directly (0 and 120) where the cart is what they show, and the placeholder otherwise.
//
// A state with an announcement draws one message and no rotation: a picture does not move, and
// the live render's bar (three messages in turn) is paused by the checks' reduced motion (D50).
// Every state is a landmark of the same page as the others, so its navigation and its announcement
// region are named apart with the state's label, in brackets: two navigations named alike on one
// page confuse a screen-reader user, who then has to guess which is which.
//
// The open states are drawn inside an `OverlayBox` (D45) with the headers' `drawn` prop, which passes
// the organisms' own ways of starting open (`defaultOpenItem`, `defaultOpen`, `modal={false}`, the
// slide switched off). A mega menu's panel and the drawer follow the window's breakpoints: the
// navigation is in the header from 1024 px and the drawer's button is in it below that, so a state
// drawn for one is hidden at the other width and says so in a note, rather than drawing a sheet whose
// button is not there. The panel is capped (`PANEL_CAP`) because in a box below the fold the room
// the window leaves under the bar means nothing, and a panel taller than its box would be cut.
// The minimal header's button is at every width, so its drawer states are drawn at every width.
//
// The transparent header is drawn over the fixtures' hero picture in every state, because the
// picture is what its look is for. A state with nothing open pins the look (`solid` false), as the
// design system's picture of the top of a page; a state with something open pins it solid, which
// is what the header turns into the moment a menu opens, so the markup is the same before and after
// the page hydrates.
//
// Every story sets `statesLayout: "stack"`: a header follows the window's breakpoints, so a state
// has the frame's whole width, one under the other.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import { Image } from "@shopblok/ui/atoms/image";
import { CartButton } from "@shopblok/ui/organisms/header/cart-button";
import { HeaderCentered } from "@shopblok/ui/organisms/header/centered";
import { HeaderClassic } from "@shopblok/ui/organisms/header/classic";
import { HeaderMegaMenu } from "@shopblok/ui/organisms/header/mega-menu";
import { HeaderMinimal } from "@shopblok/ui/organisms/header/minimal";
import type { HeaderProps } from "@shopblok/ui/organisms/header/parts";
import { HeaderTransparent } from "@shopblok/ui/organisms/header/transparent";
import { HeaderTwoTier } from "@shopblok/ui/organisms/header/two-tier";
import type { ReactElement, ReactNode } from "react";
import { VisitorCartButton } from "../../lib/visitor/cart-button";
import { OverlayBox } from "../components/overlay-box";
import { VisitorFixture } from "../components/visitor-fixture";
import type { DsContext, DsState, DsStory } from "../types";

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].organisms;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

/** The most a drawn-open panel is tall in its box, which it scrolls inside. */
const PANEL_CAP = "max-h-[30rem]";

/** The header's props: the fixtures' header, the catalogs' words and no prefetching. */
function headerProps(ctx: DsContext, over: Partial<HeaderProps> = {}): HeaderProps {
  const catalog = catalogs[ctx.locale];
  return {
    ...fixtures(ctx).header.content,
    copy: catalog.organisms,
    marketSwitcherCopy: catalog.molecules.marketSwitcher,
    locale: lang(ctx),
    prefetch: false,
    ...over,
  };
}

/** The catalog's words with the navigation and the announcement region named for one state. */
function wordsFor(ctx: DsContext, state: string): HeaderProps["copy"] {
  const words = copy(ctx);
  return {
    ...words,
    header: { ...words.header, navigation: `${words.header.navigation} (${state})` },
    announcementBar: {
      ...words.announcementBar,
      region: `${words.announcementBar.region} (${state})`,
    },
  };
}

/** The page's cart island: the real button, which draws the count once the visitor store has it. */
function island(ctx: DsContext) {
  return (
    <VisitorCartButton
      href={fixtures(ctx).header.content.cartHref}
      copy={copy(ctx).header}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

/** The cart button with a count, for a state that shows the cart. */
function cartWith(ctx: DsContext, count: number) {
  return (
    <CartButton
      href={fixtures(ctx).header.content.cartHref}
      count={count}
      copy={copy(ctx).header}
      locale={lang(ctx)}
      prefetch={false}
    />
  );
}

/** The index in the navigation of the first mega menu. */
function megaMenuIndex(ctx: DsContext): number {
  const index = fixtures(ctx).navigation.findIndex((item) => item.kind === "megaMenu");
  if (index === -1) throw new Error("The fixtures' navigation has no mega menu");
  return index;
}

/** What differs between the six: how a header is drawn, and where. */
type Spec = {
  summary: string;
  a11y: readonly string[];
  /** The header; `solid` is the transparent one's pin. */
  draw: (props: HeaderProps, solid?: boolean) => ReactElement;
  /** Where a header is drawn: bare, or over the hero. */
  frame: (ctx: DsContext, header: ReactElement) => ReactNode;
  /** The transparent header's pin for a state with nothing open and one with something open. */
  pins?: { plain: boolean; open: boolean };
  /** The navigation is in the header from 1024 px, so a panel can be drawn open. */
  navigation: boolean;
  /** The menu button is at every width, so the drawer is drawn at every width. */
  drawerAtEveryWidth: boolean;
};

const bare: Spec["frame"] = (_ctx, header) => header;

/** A header over the hero picture, which the transparent header's surface hangs over. */
const overHero: Spec["frame"] = (ctx, header) => {
  const { hero } = fixtures(ctx).header;
  return (
    <div className="relative">
      {header}
      <Image
        src={hero.src}
        alt={hero.alt}
        ratio="video"
        radius="none"
        sizes="100vw"
        className="aspect-auto h-80"
      />
    </div>
  );
};

type Kind = "plain" | "open";

/** The props a state draws with: a quiet announcement, its own landmark names, then its own. */
function stateProps(ctx: DsContext, label: string, over: Partial<HeaderProps>): HeaderProps {
  return headerProps(ctx, {
    announcement: fixtures(ctx).header.announcements.single,
    copy: wordsFor(ctx, label),
    ...over,
  });
}

/** A state drawn in the variant's frame, with nothing open unless `over.drawn` says so. */
function plainState(
  spec: Spec,
  id: string,
  label: string,
  description: string,
  over: (ctx: DsContext) => Partial<HeaderProps> = () => ({}),
  kind: Kind = "plain",
): DsState {
  return {
    id,
    label,
    description,
    render: (ctx) =>
      spec.frame(
        ctx,
        spec.draw(
          stateProps(ctx, label, over(ctx)),
          spec.pins === undefined ? undefined : spec.pins[kind],
        ),
      ),
  };
}

/** A state with an overlay open: the same in an `OverlayBox`, and hidden at the widths it is not for. */
function overlayState(
  spec: Spec,
  options: {
    id: string;
    label: string;
    description: string;
    /** The box's name and height. */
    box: [name: string, height: number];
    over: (ctx: DsContext) => Partial<HeaderProps>;
    /** The widths the overlay exists at: from 1024 px, below it, or all. */
    widths: "from-lg" | "below-lg" | "all";
    note?: string;
  },
): DsState {
  const { id, label, description, box, over, widths, note } = options;
  return {
    id,
    label,
    description,
    render: (ctx) => {
      const drawn = (
        <OverlayBox name={box[0]} height={box[1]}>
          {spec.frame(ctx, spec.draw(stateProps(ctx, label, over(ctx)), spec.pins?.open))}
        </OverlayBox>
      );
      if (widths === "all") return drawn;
      const hint = (
        <p
          className={
            widths === "from-lg"
              ? "px-1 text-sm text-muted-foreground lg:hidden"
              : "hidden px-1 text-sm text-muted-foreground lg:block"
          }
        >
          {note}
        </p>
      );
      return (
        <>
          {hint}
          <div className={widths === "from-lg" ? "hidden lg:block" : "lg:hidden"}>{drawn}</div>
        </>
      );
    },
  };
}

/** The states every header has; the ones with a panel or a drawer are left out where it has none. */
function commonStates(spec: Spec): DsState[] {
  const states: DsState[] = [
    plainState(
      spec,
      "no-announcement",
      "No announcement",
      "The header with no announcement bar: the skip link is still the first control, and the row is the first thing on the page.",
      () => ({ announcement: undefined }),
    ),
    plainState(
      spec,
      "empty-cart",
      "Empty cart",
      "The cart of a visitor with nothing in it: the link is named “Cart empty” and no badge is drawn.",
      (ctx) => ({ cart: cartWith(ctx, 0) }),
    ),
    plainState(
      spec,
      "full-cart",
      "Cart of 120",
      "A cart with more items than the badge has room for: it reads “99+” and the link's name keeps the real number, “Cart 120 items”.",
      (ctx) => ({ cart: cartWith(ctx, 120) }),
    ),
    plainState(
      spec,
      "long",
      "Long labels",
      "The longest store name, a navigation item whose labels are the longest strings of the locale and a long announcement: the logo, the items and the message wrap, and nothing is cut.",
      (ctx) => ({
        storeName: ctx.fixture.long.storeName,
        navigation: [fixtures(ctx).long.navItem, ...fixtures(ctx).navigation.slice(1)],
        announcement: fixtures(ctx).header.announcements.long,
      }),
    ),
    overlayState(spec, {
      id: "mobile-drawer",
      label: "Mobile drawer, open",
      description:
        "The menu button's drawer drawn open at its first level: the navigation, and at its foot the account links and the market switcher.",
      box: ["Mobile drawer", 760],
      over: () => ({ drawn: { drawer: {} } }),
      widths: spec.drawerAtEveryWidth ? "all" : "below-lg",
      note: "The drawer is for windows narrower than 1024 px; from there the navigation is in the header (see “Mega menu panel, open”).",
    }),
  ];
  if (spec.navigation) {
    states.push(
      overlayState(spec, {
        id: "mega-menu",
        label: "Mega menu panel, open",
        description:
          "A mega menu's panel drawn open under the navigation: as wide as the navigation's own row, with its columns and featured tiles, and capped in height so it scrolls inside its box.",
        box: ["Mega menu panel", 760],
        over: (ctx) => ({ drawn: { panel: megaMenuIndex(ctx), panelClassName: PANEL_CAP } }),
        widths: "from-lg",
        note: "The navigation and its panels are for windows of 1024 px and more; below that the drawer holds them (see “Mobile drawer, open”).",
      }),
    );
  }
  return states;
}

/** A story from a spec: the live render with the cart island, and the states. */
function story(spec: Spec, lead: DsState[] = [], tail: DsState[] = []): DsStory {
  return {
    summary: spec.summary,
    a11y: spec.a11y,
    live: (ctx) => (
      <>
        {spec.frame(ctx, spec.draw(headerProps(ctx, { cart: island(ctx) })))}
        <VisitorFixture cartCount={fixtures(ctx).header.cartCount} />
      </>
    ),
    states: [...lead, ...commonStates(spec), ...tail],
    statesLayout: "stack",
  };
}

// What every header's a11y notes say, once: the skip link, the landmarks, the cart.
const skipLinkNote =
  "The first tab stop of the page is a skip link, “Skip to content”, hidden until it has focus; it jumps to the page's main content and comes before the announcement bar and the header, so one press passes both.";
const cartNote =
  "The cart link is on screen at every width and is named “Cart”. The server's HTML holds the link with no number, because a prerendered page is the same for everyone; once the browser has the visitor's cart the name adds the count (“Cart 3 items”) through a polite live region and the badge reads “99+” above 99.";
const targetsNote =
  "Every control is at least 44 px square, the focus ring is at full strength, and long labels wrap and are never cut.";
const navigationNote =
  "From 1024 px the navigation is a row of links and menu buttons: Tab moves between the items, Enter, Space or ArrowDown opens a dropdown or a mega menu, Escape closes the panel with focus back on its trigger, and the arrow keys move between the top-level items (the navigation is MegaMenu, whose page has the whole set).";
const drawerNote =
  "Below 1024 px a menu button named “Menu” opens a modal drawer that holds the navigation, the account and wishlist links and the market switcher, and the logo sits between the button and the end of the row.";

// --- The six ---

const classic: Spec = {
  summary:
    "The classic header: the logo at the start, the navigation after it and the search, account, wishlist, market switcher and cart at the end, with a drawer below 1024 px.",
  a11y: [
    skipLinkNote,
    "The header is the page's banner. It holds one navigation landmark named by the catalog's “Main”, and the announcement bar above it is a region named “Announcements”; the logo is a link named “Shopblok, home”.",
    navigationNote,
    drawerNote,
    "The market switcher is in the row from 1024 px as a popover, and in the drawer's foot below that as a bottom sheet that opens over the drawer; either way it is named by the market it shows.",
    cartNote,
    targetsNote,
  ],
  draw: (props) => <HeaderClassic {...props} />,
  frame: bare,
  navigation: true,
  drawerAtEveryWidth: false,
};

const centered: Spec = {
  summary:
    "The centered header: the logo in the middle of the navigation, which is split around it, with the utilities and the cart in a row above and the classic row's drawer below 1024 px.",
  a11y: [
    skipLinkNote,
    "The header is the page's banner. It holds one navigation landmark named by the catalog's “Main”, with two lists in it, half the items on each side of the logo; Tab visits the first half, the logo, then the second half.",
    "The logo is in the markup twice, once for each layout, and the one that is not shown is display none, so a screen reader and a keyboard meet it once. Both are links named “Shopblok, home”.",
    navigationNote,
    drawerNote,
    "The utilities and the cart are in a row above the navigation, and the markup follows the page: Tab reaches the search, the account links, the market switcher and the cart before the navigation.",
    cartNote,
    targetsNote,
  ],
  draw: (props) => <HeaderCentered {...props} />,
  frame: bare,
  navigation: true,
  drawerAtEveryWidth: false,
};

const twoTier: Spec = {
  summary:
    "The two-tier header: a top bar with the market switcher and the account links above the classic row of the logo, the navigation, the search and the cart.",
  a11y: [
    skipLinkNote,
    "The header is the page's banner. It holds one navigation landmark named by the catalog's “Main”; the top bar is part of the banner and is not a landmark of its own.",
    "The top bar holds the market switcher at every width, a popover from 768 px and a bottom sheet below it, named by the market it shows. From 1024 px it also holds the account and wishlist links as words; below that the drawer holds them.",
    navigationNote,
    drawerNote,
    cartNote,
    targetsNote,
  ],
  draw: (props) => <HeaderTwoTier {...props} />,
  frame: bare,
  navigation: true,
  drawerAtEveryWidth: false,
};

const megaMenu: Spec = {
  summary:
    "The mega menu header: the logo, a wide search, the utilities and the cart in a first row, and the navigation in a row of its own so a panel spans the header.",
  a11y: [
    skipLinkNote,
    "The header is the page's banner. It holds one navigation landmark named by the catalog's “Main”, in a row of its own under the first, as wide as the header's content, so a mega menu's panel is as wide as the header.",
    "The search is one link at every width: an icon below 1024 px, and from there a box that reads “Search” like a field. It goes to the search page until the search overlay arrives; its name is the word “Search” at every width.",
    navigationNote,
    drawerNote,
    cartNote,
    targetsNote,
  ],
  draw: (props) => <HeaderMegaMenu {...props} />,
  frame: bare,
  navigation: true,
  drawerAtEveryWidth: false,
};

const minimal: Spec = {
  summary:
    "The minimal header: a menu button at every width, the logo in the middle and the search and the cart at the end, with everything else in the drawer.",
  a11y: [
    skipLinkNote,
    "The header is the page's banner and has no navigation landmark: the menu button, named “Menu”, opens the drawer at every width, and the drawer holds the navigation, the account and wishlist links and the market switcher.",
    "The drawer is a modal dialog named by its title: the page behind is inert, Tab stays inside it, Escape closes it and focus goes back to the menu button. A dropdown or a mega menu is a level with a back button named for where it goes.",
    "The search stays beside the cart when the shop has a search page, since a shop with no search anywhere is not one a visitor can use.",
    cartNote,
    targetsNote,
  ],
  draw: (props) => <HeaderMinimal {...props} />,
  frame: bare,
  navigation: false,
  drawerAtEveryWidth: true,
};

const transparent: Spec = {
  summary:
    "The transparent header: the classic header laid over the page's hero, see-through at the top of the page and solid once it scrolls or a menu opens.",
  a11y: [
    skipLinkNote,
    "The header is the page's banner. It holds one navigation landmark named by the catalog's “Main”, and the announcement bar above it is a region named “Announcements”; the logo is a link named “Shopblok, home”.",
    "Over the picture the text is light on a scrim, a 60 % black layer that fades out under the row, so the text keeps its contrast on any photograph; the scrim is hidden from a screen reader. Once the page has scrolled, or a menu, the market switcher or the drawer is open, the header is the classic one on the page's ground.",
    "The markup is the same in both looks, only the colours change, so a reader's place, the focus ring (light on the picture, dark on the page's ground) and the names of the controls do not move.",
    "The header takes no room in the page: it is zero height and its surface hangs over what follows, so the hero begins at the top of the page. The page can pin the look (`solid`), for a page with no hero under the header.",
    navigationNote,
    drawerNote,
    cartNote,
    targetsNote,
  ],
  draw: (props, solid) => <HeaderTransparent {...props} solid={solid} />,
  frame: overHero,
  pins: { plain: false, open: true },
  navigation: true,
  drawerAtEveryWidth: false,
};

/** The states only the transparent header has: its two looks, over the picture. */
const transparentLead: DsState[] = [
  plainState(
    transparent,
    "over-hero",
    "Over the hero",
    "The look at the top of the page: light text on a scrim over the hero picture, with no ground of its own and no rule.",
  ),
  plainState(
    transparent,
    "solid",
    "Solid",
    "The look once the page has scrolled or a menu is open: the page's ground, the normal text and a rule under the row, with no scrim, over the same picture.",
    () => ({}),
    "open",
  ),
];

/** The two-tier header's switcher, popover and sheet. */
const twoTierTail: DsState[] = [
  overlayState(twoTier, {
    id: "switcher-popover",
    label: "Market switcher, popover",
    description:
      "The market switcher's popover drawn open under its trigger in the top bar, listing every market with its languages; the current one is marked.",
    box: ["Market switcher, popover", 960],
    over: () => ({ drawn: { switcher: "popover" } }),
    widths: "all",
  }),
  overlayState(twoTier, {
    id: "switcher-sheet",
    label: "Market switcher, sheet",
    description:
      "The same switcher as the bottom sheet a narrow window opens: a sheet that rises from the bottom of its box with the same list.",
    box: ["Market switcher, sheet", 720],
    over: () => ({ drawn: { switcher: "drawer" } }),
    widths: "all",
  }),
];

/** The minimal header's drawer at the level of a mega menu. */
const minimalTail: DsState[] = [
  overlayState(minimal, {
    id: "drawer-level",
    label: "Drawer, a level",
    description:
      "The drawer open at the level of a mega menu: a back button named for where it goes, the item as a heading, “Shop all”, the columns and the featured tiles.",
    box: ["Drawer, a level", 760],
    over: (ctx) => ({ drawn: { drawer: { level: megaMenuIndex(ctx) } } }),
    widths: "all",
  }),
];

export const headerStories = {
  "headers-footers/header-classic": story(classic),
  "headers-footers/header-centered": story(centered),
  "headers-footers/header-two-tier": story(twoTier, [], twoTierTail),
  "headers-footers/header-mega-menu": story(megaMenu),
  "headers-footers/header-minimal": story(minimal, [], minimalTail),
  "headers-footers/header-transparent": story(transparent, transparentLead),
} satisfies Partial<Record<EntryId, DsStory>>;
