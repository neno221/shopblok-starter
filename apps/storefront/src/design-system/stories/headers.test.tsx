// Ours (T35, SETUP.md "Navigation and headers (T35)"). The tests of the six headers' stories (D40,
// D46): the states the plan lists are there, each is drawn as its description says in every
// locale, the live render hands the header the storefront's cart island and the fixtures' visitor
// (and no number of its own), every link is drawn with `prefetch={false}`, no two states on a page
// share a landmark name, the open states are drawn the way the design system's box needs, and the
// transparent header is drawn over its hero. A story renders to static markup here (the storefront's
// tests have no DOM), so a panel or a sheet drawn open, in a portal, is checked by the props that
// open it and by its box; the popup itself is the components' tests' and the design-system job's.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { CartButton } from "@shopblok/ui/organisms/header/cart-button";
import { HeaderCentered } from "@shopblok/ui/organisms/header/centered";
import { HeaderClassic } from "@shopblok/ui/organisms/header/classic";
import { HeaderMegaMenu } from "@shopblok/ui/organisms/header/mega-menu";
import { HeaderMinimal } from "@shopblok/ui/organisms/header/minimal";
import type { HeaderProps } from "@shopblok/ui/organisms/header/parts";
import { HeaderTransparent } from "@shopblok/ui/organisms/header/transparent";
import { HeaderTwoTier } from "@shopblok/ui/organisms/header/two-tier";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VisitorCartButton } from "../../lib/visitor/cart-button";
import { VisitorFixture } from "../components/visitor-fixture";
import { createContext } from "../context";
import { headerStories } from "./headers";

type Id = keyof typeof headerStories;
type DrawnHeaderProps = HeaderProps & { solid?: boolean };

const components = {
  "headers-footers/header-classic": HeaderClassic,
  "headers-footers/header-centered": HeaderCentered,
  "headers-footers/header-two-tier": HeaderTwoTier,
  "headers-footers/header-mega-menu": HeaderMegaMenu,
  "headers-footers/header-minimal": HeaderMinimal,
  "headers-footers/header-transparent": HeaderTransparent,
} as const;
const ids = Object.keys(components) as Id[];

const common = ["no-announcement", "empty-cart", "full-cart", "long", "mobile-drawer", "mega-menu"];
const expectedStates: Record<Id, string[]> = {
  "headers-footers/header-classic": common,
  "headers-footers/header-centered": common,
  "headers-footers/header-two-tier": [...common, "switcher-popover", "switcher-sheet"],
  "headers-footers/header-mega-menu": common,
  "headers-footers/header-minimal": [
    "no-announcement",
    "empty-cart",
    "full-cart",
    "long",
    "mobile-drawer",
    "drawer-level",
  ],
  "headers-footers/header-transparent": ["over-hero", "solid", ...common],
};

const story = (id: Id) => headerStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const stateIds = (id: Id) => (story(id).states ?? []).map((each) => each.id);
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
const live = (id: Id, locale: Locale) =>
  renderToStaticMarkup(story(id).live(createContext(locale)));
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)].length;
/** Text as `renderToStaticMarkup` writes it. */
const escaped = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
const plain = (text: string) => text.replace(/\s/g, " ");
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const fixtures = (locale: Locale) => commerceFixtures[locale];
// Written as a code point, so this file holds no em dash itself.
const EM_DASH = String.fromCodePoint(0x2014);

/** The first element of `type` in the tree of elements a story builds. */
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

const headerOf = (id: Id, stateId: string, locale: Locale = "en") =>
  find<DrawnHeaderProps>(state(id, stateId).render(createContext(locale)), components[id]).props;
const liveHeader = (id: Id, locale: Locale = "en") =>
  find<DrawnHeaderProps>(story(id).live(createContext(locale)), components[id]).props;
const megaMenuIndex = (locale: Locale) =>
  fixtures(locale).navigation.findIndex((item) => item.kind === "megaMenu");

