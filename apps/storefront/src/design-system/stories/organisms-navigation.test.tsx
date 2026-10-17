// Ours (T35, SETUP.md "Navigation and headers (T35)"). The tests of the navigation organisms'
// stories (D40): the states the plan lists are there, each is drawn as its description says in every
// locale, the open ones are drawn the way the design system's box needs (`defaultOpenItem` for the
// bar; `defaultOpen`, `modal={false}`, `defaultLevel` and a sheet that stands still for the drawer),
// every link is drawn with `prefetch={false}`, and the props a story hands the components serialize,
// because a story renders on the server. A story renders to static markup here (the storefront's
// tests have no DOM), so a panel or a sheet drawn open, in a portal, is checked by the props that
// open it and by its box; the popup itself is the component tests' and the design-system job's.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { MegaMenu, type MegaMenuProps } from "@shopblok/ui/organisms/mega-menu";
import {
  MobileNavDrawer,
  type MobileNavDrawerProps,
} from "@shopblok/ui/organisms/mobile-nav-drawer";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { navigationOrganismStories } from "./organisms-navigation";

type Id = keyof typeof navigationOrganismStories;

const megaMenu = "organisms/mega-menu";
const mobileNavDrawer = "organisms/mobile-nav-drawer";

const story = (id: Id) => navigationOrganismStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
const live = (id: Id, locale: Locale) =>
  renderToStaticMarkup(story(id).live(createContext(locale)));
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)].length;
/** Text as `renderToStaticMarkup` writes it, with spaces folded. */
const escaped = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
const plain = (text: string) => text.replace(/\s/g, " ");
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;

/** The element of `type` a story returns, found in the tree of elements it builds. */
function find<Props>(node: ReactNode, type: unknown): ReactElement<Props> {
  if (Array.isArray(node)) {
    for (const child of node as ReactNode[]) {
      try {
        return find<Props>(child, type);
      } catch {
        // Not in this child: try the next.
      }
    }
    throw new Error("not found");
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) throw new Error("not found");
  if (node.type === type) return node as ReactElement<Props>;
  return find<Props>(node.props.children, type);
}

const barOf = (stateId: string, locale: Locale = "en") =>
  find<MegaMenuProps>(state(megaMenu, stateId).render(createContext(locale)), MegaMenu);
const drawerOf = (stateId: string, locale: Locale = "en") =>
  find<MobileNavDrawerProps>(
    state(mobileNavDrawer, stateId).render(createContext(locale)),
    MobileNavDrawer,
  );
const liveBar = (locale: Locale = "en") =>
  find<MegaMenuProps>(story(megaMenu).live(createContext(locale)), MegaMenu);
const liveDrawer = (locale: Locale = "en") =>
  find<MobileNavDrawerProps>(story(mobileNavDrawer).live(createContext(locale)), MobileNavDrawer);

/** The index in the fixtures' navigation of each item kind: Women and Men, then Accessories. */
const kinds = (locale: Locale) => commerceFixtures[locale].navigation.map((item) => item.kind);
// Written as a code point, so this file holds no em dash itself.
const EM_DASH = String.fromCodePoint(0x2014);
const WOMEN = 1;
const MEN = 2;
const ACCESSORIES = 3;

