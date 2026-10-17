// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13). The stories of MegaMenu and
// MobileNavDrawer. Sample data is `commerceFixtures[ctx.locale]` (the navigation of the store, the
// drawer's account links and markets, and `long.navItem`, a mega menu whose labels are the longest
// strings of the locale), the copy is `catalogs[ctx.locale].organisms` (and `.molecules` for the
// switcher inside the drawer), and the locale every `Intl` call uses is the market's `<html lang>`.
// Every link is drawn with `prefetch={false}`: the pages they lead to answer 404 until M3.
//
// The open states are drawn inside an `OverlayBox` (D45) with the component's own way of starting
// open: MegaMenu's `defaultOpenItem` (the panel is a portal, and the box is its container) and
// MobileNavDrawer's `defaultOpen`, `modal={false}` (the rest of the frame stays usable, and several
// open states fit on one page) and `defaultLevel`. The boxes are taller than what they hold, so
// nothing is cut: the panel is as wide as its bar and tall at 375 px, where its parts stack, so an
// open state caps it (`panelClassName`, `PANEL_CAP`) and it scrolls inside the cap, as it scrolls in a
// page inside the room the window leaves below the bar. That room is the window's, not the box's: for
// a box below the fold it is less than nothing, which caps nothing, and the panel would run out of
// its box. The sheet is as tall as the box. The sheet's
// slide-in is switched off (`duration-0`) in every state, because no state is a picture of an
// animation. The live renders are the closed components: the bar, and the menu button alone, which
// the interaction checks press.
//
// Both stories set `statesLayout: "stack"`: a state gets the frame's whole width, one under the
// other, because the bar follows the window's width and the sheet is a share of its box's.
//
// A story renders on the server (RSC), so both components, server components themselves, are drawn
// as they are in a page: they make the words and hand plain data to their client parts. The one
// client component here is `OverlayBox`, which gets elements as children.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import type { EntryId } from "@shopblok/registry";
import { MegaMenu, type MegaMenuProps } from "@shopblok/ui/organisms/mega-menu";
import {
  MobileNavDrawer,
  type MobileNavDrawerProps,
} from "@shopblok/ui/organisms/mobile-nav-drawer";
import { OverlayBox } from "../components/overlay-box";
import type { DsContext, DsState, DsStory } from "../types";

const fixtures = (ctx: DsContext) => commerceFixtures[ctx.locale];
const copy = (ctx: DsContext) => catalogs[ctx.locale].organisms;
const lang = (ctx: DsContext) => ctx.fixture.market.htmlLang;

/** The index in the navigation of the first item of this kind, or an error the story names. */
function indexOfKind(ctx: DsContext, kind: "megaMenu" | "dropdown", skip = 0): number {
  const found = fixtures(ctx)
    .navigation.map((item, index) => ({ item, index }))
    .filter(({ item }) => item.kind === kind)[skip];
  if (found === undefined)
    throw new Error(`The fixtures' navigation has no ${kind} number ${skip}`);
  return found.index;
}

// --- MegaMenu ---

function bar(ctx: DsContext, props: Partial<MegaMenuProps> = {}) {
  return (
    <MegaMenu
      items={fixtures(ctx).navigation}
      copy={copy(ctx).megaMenu}
      label={copy(ctx).header.navigation}
      locale={lang(ctx)}
      prefetch={false}
      {...props}
    />
  );
}

/**
 * An open panel's height in its box: room for the panel under a bar that wraps to three rows at
 * 375 px, inside the shortest box below.
 */
const PANEL_CAP = "max-h-[30rem]";

/** The bar with one panel drawn open, in a box tall enough for it and the capped panel. */
function barOpen(ctx: DsContext, name: string, height: number, props: Partial<MegaMenuProps>) {
  return (
    <OverlayBox name={name} height={height}>
      <div className="p-4">{bar(ctx, { panelClassName: PANEL_CAP, ...props })}</div>
    </OverlayBox>
  );
}