describe("the six headers' stories", () => {
  it("are the six entries, each with a summary of one sentence and a11y notes in full sentences", () => {
    expect(Object.keys(headerStories).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(story(id).summary.trim(), id).not.toBe("");
      expect(
        story(id)
          .summary.trim()
          .split(/(?<=[.!?])\s/).length,
        `${id} is one sentence`,
      ).toBe(1);
      expect(story(id).summary.endsWith("."), id).toBe(true);
      // The landmarks, the skip link, the keyboard, the cart's name and its count.
      expect(story(id).a11y.length, id).toBeGreaterThanOrEqual(5);
      for (const note of story(id).a11y) {
        expect(note.trim().endsWith("."), `${id}: ${note}`).toBe(true);
        expect(note.trim().length, `${id}: ${note}`).toBeGreaterThan(40);
      }
    }
  });

  it("say how the cart's count arrives, and what a keyboard reader does", () => {
    for (const id of ids) {
      const notes = story(id).a11y.join(" ");
      expect(notes, id).toContain("Skip to content");
      expect(notes, id).toContain("Cart");
      expect(notes, id).toContain("live region");
      expect(notes, id).toMatch(/banner/);
    }
  });

  it("write nothing with an em dash", () => {
    for (const id of ids) {
      const words = [
        story(id).summary,
        ...story(id).a11y,
        ...(story(id).states ?? []).flatMap((part) => [part.label, part.description ?? ""]),
      ];
      for (const text of words) expect(text, id).not.toContain(EM_DASH);
    }
  });

  it("have the states the plan lists, in order", () => {
    for (const id of ids) expect(stateIds(id), id).toEqual(expectedStates[id]);
  });

  it("give each state a distinct id, a distinct label and a description", () => {
    for (const id of ids) {
      const states = story(id).states ?? [];
      expect(new Set(states.map((part) => part.id)).size, id).toBe(states.length);
      expect(new Set(states.map((part) => part.label)).size, id).toBe(states.length);
      for (const part of states) {
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
        expect((part.description ?? "").trim().length, `${id} ${part.id}`).toBeGreaterThan(20);
      }
    }
  });

  it("give each state the frame's whole width: a header follows the window's breakpoints", () => {
    for (const id of ids) expect(story(id).statesLayout, id).toBe("stack");
  });

  it.each(LOCALES)("render the live render and every state in %s", (locale) => {
    const ctx = createContext(locale);
    for (const id of ids) {
      expect(renderToStaticMarkup(story(id).live(ctx)).length, id).toBeGreaterThan(1000);
      for (const part of story(id).states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(1000);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
        // The page's words, in the locale's catalog.
        expect(plain(markup), `${id} ${part.id}`).toContain(
          escaped(plain(catalogs[locale].organisms.header.skipToContent)),
        );
      }
    }
  });
});

describe("the live renders (D44)", () => {
  it.each(ids)(
    "hand %s the fixtures' header, the island and nothing else in the cart slot",
    (id) => {
      for (const locale of LOCALES) {
        const props = liveHeader(id, locale);
        const content = fixtures(locale).header.content;
        expect(props.storeName, locale).toBe(content.storeName);
        expect(props.navigation, locale).toEqual(content.navigation);
        expect(props.utilities, locale).toEqual(content.utilities);
        expect(props.market, locale).toEqual(content.market);
        expect(props.announcement, locale).toEqual(content.announcement);
        expect(props.sticky, locale).toBe(content.sticky);
        expect(props.copy.header, locale).toEqual(catalogs[locale].organisms.header);
        expect(props.copy.announcementBar, locale).toEqual(
          catalogs[locale].organisms.announcementBar,
        );
        expect(props.marketSwitcherCopy, locale).toEqual(catalogs[locale].molecules.marketSwitcher);
        expect(props.locale, locale).toBe(htmlLang(locale));
        expect(props.prefetch, locale).toBe(false);
        expect(props.drawn, locale).toBeUndefined();
        expect(props.solid, locale).toBeUndefined();
        const island = props.cart as ReactElement<Record<string, unknown>>;
        expect(island.type, locale).toBe(VisitorCartButton);
        expect(island.props.href, locale).toBe(content.cartHref);
        expect(island.props.copy, locale).toEqual(catalogs[locale].organisms.header);
        expect(island.props.locale, locale).toBe(htmlLang(locale));
        expect(island.props.prefetch, locale).toBe(false);
        // The island has the count from the store, and none from the story.
        expect(island.props, locale).not.toHaveProperty("count");
      }
    },
  );

  it.each(ids)("draw %s with the visitor fixture beside it and the fixtures' count in it", (id) => {
    for (const locale of LOCALES) {
      const fixture = find<{ cartCount: number }>(
        story(id).live(createContext(locale)),
        VisitorFixture,
      );
      expect(fixture.props.cartCount, locale).toBe(fixtures(locale).header.cartCount);
      expect(fixture.props.cartCount, locale).toBeGreaterThan(0);
    }
  });

  it.each(ids)("draw %s once, with one cart that has no number in the server's markup", (id) => {
    for (const locale of LOCALES) {
      const markup = live(id, locale);
      expect(count(markup, /<header[ >]/g), locale).toBe(1);
      expect(count(markup, /data-slot="cart-button"/g), locale).toBe(1);
      expect(count(markup, /data-slot="cart-count"/g), locale).toBe(1);
      expect(markup, locale).not.toContain('data-slot="cart-badge"');
      // The live region is there and empty, for the count to arrive in.
      expect(markup, locale).toMatch(/data-slot="cart-count"[^>]*><\/span>/);
      expect(markup, locale).toContain(`>${escaped(catalogs[locale].organisms.header.cart)}<`);
      expect(markup, locale).not.toContain("data-overlay-box");
      expect(markup, locale).not.toContain('aria-expanded="true"');
    }
  });

  it("draws the transparent header over the fixtures' hero picture, unpinned", () => {
    for (const locale of LOCALES) {
      const markup = live("headers-footers/header-transparent", locale);
      expect(markup, locale).toContain('data-slot="image"');
      expect(markup, locale).toContain(escaped(fixtures(locale).header.hero.alt));
      expect(markup, locale).toContain('data-solid="false"');
    }
    for (const id of ids.filter((each) => each !== "headers-footers/header-transparent")) {
      expect(live(id, "en"), id).not.toContain('data-slot="image"');
    }
  });
});