describe("the navigation organisms' stories", () => {
  it("are one for each of the two entries, each with a summary and a11y notes", () => {
    expect(Object.keys(navigationOrganismStories).sort()).toEqual([megaMenu, mobileNavDrawer]);
    for (const [id, each] of Object.entries(navigationOrganismStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.summary.trim().split(/(?<=[.!?])\s/).length, `${id} is one sentence`).toBe(1);
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("write nothing with an em dash", () => {
    for (const [id, each] of Object.entries(navigationOrganismStories)) {
      const words = [
        each.summary,
        ...each.a11y,
        ...(each.states ?? []).flatMap((part) => [part.label, part.description ?? ""]),
      ];
      for (const text of words) expect(text, id).not.toContain(EM_DASH);
    }
  });

  it("have the states the plan lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(megaMenu)).toEqual(["mega-menu", "mega-menu-one-tile", "dropdown", "split", "long"]);
    expect(ids(mobileNavDrawer)).toEqual([
      "first-level",
      "mega-menu-level",
      "dropdown-level",
      "long-first-level",
      "long",
    ]);
  });

  it("give each state a distinct id and a label", () => {
    for (const [id, each] of Object.entries(navigationOrganismStories)) {
      const ids = (each.states ?? []).map((part) => part.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      const labels = (each.states ?? []).map((part) => part.label);
      expect(new Set(labels).size, id).toBe(labels.length);
      for (const part of each.states ?? [])
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(navigationOrganismStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(100);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
      }
    }
  });

  it("give each state the frame's whole width: a navigation spans its row", () => {
    for (const [id, each] of Object.entries(navigationOrganismStories)) {
      expect(each.statesLayout, id).toBe("stack");
    }
  });

  it("assume the navigation the fixtures have: two mega menus, then a dropdown", () => {
    for (const locale of LOCALES) {
      const found = kinds(locale);
      expect(found[WOMEN], locale).toBe("megaMenu");
      expect(found[MEN], locale).toBe("megaMenu");
      expect(found[ACCESSORIES], locale).toBe("dropdown");
    }
  });
});

describe("MegaMenu's stories", () => {
  it.each(LOCALES)(
    "draws the bar in the live render: one landmark, three triggers, in %s",
    (locale) => {
      const markup = live(megaMenu, locale);
      const label = catalogs[locale].organisms.header.navigation;
      expect(count(markup, /data-slot="mega-menu"/g)).toBe(1);
      expect(plain(markup)).toContain(`aria-label="${escaped(plain(label))}"`);
      // The interaction check presses the first visible one of these.
      expect(count(markup, /data-slot="navigation-menu-trigger"/g)).toBe(3);
      expect(count(markup, /aria-expanded="true"/g)).toBe(0);
      expect(markup).not.toContain('data-slot="mega-menu-panel"');
      for (const item of commerceFixtures[locale].navigation) {
        expect(plain(markup)).toContain(escaped(plain(item.label)));
      }
    },
  );

  it.each(LOCALES)(
    "draws the live render with the locale's navigation and words, in %s",
    (locale) => {
      const { props } = liveBar(locale);
      expect(props.items).toEqual(commerceFixtures[locale].navigation);
      expect(props.copy).toEqual(catalogs[locale].organisms.megaMenu);
      expect(props.label).toBe(catalogs[locale].organisms.header.navigation);
      expect(props.locale).toBe(htmlLang(locale));
      expect(props.defaultOpenItem).toBeUndefined();
    },
  );

  it("draws every link with prefetch off, in the live render and in every state", () => {
    expect(liveBar().props.prefetch).toBe(false);
    for (const part of story(megaMenu).states ?? []) {
      expect(barOf(part.id).props.prefetch, part.id).toBe(false);
    }
  });

  it.each(LOCALES)("opens the item each open state names, in a box, in %s", (locale) => {
    for (const [stateId, index] of [
      ["mega-menu", WOMEN],
      ["mega-menu-one-tile", MEN],
      ["dropdown", ACCESSORIES],
    ] as const) {
      const markup = html(megaMenu, stateId, locale);
      expect(count(markup, /data-overlay-box/g), stateId).toBe(1);
      expect(barOf(stateId, locale).props.defaultOpenItem, stateId).toBe(index);
      expect(barOf(stateId, locale).props.items, stateId).toEqual(
        commerceFixtures[locale].navigation,
      );
      // The server draws the bar; the panel opens in the box's portal once the client has hydrated.
      expect(count(markup, /data-slot="navigation-menu-trigger"/g), stateId).toBe(3);
    }
  });

  it("opens a mega menu with two featured tiles, one with a single tile, and a dropdown", () => {
    for (const locale of LOCALES) {
      const items = commerceFixtures[locale].navigation;
      const women = items[WOMEN];
      const men = items[MEN];
      if (women?.kind !== "megaMenu" || men?.kind !== "megaMenu") throw new Error("two mega menus");
      expect(women.featured, locale).toHaveLength(2);
      expect(men.featured, locale).toHaveLength(1);
      expect(items[ACCESSORIES]?.kind, locale).toBe("dropdown");
    }
  });

  it("gives the boxes room: a mega menu's is taller than a dropdown's, and each is named differently", () => {
    const ctx = createContext("en");
    const heights = ["mega-menu", "mega-menu-one-tile", "dropdown", "long"].map((stateId) => {
      const markup = renderToStaticMarkup(state(megaMenu, stateId).render(ctx));
      return Number(/block-size:(\d+)px/.exec(markup)?.[1]);
    });
    expect(heights.every((height) => height > 0)).toBe(true);
    expect(heights[0]).toBeGreaterThanOrEqual(700);
    expect(heights[2]).toBeLessThan(heights[0] ?? 0);
    expect(heights[3]).toBeGreaterThanOrEqual(heights[0] ?? 0);
    const names = ["mega-menu", "mega-menu-one-tile", "dropdown", "long"].map(
      (stateId) =>
        /aria-label="([^"]*, drawn open)"/.exec(
          renderToStaticMarkup(state(megaMenu, stateId).render(ctx)),
        )?.[1],
    );
    expect(names.every((name) => name !== undefined)).toBe(true);
    expect(new Set(names).size).toBe(4);
  });

  it("splits the bar in two around the store's name, with no box and nothing open", () => {
    for (const locale of LOCALES) {
      const markup = html(megaMenu, "split", locale);
      const { props } = barOf("split", locale);
      expect(props.splitAt).toBe(2);
      expect(markup).not.toContain("data-overlay-box");
      expect(count(markup, /data-slot="mega-menu-center"/g)).toBe(1);
      expect(count(markup, /data-slot="navigation-menu-list"/g)).toBe(2);
      expect(plain(markup)).toContain(
        escaped(plain(createContext(locale).fixture.ordinary.storeName)),
      );
    }
  });

  it("draws the long state with the long item alone, open, in a box", () => {
    for (const locale of LOCALES) {
      const { props } = barOf("long", locale);
      const item = commerceFixtures[locale].long.navItem;
      expect(props.items, locale).toEqual([item]);
      expect(props.defaultOpenItem, locale).toBe(0);
      expect(item.label.length, locale).toBeGreaterThan(30);
      const markup = html(megaMenu, "long", locale);
      expect(count(markup, /data-overlay-box/g), locale).toBe(1);
      expect(plain(markup), locale).toContain(escaped(plain(item.label)));
      expect(markup, locale).toContain("wrap-anywhere");
      expect(markup, locale).not.toMatch(/whitespace-nowrap|truncate|line-clamp/);
    }
  });

  it("gives the bar's props that serialize, apart from the split state's logo node", () => {
    for (const part of story(megaMenu).states ?? []) {
      const { center, ...props } = barOf(part.id).props;
      expect(center === undefined, part.id).toBe(part.id !== "split");
      expect(
        Object.values(props).filter((value) => typeof value === "function"),
        part.id,
      ).toEqual([]);
      expect(JSON.parse(JSON.stringify(props)), part.id).toEqual(props);
    }
  });
});