const megaMenuStates: readonly DsState[] = [
  {
    id: "mega-menu",
    label: "Mega menu, open",
    description:
      "A panel as wide as the bar: “Shop all Women”, the columns as groups (each with its own “Shop all” where it goes somewhere) and two featured tiles.",
    render: (ctx) =>
      barOpen(ctx, "Mega menu", 760, { defaultOpenItem: indexOfKind(ctx, "megaMenu") }),
  },
  {
    id: "mega-menu-one-tile",
    label: "Mega menu, one tile",
    description:
      "A second mega menu, with two columns and a single featured tile: the columns take the room the second tile would have had.",
    render: (ctx) =>
      barOpen(ctx, "Mega menu, one tile", 760, {
        defaultOpenItem: indexOfKind(ctx, "megaMenu", 1),
      }),
  },
  {
    id: "dropdown",
    label: "Dropdown, open",
    description: "A narrow panel of links under its own trigger, with no “Shop all” and no groups.",
    render: (ctx) =>
      barOpen(ctx, "Dropdown", 420, { defaultOpenItem: indexOfKind(ctx, "dropdown") }),
  },
  {
    id: "split",
    label: "Split around a logo",
    description:
      "The centered header's form: two lists of items in the one navigation, with the store's name between them (`splitAt` and `center`).",
    render: (ctx) => (
      <div className="p-4">
        {bar(ctx, {
          splitAt: 2,
          center: (
            <span className="px-4 text-lg font-semibold">{ctx.fixture.ordinary.storeName}</span>
          ),
        })}
      </div>
    ),
  },
  {
    id: "long",
    label: "Long labels, open",
    description:
      "A mega menu whose item, column titles, links and featured tile have the longest labels of the locale: they wrap inside their cells and nothing is cut.",
    render: (ctx) =>
      barOpen(ctx, "Mega menu, long labels", 900, {
        items: [fixtures(ctx).long.navItem],
        defaultOpenItem: 0,
      }),
  },
];

// --- MobileNavDrawer ---

/** What a state of the sheet changes in it, to stand still in a box (see above). */
const stillSheet = "duration-0";

function drawer(ctx: DsContext, props: Partial<MobileNavDrawerProps> = {}) {
  return (
    <MobileNavDrawer
      {...fixtures(ctx).header.mobileNav}
      copy={copy(ctx).mobileNavDrawer}
      marketSwitcherCopy={catalogs[ctx.locale].molecules.marketSwitcher}
      locale={lang(ctx)}
      prefetch={false}
      {...props}
    />
  );
}

/** The sheet drawn open in a box, its menu button beside it. */
function drawerOpen(ctx: DsContext, name: string, props: Partial<MobileNavDrawerProps>) {
  return (
    <OverlayBox name={name} height={760}>
      <div className="p-4">
        {drawer(ctx, { defaultOpen: true, modal: false, popupClassName: stillSheet, ...props })}
      </div>
    </OverlayBox>
  );
}

const mobileNavDrawerStates: readonly DsState[] = [
  {
    id: "first-level",
    label: "Open, first level",
    description:
      "The items (a link, and a button with a chevron for each dropdown and mega menu), then the account links and the market switcher.",
    render: (ctx) => drawerOpen(ctx, "Mobile navigation", {}),
  },
  {
    id: "mega-menu-level",
    label: "Open, a mega menu's level",
    description:
      "After pressing Women: a back button named for the level it returns to, the item as a heading, “Shop all Women”, the columns as groups, then the featured tiles as links.",
    render: (ctx) =>
      drawerOpen(ctx, "Mobile navigation, a mega menu", {
        defaultLevel: indexOfKind(ctx, "megaMenu"),
      }),
  },
  {
    id: "dropdown-level",
    label: "Open, a dropdown's level",
    description: "A dropdown's level is its links alone: no “Shop all” and no groups.",
    render: (ctx) =>
      drawerOpen(ctx, "Mobile navigation, a dropdown", {
        defaultLevel: indexOfKind(ctx, "dropdown"),
      }),
  },
  {
    id: "long-first-level",
    label: "Long labels, first level",
    description: "The long item's button wraps beside its chevron, and its row grows with it.",
    render: (ctx) =>
      drawerOpen(ctx, "Mobile navigation, long labels", {
        items: [fixtures(ctx).long.navItem, ...fixtures(ctx).navigation.slice(0, 2)],
      }),
  },
  {
    id: "long",
    label: "Long labels, a level",
    description:
      "The long mega menu's level: the back button, the heading, the column titles and the links wrap, and the sheet scrolls inside itself when they are taller than it.",
    render: (ctx) =>
      drawerOpen(ctx, "Mobile navigation, long labels, a level", {
        items: [fixtures(ctx).long.navItem],
        defaultLevel: 0,
      }),
  },
];