describe("the states", () => {
  it("draw every link with prefetch off, and an announcement that does not move", () => {
    for (const id of ids) {
      for (const part of story(id).states ?? []) {
        const props = headerOf(id, part.id);
        expect(props.prefetch, `${id} ${part.id}`).toBe(false);
        if (props.announcement === undefined) continue;
        // One message: a picture does not rotate.
        expect(props.announcement.messages, `${id} ${part.id}`).toHaveLength(1);
      }
    }
  });

  it("draw the announcement bar in every state but the one without", () => {
    for (const id of ids) {
      for (const part of story(id).states ?? []) {
        const markup = html(id, part.id, "en");
        const bars = count(markup, /data-slot="announcement-bar"[^-]/g);
        expect(bars, `${id} ${part.id}`).toBe(part.id === "no-announcement" ? 0 : 1);
        expect(headerOf(id, part.id).announcement === undefined, `${id} ${part.id}`).toBe(
          part.id === "no-announcement",
        );
      }
    }
  });

  it("draw the cart as the placeholder, and the two carts with their counts", () => {
    for (const id of ids) {
      for (const part of story(id).states ?? []) {
        const { cart } = headerOf(id, part.id);
        if (part.id === "empty-cart" || part.id === "full-cart") {
          const button = cart as ReactElement<{ count: number; prefetch: boolean }>;
          expect(button.type, `${id} ${part.id}`).toBe(CartButton);
          expect(button.props.count, `${id} ${part.id}`).toBe(part.id === "empty-cart" ? 0 : 120);
          expect(button.props.prefetch, `${id} ${part.id}`).toBe(false);
        } else {
          expect(cart, `${id} ${part.id}`).toBeUndefined();
        }
      }
    }
  });

  it.each(LOCALES)(
    "draw the empty cart and the full one with the names they have, in %s",
    (locale) => {
      for (const id of ids) {
        expect(html(id, "empty-cart", locale), id).not.toContain('data-slot="cart-badge"');
        const full = html(id, "full-cart", locale);
        expect(full, id).toContain(">99+<");
        expect(count(full, /data-slot="cart-button"/g), id).toBe(1);
      }
    },
  );

  it("draw the long state with the longest store name, the long item and the long announcement", () => {
    for (const locale of LOCALES) {
      const ctx = createContext(locale);
      for (const id of ids) {
        const props = headerOf(id, "long", locale);
        expect(props.storeName, `${id} ${locale}`).toBe(ctx.fixture.long.storeName);
        expect(props.navigation[0], `${id} ${locale}`).toEqual(fixtures(locale).long.navItem);
        expect(props.navigation.length, `${id} ${locale}`).toBe(fixtures(locale).navigation.length);
        expect(props.announcement, `${id} ${locale}`).toEqual(
          fixtures(locale).header.announcements.long,
        );
        const markup = html(id, "long", locale);
        expect(plain(markup), `${id} ${locale}`).toContain(
          escaped(plain(ctx.fixture.long.storeName)),
        );
        expect(markup, `${id} ${locale}`).not.toMatch(/whitespace-nowrap|truncate|line-clamp/);
      }
    }
  });

  it("name each state's navigation and announcement region apart, and apart from the live render's", () => {
    for (const id of ids) {
      const names = [liveHeader(id)];
      const regions = [liveHeader(id).copy.announcementBar.region];
      const navs = [liveHeader(id).copy.header.navigation];
      for (const part of story(id).states ?? []) {
        const { copy } = headerOf(id, part.id);
        navs.push(copy.header.navigation);
        regions.push(copy.announcementBar.region);
        names.push(headerOf(id, part.id));
        expect(copy.header.navigation, `${id} ${part.id}`).toBe(
          `${catalogs.en.organisms.header.navigation} (${part.label})`,
        );
      }
      expect(new Set(navs).size, `${id} navigation names`).toBe(navs.length);
      expect(new Set(regions).size, `${id} region names`).toBe(regions.length);
      expect(names.length).toBe(navs.length);
    }
  });

  it("keep the rest of the words as the catalog has them", () => {
    for (const locale of LOCALES) {
      for (const id of ids) {
        for (const part of story(id).states ?? []) {
          const { copy } = headerOf(id, part.id, locale);
          const catalog = catalogs[locale].organisms;
          expect(copy.megaMenu, `${id} ${part.id}`).toEqual(catalog.megaMenu);
          expect(copy.mobileNavDrawer, `${id} ${part.id}`).toEqual(catalog.mobileNavDrawer);
          expect({ ...copy.header, navigation: "" }, `${id} ${part.id}`).toEqual({
            ...catalog.header,
            navigation: "",
          });
        }
      }
    }
  });

  it("give props that serialize, apart from the cart's element", () => {
    for (const id of ids) {
      for (const part of story(id).states ?? []) {
        const { cart, ...props } = headerOf(id, part.id);
        void cart;
        expect(
          Object.values(props).filter((value) => typeof value === "function"),
          `${id} ${part.id}`,
        ).toEqual([]);
        expect(JSON.parse(JSON.stringify(props)), `${id} ${part.id}`).toEqual(props);
      }
    }
  });
});