describe("MobileNavDrawer's stories", () => {
  it.each(LOCALES)("draws the menu button alone in the live render, in %s", (locale) => {
    const markup = live(mobileNavDrawer, locale);
    // The interaction check presses this button.
    expect(count(markup, /data-slot="mobile-nav-trigger"/g)).toBe(1);
    expect(plain(markup)).toContain(
      `>${escaped(plain(catalogs[locale].organisms.mobileNavDrawer.open))}</span>`,
    );
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("size-11");
    // The sheet is not in the markup before it is opened.
    expect(markup).not.toContain('data-slot="mobile-nav-drawer"');
    expect(markup).not.toContain("data-overlay-box");
  });

  it.each(LOCALES)(
    "draws the live render with the locale's items, account links and markets, in %s",
    (locale) => {
      const { props } = liveDrawer(locale);
      const content = commerceFixtures[locale].header.mobileNav;
      expect(props.items).toEqual(content.items);
      expect(props.account).toEqual(content.account);
      expect(props.market).toEqual(content.market);
      expect(props.market?.markets.length).toBeGreaterThan(1);
      expect(props.copy).toEqual(catalogs[locale].organisms.mobileNavDrawer);
      expect(props.marketSwitcherCopy).toEqual(catalogs[locale].molecules.marketSwitcher);
      expect(props.locale).toBe(htmlLang(locale));
      expect(props.defaultOpen).toBeUndefined();
      expect(props.modal).toBeUndefined();
    },
  );

  it("draws every link with prefetch off, in the live render and in every state", () => {
    expect(liveDrawer().props.prefetch).toBe(false);
    for (const part of story(mobileNavDrawer).states ?? []) {
      expect(drawerOf(part.id).props.prefetch, part.id).toBe(false);
    }
  });

  it.each(LOCALES)(
    "draws the open states in a box, open, with the page left usable, in %s",
    (locale) => {
      for (const part of story(mobileNavDrawer).states ?? []) {
        const markup = html(mobileNavDrawer, part.id, locale);
        expect(count(markup, /data-overlay-box/g), part.id).toBe(1);
        expect(count(markup, /data-slot="mobile-nav-trigger"/g), part.id).toBe(1);
        // The server draws the button; the sheet opens in the box's portal once the client has
        // hydrated (`defaultOpen`), without making the frame inert (`modal={false}`).
        const { props } = drawerOf(part.id, locale);
        expect(props.defaultOpen, part.id).toBe(true);
        expect(props.modal, part.id).toBe(false);
      }
    },
  );

  it("stands every sheet still in its box: no slide-in, and the live render keeps its own", () => {
    for (const part of story(mobileNavDrawer).states ?? []) {
      expect(drawerOf(part.id).props.popupClassName, part.id).toContain("duration-0");
    }
    expect(liveDrawer().props.popupClassName).toBeUndefined();
  });

  it("opens the level each state names: none, a mega menu, a dropdown, none, the long one", () => {
    for (const locale of LOCALES) {
      const levelOf = (stateId: string) => drawerOf(stateId, locale).props.defaultLevel;
      expect(levelOf("first-level"), locale).toBeUndefined();
      expect(levelOf("mega-menu-level"), locale).toBe(WOMEN);
      expect(levelOf("dropdown-level"), locale).toBe(ACCESSORIES);
      expect(levelOf("long-first-level"), locale).toBeUndefined();
      expect(levelOf("long"), locale).toBe(0);
      const items = commerceFixtures[locale].navigation;
      expect(items[WOMEN]?.kind).toBe("megaMenu");
      expect(items[ACCESSORIES]?.kind).toBe("dropdown");
    }
  });

  it("draws the long mega menu in the long states, first of its items on the first level", () => {
    for (const locale of LOCALES) {
      const item = commerceFixtures[locale].long.navItem;
      const items = commerceFixtures[locale].navigation;
      expect(drawerOf("long-first-level", locale).props.items, locale).toEqual([
        item,
        ...items.slice(0, 2),
      ]);
      expect(drawerOf("long", locale).props.items, locale).toEqual([item]);
      expect(item.label.length, locale).toBeGreaterThan(30);
    }
  });

  it("names each box differently, so the groups of one frame can be told apart", () => {
    const ctx = createContext("en");
    const names = (story(mobileNavDrawer).states ?? []).map(
      (part) =>
        /aria-label="([^"]*, drawn open)"/.exec(renderToStaticMarkup(part.render(ctx)))?.[1],
    );
    expect(names.every((name) => name !== undefined)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives the sheet's props that serialize", () => {
    for (const part of story(mobileNavDrawer).states ?? []) {
      const { props } = drawerOf(part.id);
      expect(
        Object.values(props).filter((value) => typeof value === "function"),
        part.id,
      ).toEqual([]);
      expect(JSON.parse(JSON.stringify(props)), part.id).toEqual(props);
    }
    const live = liveDrawer().props;
    expect(JSON.parse(JSON.stringify(live))).toEqual(live);
  });
});