export const navigationOrganismStories = {
  "organisms/mega-menu": {
    summary:
      "The header's navigation for wide screens: links, dropdowns and mega menus in one landmark, each panel opening under its trigger and, for a mega menu, as wide as the bar.",
    a11y: [
      "One navigation landmark, named by the catalog's “Main”. The panels are not landmarks of their own, so a screen-reader user finds one “Main”, not one per open menu.",
      "A link is a link. A dropdown and a mega menu are buttons with aria-expanded, in the same row as the links, and they open on hover, Enter, Space and ArrowDown. The panel stays open while the pointer is over the trigger or the panel; a short delay forgives the gap between them.",
      "Escape closes the panel with focus on its trigger. Tab goes from the trigger into the panel, through “Shop all”, each column's links and the featured tiles, and Tab past the last link closes the panel and goes on to the next control. The arrow keys move between the top-level items.",
      "A mega menu's panel names its parts: “Shop all Women” first when the item has a page of its own, each column a group named by its title, and the featured tiles a group named “Featured”. A tile is one link named by its title; the picture keeps its alternative text, and the whole tile is the link's target.",
      "Every control is at least 44 px tall and the ring is at full strength. Long German and Greek labels wrap (wrap-anywhere) in the bar and in the panel and are never cut. The panel scrolls inside the room that is left when it is taller than the screen. Nothing slides or fades under prefers-reduced-motion.",
      "The panel is as wide as the bar, so at 375 px it spans the bar's row and its columns and tiles stack, with no sideways scroll. The words (“Shop all …”) are made on the server from the catalog; the client part holds no formatter.",
    ],
    live: (ctx) => bar(ctx),
    states: megaMenuStates,
    // A navigation spans its row: each state gets the frame's whole width, not a 14rem card.
    statesLayout: "stack",
  },
  "organisms/mobile-nav-drawer": {
    summary:
      "The header's navigation for narrow screens: a menu button that opens a sheet from the start side, with the items, a level for each dropdown or mega menu, the account links and the market switcher.",
    a11y: [
      "The menu button is 44 px and named “Menu”. It opens a modal dialog named by its title; the page behind is inert, and focus starts on the close button, the first control in the sheet.",
      "Tab and Shift+Tab go round the sheet's controls and never leave it. Escape closes it and focus goes back to the menu button, as it does after the close button or a link is pressed (a link also closes the sheet, because the header stays across page changes).",
      "A dropdown or a mega menu is a button with a chevron (mirrored in right-to-left) that replaces the list with its level. A level starts with a back button named for where it goes (“Back to Menu”) and the item as a heading, which takes focus so a reader hears where they are. Going back puts focus on the button that opened the level, and the sheet reopens at the first level.",
      "A level lists “Shop all Women” when the item has a page, each column as a group named by its title, and the featured tiles as links after them. The account links are a navigation named “Your account”, and the market switcher is the one in its sheet form: its own sheet opens over the drawer and Escape closes that one first.",
      "Every row, button and link is at least 44 px tall and the ring is at full strength. Long labels wrap (wrap-anywhere) and the sheet scrolls inside itself when its content is taller than a short phone. Nothing slides under prefers-reduced-motion.",
      "The flags and the words are made on the server; the client part takes plain data and one node, and holds no flag, formatter or catalog.",
    ],
    live: (ctx) => drawer(ctx),
    states: mobileNavDrawerStates,
    // The sheet is three quarters of its box (up to 24rem): in a 14rem card it would be 10rem wide.
    statesLayout: "stack",
  },
} satisfies Partial<Record<EntryId, DsStory>>;