describe("the states that draw something open (D45)", () => {
  const open = (id: Id, stateId: string, locale: Locale = "en") => {
    const markup = html(id, stateId, locale);
    expect(count(markup, /data-overlay-box/g), `${id} ${stateId}`).toBe(1);
    return markup;
  };
  /** The box's height and its name in a story's markup. */
  const box = (id: Id, stateId: string) => {
    const markup = html(id, stateId, "en");
    return {
      height: Number(/block-size:(\d+)px/.exec(markup)?.[1]),
      name: /aria-label="([^"]*, drawn open)"/.exec(markup)?.[1],
    };
  };

  it.each(ids)("draws %s's mobile drawer open in a box that holds the sheet", (id) => {
    for (const locale of LOCALES) {
      const markup = open(id, "mobile-drawer", locale);
      expect(headerOf(id, "mobile-drawer", locale).drawn, `${id} ${locale}`).toEqual({
        drawer: {},
      });
      expect(markup).toContain('data-slot="mobile-nav-trigger"');
    }
    expect(box(id, "mobile-drawer").height).toBeGreaterThanOrEqual(700);
    expect(box(id, "mobile-drawer").name).toBe("Mobile drawer, drawn open");
  });

  it("draws the drawer for narrow windows only, except in the minimal header, where it is for all", () => {
    for (const id of ids) {
      const markup = html(id, "mobile-drawer", "en");
      if (id === "headers-footers/header-minimal") {
        expect(markup, id).not.toContain('lg:hidden"><div role="group"');
        expect(markup, id).not.toContain("The drawer is for windows narrower");
      } else {
        expect(markup, id).toContain('<div class="lg:hidden"><div role="group"');
        expect(markup, id).toContain("The drawer is for windows narrower than 1024 px");
      }
    }
  });

  it.each(ids.filter((id) => id !== "headers-footers/header-minimal"))(
    "draws %s's mega menu panel open, capped, in a box from lg up",
    (id) => {
      for (const locale of LOCALES) {
        const markup = open(id, "mega-menu", locale);
        const { drawn } = headerOf(id, "mega-menu", locale);
        expect(drawn, `${id} ${locale}`).toEqual({
          panel: megaMenuIndex(locale),
          panelClassName: "max-h-[30rem]",
        });
        expect(fixtures(locale).navigation[drawn?.panel ?? -1]?.kind).toBe("megaMenu");
        expect(markup).toContain('<div class="hidden lg:block"><div role="group"');
        expect(markup).toContain("The navigation and its panels are for windows of 1024 px");
      }
      // Under a bar of three rows at most, and the panel's own cap: the box is taller than both.
      expect(box(id, "mega-menu").height).toBeGreaterThanOrEqual(700);
      expect(box(id, "mega-menu").name).toBe("Mega menu panel, drawn open");
    },
  );

  it("has no mega menu panel state in the minimal header, which has no navigation in it", () => {
    expect(stateIds("headers-footers/header-minimal")).not.toContain("mega-menu");
  });

  it("draws the two-tier header's switcher open in both forms, at every width", () => {
    const id = "headers-footers/header-two-tier";
    for (const locale of LOCALES) {
      expect(headerOf(id, "switcher-popover", locale).drawn).toEqual({ switcher: "popover" });
      expect(headerOf(id, "switcher-sheet", locale).drawn).toEqual({ switcher: "drawer" });
      for (const stateId of ["switcher-popover", "switcher-sheet"]) {
        const markup = open(id, stateId, locale);
        // No wrapper hides the box at either width: the switcher is in the bar at every width.
        expect(markup).not.toContain('<div class="lg:hidden"><div role="group"');
        expect(markup).not.toContain('<div class="hidden lg:block"><div role="group"');
        expect(markup).toContain('data-slot="header-bar"');
      }
    }
    // The popover's list is tall: its box is taller than the sheet's.
    expect(box(id, "switcher-popover").height).toBeGreaterThan(box(id, "switcher-sheet").height);
  });

  it("draws the minimal header's drawer at the level of a mega menu, at every width", () => {
    const id = "headers-footers/header-minimal";
    for (const locale of LOCALES) {
      expect(headerOf(id, "drawer-level", locale).drawn).toEqual({
        drawer: { level: megaMenuIndex(locale) },
      });
      const markup = open(id, "drawer-level", locale);
      expect(markup).not.toContain('lg:hidden"><div role="group"');
    }
  });

  it("draws every other state with nothing open and in no box", () => {
    const opens = [
      "mobile-drawer",
      "mega-menu",
      "switcher-popover",
      "switcher-sheet",
      "drawer-level",
    ];
    for (const id of ids) {
      for (const part of story(id).states ?? []) {
        if (opens.includes(part.id)) continue;
        expect(headerOf(id, part.id).drawn, `${id} ${part.id}`).toBeUndefined();
        expect(html(id, part.id, "en"), `${id} ${part.id}`).not.toContain("data-overlay-box");
      }
    }
  });
});

describe("the transparent header's stories", () => {
  const id = "headers-footers/header-transparent";

  it("draws every state over the hero picture", () => {
    for (const locale of LOCALES) {
      for (const part of story(id).states ?? []) {
        const markup = html(id, part.id, locale);
        expect(markup, `${part.id} ${locale}`).toContain('data-slot="image"');
        expect(markup, `${part.id} ${locale}`).toContain(escaped(fixtures(locale).header.hero.alt));
      }
    }
  });

  it("pins the look: transparent over the hero, and solid where something is open or asked for", () => {
    for (const part of story(id).states ?? []) {
      const { solid } = headerOf(id, part.id);
      const expected = ["solid", "mobile-drawer", "mega-menu"].includes(part.id);
      expect(solid, part.id).toBe(expected);
    }
    expect(html(id, "over-hero", "en")).toContain('data-solid="false"');
    expect(html(id, "solid", "en")).toContain('data-solid="true"');
  });

  it("draws the two looks with one announcement and the quiet cart", () => {
    for (const stateId of ["over-hero", "solid"]) {
      const props = headerOf(id, stateId);
      expect(props.announcement?.messages).toHaveLength(1);
      expect(props.cart).toBeUndefined();
      expect(props.drawn).toBeUndefined();
    }
  });
});

describe("the other headers' stories", () => {
  it("do not pin a look, which only the transparent header has", () => {
    for (const id of ids.filter((each) => each !== "headers-footers/header-transparent")) {
      for (const part of story(id).states ?? []) {
        expect(headerOf(id, part.id).solid, `${id} ${part.id}`).toBeUndefined();
      }
    }
  });
});
