// Ours (T37, SETUP.md "Listing organisms (T37)").
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { FilterDrawer } from "@shopblok/ui/organisms/filter-drawer";
import { FilterSidebar } from "@shopblok/ui/organisms/filter-sidebar";
import { ProductToolbar } from "@shopblok/ui/organisms/product-toolbar";
import { SearchOverlay } from "@shopblok/ui/organisms/search-overlay";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverlayBox } from "../components/overlay-box";
import { SearchFixture } from "../components/search-fixture";
import { createContext } from "../context";
import { searchFilterOrganismStories } from "./organisms-search-filters";

// The stories of SearchOverlay, FilterSidebar, FilterDrawer and ProductToolbar (T37; D40, D41, D44,
// D45): the states the task lists are there, each shows what its description says in every locale,
// every landmark of the page is named apart, nothing in an open state moves, every link is told not
// to prefetch, and the props that reach a client part serialize, because a story renders on the
// server. A story renders to static markup here (the storefront's tests have no DOM), and a dialog
// or a sheet drawn open has no markup on the server (its popup is a portal, drawn after the page
// has hydrated), so what a state gives the organism is read from the element the story returns.
// What the organisms do when they are used is the ui package's test; that the open states do open
// in their boxes is `organisms-search-filters.dom.test.tsx`; and the sizes, the clipping and axe
// are the design-system job's browser check.

/** The one character the house style leaves out of every sentence. */
const EM_DASH = String.fromCharCode(0x2014);

type Id = keyof typeof searchFilterOrganismStories;

const overlay = "organisms/search-overlay";
const sidebar = "organisms/filter-sidebar";
const drawer = "organisms/filter-drawer";
const toolbar = "organisms/product-toolbar";

const story = (id: Id) => searchFilterOrganismStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const node = (id: Id, stateId: string | undefined, locale: Locale): ReactNode => {
  const ctx = createContext(locale);
  return stateId === undefined ? story(id).live(ctx) : state(id, stateId).render(ctx);
};
const html = (id: Id, stateId: string | undefined, locale: Locale) =>
  renderToStaticMarkup(node(id, stateId, locale));
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)].length;
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const listing = (locale: Locale) => commerceFixtures[locale].listing;
const organisms = (locale: Locale) => catalogs[locale].organisms;
const molecules = (locale: Locale) => catalogs[locale].molecules;

const stateIds = {
  [overlay]: ["recent", "results", "loading", "empty", "long", "long-recent"],
  [sidebar]: ["chosen", "none", "long"],
  [drawer]: ["chosen", "none", "zero", "long"],
  [toolbar]: ["no-view", "list", "one", "none", "long"],
} as const;

/** The elements a story returns are the components themselves: their props are what the story chose. */
function rendered<Props>(value: ReactNode, type: unknown): ReactElement<Props> {
  if (!isValidElement<Props>(value) || value.type !== type) throw new Error("not the component");
  return value;
}
/** The one element inside another's children. */
function inside(value: ReactNode): ReactElement {
  const found = Children.toArray(value).filter(isValidElement);
  if (found.length !== 1 || found[0] === undefined) throw new Error("not exactly one child");
  return found[0];
}
const childrenOf = (element: ReactElement) => (element.props as { children?: ReactNode }).children;
/** What is inside the overlay box a state draws: the box's own props, and the component in its corner. */
function boxed(value: ReactNode): {
  height: number;
  name: string;
  content: ReactElement;
} {
  const box = rendered<ComponentProps<typeof OverlayBox>>(value, OverlayBox);
  return {
    height: box.props.height ?? 480,
    name: box.props.name,
    content: inside(childrenOf(inside(box.props.children))),
  };
}

type OverlayProps = ComponentProps<typeof SearchOverlay>;
type FixtureProps = ComponentProps<typeof SearchFixture>;
type SidebarProps = ComponentProps<typeof FilterSidebar>;
type DrawerProps = ComponentProps<typeof FilterDrawer>;
type ToolbarProps = ComponentProps<typeof ProductToolbar>;

/** What the overlay and the fixture share: the words, the locale and how the popup is drawn. */
type Chrome = Pick<
  OverlayProps,
  "copy" | "priceCopy" | "locale" | "prefetch" | "defaultOpen" | "modal" | "popupClassName"
>;
/** The component a state or the live render draws, whichever it is (SearchOverlay or SearchFixture). */
function overlayElement(stateId: string | undefined, locale: Locale): ReactElement<Chrome> {
  const value = node(overlay, stateId, locale);
  return stateId === undefined
    ? rendered<Chrome>(value, SearchFixture)
    : (boxed(value).content as ReactElement<Chrome>);
}
const chromeOf = (stateId: string | undefined, locale: Locale) =>
  overlayElement(stateId, locale).props;
/** The props of a state that draws SearchOverlay itself (all but the two with the recent queries). */
const overlayProps = (stateId: string, locale: Locale) =>
  rendered<OverlayProps>(boxed(node(overlay, stateId, locale)).content, SearchOverlay).props;
/** The props of a state that draws SearchFixture. */
const fixtureProps = (stateId: string, locale: Locale) =>
  rendered<FixtureProps>(boxed(node(overlay, stateId, locale)).content, SearchFixture).props;
/** The states drawn by `SearchFixture` (they hold the recent queries, so they hold the handler). */
const fixtureStates = ["recent", "long-recent"];

/** The sidebar's story is the form in a column as wide as a sidebar. */
const sidebarColumn = (stateId: string | undefined, locale: Locale) =>
  rendered<{ className: string; children: ReactNode }>(node(sidebar, stateId, locale), "div");
const sidebarProps = (stateId: string | undefined, locale: Locale) =>
  rendered<SidebarProps>(inside(sidebarColumn(stateId, locale).props.children), FilterSidebar)
    .props;

const drawerProps = (stateId: string | undefined, locale: Locale): DrawerProps =>
  stateId === undefined
    ? rendered<DrawerProps>(node(drawer, undefined, locale), FilterDrawer).props
    : rendered<DrawerProps>(boxed(node(drawer, stateId, locale)).content, FilterDrawer).props;

const toolbarProps = (stateId: string | undefined, locale: Locale) =>
  rendered<ToolbarProps>(node(toolbar, stateId, locale), ProductToolbar).props;

const isFunction = (value: unknown) => typeof value === "function";
/** How React writes text into an attribute or an element. */
const escaped = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");

describe("the search and filter organisms' stories", () => {
  it("are one for each of the four entries, each with a summary and a11y notes", () => {
    expect(Object.keys(searchFilterOrganismStories).sort()).toEqual(
      [drawer, sidebar, overlay, toolbar].sort(),
    );
    for (const [id, each] of Object.entries(searchFilterOrganismStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.summary.trim().endsWith("."), id).toBe(true);
      expect(each.a11y.length, id).toBeGreaterThan(0);
      for (const note of each.a11y) {
        expect(note.trim().endsWith("."), `${id}: ${note.slice(0, 30)}`).toBe(true);
        // Full sentences: more than a label's worth of words.
        expect(note.trim().split(/\s+/).length, `${id}: ${note.slice(0, 30)}`).toBeGreaterThan(8);
      }
    }
  });

  it("have the states the task lists", () => {
    for (const [id, ids] of Object.entries(stateIds)) {
      expect((story(id as Id).states ?? []).map((each) => each.id)).toEqual(ids);
    }
  });

  it("give each state a distinct id and label, and a description", () => {
    for (const [id, each] of Object.entries(searchFilterOrganismStories)) {
      const ids = (each.states ?? []).map((part) => part.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      const labels = (each.states ?? []).map((part) => part.label);
      expect(new Set(labels).size, id).toBe(labels.length);
      for (const part of each.states ?? []) {
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
        expect(part.description?.trim() ?? "", `${id} ${part.id}`).not.toBe("");
      }
    }
  });

  it("lay the states out one under another: a popup, a sheet and a bar follow their box's width", () => {
    for (const each of Object.values(searchFilterOrganismStories)) {
      expect(each.statesLayout).toBe("stack");
    }
  });

  it("use no em dash anywhere in their words", () => {
    for (const [id, each] of Object.entries(searchFilterOrganismStories)) {
      const words = [
        each.summary,
        ...each.a11y,
        ...(each.states ?? []).flatMap((part) => [part.label, part.description ?? ""]),
      ];
      for (const text of words) expect(text, id).not.toContain(EM_DASH);
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(searchFilterOrganismStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(300);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
        expect(markup, `${id} ${part.id}`).not.toContain(EM_DASH);
      }
    }
  });

  it("give the client parts props that serialize (a story renders on the server)", () => {
    const check = (props: object) => {
      expect(Object.values(props).filter(isFunction)).toEqual([]);
      expect(JSON.parse(JSON.stringify(props))).toEqual(props);
    };
    for (const locale of LOCALES) {
      check(chromeOf(undefined, locale));
      for (const stateId of stateIds[overlay]) check(chromeOf(stateId, locale));
      check(drawerProps(undefined, locale));
      for (const stateId of stateIds[drawer]) check(drawerProps(stateId, locale));
      // The toolbar's slot holds an element; its other props are data.
      const { filters: _filters, ...live } = toolbarProps(undefined, locale);
      check(live);
      for (const stateId of stateIds[toolbar]) {
        const { filters: _slot, ...rest } = toolbarProps(stateId, locale);
        check(rest);
      }
    }
  });

  it("tell every link not to prefetch, in the live renders and in every state", () => {
    for (const locale of LOCALES) {
      expect(chromeOf(undefined, locale).prefetch, `live ${locale}`).toBe(false);
      for (const stateId of stateIds[overlay]) {
        expect(chromeOf(stateId, locale).prefetch, `${stateId} ${locale}`).toBe(false);
      }
      expect(sidebarProps(undefined, locale).prefetch).toBe(false);
      for (const stateId of stateIds[sidebar]) {
        expect(sidebarProps(stateId, locale).prefetch, `${stateId} ${locale}`).toBe(false);
      }
      expect(drawerProps(undefined, locale).prefetch).toBe(false);
      for (const stateId of stateIds[drawer]) {
        expect(drawerProps(stateId, locale).prefetch, `${stateId} ${locale}`).toBe(false);
      }
      for (const stateId of [undefined, ...stateIds[toolbar]]) {
        const props = toolbarProps(stateId, locale);
        expect(props.prefetch, `${stateId} ${locale}`).toBe(false);
        const slot = rendered<DrawerProps>(props.filters, FilterDrawer);
        expect(slot.props.prefetch, `${stateId} ${locale}`).toBe(false);
      }
    }
  });
});

describe("SearchOverlay's stories", () => {
  it("say what the task asks: Escape once, a GET form, inline list, one status, recents, 44 px", () => {
    const notes = story(overlay).a11y.join("\n");
    expect(notes).toMatch(/Escape, pressed once/i);
    expect(notes).toMatch(/GET form/);
    expect(notes).toMatch(/without JavaScript/i);
    expect(notes).toMatch(/inline in the dialog/i);
    expect(notes).toMatch(/One polite status region/i);
    expect(notes).toMatch(/prefers-reduced-motion/);
    expect(notes).toMatch(/per visitor \(D44\)/);
    expect(notes).toMatch(/44 px/);
    expect(notes).toMatch(/wrap-anywhere/);
    // The words the notes quote are the catalog's English ones.
    const en = organisms("en").searchOverlay;
    for (const words of [en.open, en.title, en.label, en.loading, en.clearRecent]) {
      expect(notes, words).toContain(`“${words}”`);
    }
    expect(notes).toContain("“14 results”");
    expect(notes).toContain("“See all 14 results”");
  });

  describe("the live render", () => {
    it.each(LOCALES)("is SearchFixture, closed, with the locale's fixtures, in %s", (locale) => {
      const props = rendered<FixtureProps>(node(overlay, undefined, locale), SearchFixture).props;
      expect(props.action).toBe(listing(locale).search.idle.search.action);
      expect(props.recent).toEqual(listing(locale).search.idle.recent);
      expect(props.products).toEqual(commerceFixtures[locale].products);
      expect(props.copy).toEqual(organisms(locale).searchOverlay);
      expect(props.priceCopy).toEqual(molecules(locale).priceBlock);
      expect(props.locale).toBe(htmlLang(locale));
      // A real dialog when it is opened (modal, animated): not drawn open, not capped to a box.
      expect(props.defaultOpen).toBeUndefined();
      expect(props.modal).toBeUndefined();
      expect(props.popupClassName).toBeUndefined();
    });

    it.each(LOCALES)("draws the search button on the server, and no popup, in %s", (locale) => {
      const markup = html(overlay, undefined, locale);
      expect(count(markup, /data-slot="search-overlay-trigger"/g)).toBe(1);
      expect(markup).not.toContain('data-slot="search-overlay"');
      expect(markup).toContain(organisms(locale).searchOverlay.open);
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("are drawn open in a box of their own, not modal, still, in %s", (locale) => {
      for (const stateId of stateIds[overlay]) {
        const box = boxed(node(overlay, stateId, locale));
        expect(box.name, stateId).toBe(state(overlay, stateId).label);
        expect(box.height, stateId).toBeGreaterThanOrEqual(400);
        const props = chromeOf(stateId, locale);
        expect(props.defaultOpen, stateId).toBe(true);
        expect(props.modal, stateId).toBe(false);
        // Capped to the box (the window's height means nothing in it) and without an animation.
        expect(props.popupClassName, stateId).toContain("max-h-[calc(100%-2rem)]");
        expect(props.popupClassName, stateId).toContain("sm:max-h-[calc(100%-4rem)]");
        expect(props.popupClassName, stateId).toContain("duration-0");
      }
    });

    it.each(LOCALES)("give the overlay the fixtures' sets and no handler, in %s", (locale) => {
      const sets = listing(locale).search;
      const results = overlayProps("results", locale);
      expect(results.search).toEqual(sets.results.search);
      expect(results.result).toEqual(sets.results.result);
      expect(results.recent).toEqual(sets.results.recent);
      expect(results.loading).toBe(false);
      const loading = overlayProps("loading", locale);
      expect(loading.loading).toBe(true);
      expect(loading.result).toEqual(sets.loading.result);
      expect(loading.search.query).toBe(sets.loading.search.query);
      const empty = overlayProps("empty", locale);
      expect(empty.result?.total).toBe(0);
      expect(empty.search.query).toBe(sets.empty.search.query);
      for (const stateId of ["results", "loading", "empty", "long"]) {
        const props = overlayProps(stateId, locale);
        expect(props.onQueryChange, stateId).toBeUndefined();
        expect(props.onClearRecent, stateId).toBeUndefined();
        expect(props.copy, stateId).toBeDefined();
        expect(props.priceCopy, stateId).toEqual(molecules(locale).priceBlock);
        expect(props.locale, stateId).toBe(htmlLang(locale));
      }
    });

    it.each(LOCALES)(
      "draw the recent queries with SearchFixture, which holds the button that forgets them, in %s",
      (locale) => {
        for (const stateId of fixtureStates) {
          const value = boxed(node(overlay, stateId, locale)).content;
          const props = rendered<FixtureProps>(value, SearchFixture).props;
          expect(props.recent.length, stateId).toBeGreaterThan(0);
          expect(props.action, stateId).toBe(listing(locale).search.idle.search.action);
          expect(props.products, stateId).toEqual(commerceFixtures[locale].products);
        }
        expect(fixtureProps("recent", locale).recent).toEqual(listing(locale).search.idle.recent);
        // The states with a handler's job are the only two drawn by the fixture.
        for (const stateId of stateIds[overlay].filter((each) => !fixtureStates.includes(each))) {
          expect(boxed(node(overlay, stateId, locale)).content.type, stateId).toBe(SearchOverlay);
        }
      },
    );

    it.each(LOCALES)("draw an answer with a long query and the longest labels, in %s", (locale) => {
      const { long } = createContext(locale).fixture;
      const props = overlayProps("long", locale);
      expect(props.search.query).toBe(long.productName);
      expect(props.result?.query).toBe(long.productName);
      expect(props.result?.total).toBeGreaterThanOrEqual(1000);
      expect(props.result?.products.length).toBeGreaterThanOrEqual(4);
      // The longest of the twelve titles is first.
      const longest = Math.max(
        ...commerceFixtures[locale].products.map((each) => each.title.length),
      );
      expect(props.result?.products[0]?.title.length).toBe(longest);
      expect(new Set(props.result?.products.map((each) => each.id)).size).toBe(
        props.result?.products.length,
      );
      const labels = [
        ...(props.result?.categories ?? []).map((each) => each.label),
        ...(props.result?.suggestions ?? []),
      ];
      expect(labels.length).toBeGreaterThanOrEqual(4);
      for (const label of labels) expect(label.length, label).toBeGreaterThanOrEqual(10);
      // The headings are long too.
      expect(props.copy.products).toBe(long.fieldLabel);
      expect(props.copy.categories).toBe(long.chipLabel);
      expect(props.copy.suggestions).toBe(long.hint);
      const recent = fixtureProps("long-recent", locale);
      expect(recent.recent[0]).toBe(long.productName);
      expect(recent.copy.clearRecent).toBe(long.action);
      expect(recent.copy.recent).toBe(long.fieldLabel);
    });

    it.each(LOCALES)("keep the catalog's other words, in %s", (locale) => {
      const catalog = organisms(locale).searchOverlay;
      // What a state replaces, besides the dialog's name.
      const replaced: Record<string, string[]> = {
        long: ["products", "categories", "suggestions"],
        "long-recent": ["recent", "clearRecent"],
      };
      for (const stateId of stateIds[overlay]) {
        const words = chromeOf(stateId, locale).copy;
        for (const key of Object.keys(catalog) as (keyof typeof catalog)[]) {
          if (key === "title" || replaced[stateId]?.includes(key)) continue;
          expect(words[key], `${stateId} ${key}`).toBe(catalog[key]);
        }
      }
    });
  });

  describe("the dialogs' names", () => {
    it.each(LOCALES)(
      "are apart: the live render's own, and each state's with its label, in %s",
      (locale) => {
        const titles = [undefined, ...stateIds[overlay]].map(
          (stateId) => chromeOf(stateId, locale).copy.title,
        );
        expect(new Set(titles).size).toBe(titles.length);
        expect(titles[0]).toBe(organisms(locale).searchOverlay.title);
        stateIds[overlay].forEach((stateId, index) => {
          expect(titles[index + 1]).toBe(
            `${organisms(locale).searchOverlay.title} (${state(overlay, stateId).label})`,
          );
        });
      },
    );
  });
});

describe("FilterSidebar's stories", () => {
  it("say what the task asks: a GET form, no submit on change, open groups, chips, 44 px", () => {
    const notes = story(sidebar).a11y.join("\n");
    expect(notes).toMatch(/GET form/);
    expect(notes).toMatch(/without JavaScript/i);
    expect(notes).toMatch(/does not submit when a box is ticked/i);
    expect(notes).toMatch(/3\.2\.2/);
    expect(notes).toMatch(/aria-expanded/);
    expect(notes).toMatch(/start open/i);
    expect(notes).toMatch(/keeps its fields in the form/i);
    expect(notes).toMatch(/ActiveFilterChips/);
    expect(notes).toMatch(/44 px/);
    expect(notes).toMatch(/wrap-anywhere/);
    const en = organisms("en").filterSidebar;
    expect(notes).toContain(`“${en.title}”`);
    expect(notes).toContain(`“${en.apply}”`);
    expect(notes).toContain(`“${molecules("en").activeFilterChips.clearAll}”`);
  });

  describe("the live render", () => {
    it.each(LOCALES)("is the sidebar with the fixtures' six chosen values, in %s", (locale) => {
      const props = sidebarProps(undefined, locale);
      const { filters } = listing(locale);
      expect(props.action).toBe(filters.action);
      expect(props.groups).toEqual(filters.groups);
      expect(props.params).toEqual(filters.params);
      expect(props.active).toEqual(filters.active);
      expect(props.active?.filters).toHaveLength(6);
      expect(props.copy).toEqual(organisms(locale).filterSidebar);
      expect(props.groupCopy).toEqual(molecules(locale).filterGroup);
      expect(props.chipsCopy).toEqual(molecules(locale).activeFilterChips);
      expect(props.locale).toBe(htmlLang(locale));
      // Under the section's h2 its heading is an h3.
      expect(props.headingLevel).toBe(3);
    });

    it.each(LOCALES)("draws the form, the chips, six groups and the button, in %s", (locale) => {
      const markup = html(sidebar, undefined, locale);
      expect(count(markup, /<form /g)).toBe(1);
      expect(markup).toContain('data-slot="filter-sidebar"');
      expect(markup).toContain('method="get"');
      expect(markup).toContain(`action="${listing(locale).filters.action}"`);
      expect(markup).toContain('data-slot="filter-sidebar-apply"');
      expect(markup).toContain(organisms(locale).filterSidebar.title);
      expect(markup).toContain(organisms(locale).filterSidebar.apply);
      for (const group of listing(locale).filters.groups) {
        expect(markup, group.id).toContain(group.label);
      }
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("draw the chosen filters, in %s", (locale) => {
      const props = sidebarProps("chosen", locale);
      expect(props.groups).toEqual(listing(locale).filters.groups);
      expect(props.active).toEqual(listing(locale).filters.active);
      expect(props.headingLevel).toBe(4);
    });

    it.each(LOCALES)(
      "draw nothing chosen: no chips, no box ticked, no range set, in %s",
      (locale) => {
        const props = sidebarProps("none", locale);
        expect(props.active).toBeUndefined();
        expect(props.groups.map((group) => group.id)).toEqual(
          listing(locale).filters.groups.map((group) => group.id),
        );
        for (const group of props.groups) {
          if (group.kind === "checkbox" || group.kind === "swatch") {
            expect(
              group.options.some((option) => option.selected),
              group.id,
            ).toBe(false);
          } else if (group.kind === "range") {
            expect(group.selected, group.id).toBeUndefined();
          } else {
            expect(group.selected, group.id).toBe(false);
          }
        }
        // The chips are not in the markup, and the form still is.
        const markup = html(sidebar, "none", locale);
        expect(markup).not.toContain(molecules(locale).activeFilterChips.clearAll);
        expect(markup).toContain('data-slot="filter-sidebar-apply"');
      },
    );

    it.each(LOCALES)("draw the locale's longest strings for every name, in %s", (locale) => {
      const { long } = createContext(locale).fixture;
      const props = sidebarProps("long", locale);
      const original = listing(locale).filters;
      expect(props.groups.map((group) => group.id)).toEqual(
        original.groups.map((group) => group.id),
      );
      // Each group has a name of its own, and none is the catalog's.
      const labels = props.groups.map((group) => group.label);
      expect(new Set(labels).size).toBe(labels.length);
      for (const [index, group] of props.groups.entries()) {
        expect(group.label, group.id).not.toBe(original.groups[index]?.label);
        expect(group.label.length, group.id).toBeGreaterThanOrEqual(10);
      }
      const options = props.groups.flatMap((group) =>
        group.kind === "checkbox" || group.kind === "swatch" ? group.options : [],
      );
      expect(options.length).toBeGreaterThan(8);
      for (const option of options)
        expect(option.label.length, option.label).toBeGreaterThanOrEqual(10);
      expect(Math.max(...options.map((option) => option.count))).toBe(12480);
      // The same number of chips, in the longest words; the chosen values are the fixtures'.
      expect(props.active?.filters).toHaveLength(original.active?.filters.length ?? -1);
      for (const chip of props.active?.filters ?? []) {
        expect(chip.label.length, chip.id).toBeGreaterThanOrEqual(10);
        expect(chip.removeHref, chip.id).toContain(original.action);
      }
      expect(props.active?.clearHref).toBe(original.active?.clearHref);
      expect(props.copy.apply).toBe(long.action);
      expect(props.groups.map((group) => group.kind)).toEqual(
        original.groups.map((group) => group.kind),
      );
    });

    it.each(LOCALES)("keep the form's own fields as they are, in %s", (locale) => {
      for (const stateId of stateIds[sidebar]) {
        const props = sidebarProps(stateId, locale);
        expect(props.action, stateId).toBe(listing(locale).filters.action);
        expect(props.params, stateId).toEqual(listing(locale).filters.params);
        expect(props.locale, stateId).toBe(htmlLang(locale));
        expect(props.groupCopy, stateId).toEqual(molecules(locale).filterGroup);
      }
    });
  });

  describe("the forms' names", () => {
    it.each(LOCALES)(
      "are apart: the live render's own, and each state's with its label, in %s",
      (locale) => {
        const titles = [undefined, ...stateIds[sidebar]].map(
          (stateId) => sidebarProps(stateId, locale).copy.title,
        );
        expect(new Set(titles).size).toBe(titles.length);
        expect(titles[0]).toBe(organisms(locale).filterSidebar.title);
        stateIds[sidebar].forEach((stateId, index) => {
          expect(titles[index + 1]).toBe(
            `${organisms(locale).filterSidebar.title} (${state(sidebar, stateId).label})`,
          );
        });
      },
    );

    it.each(LOCALES)("are the markup's headings and labels, once for each, in %s", (locale) => {
      for (const stateId of stateIds[sidebar]) {
        const title = sidebarProps(stateId, locale).copy.title;
        const markup = html(sidebar, stateId, locale);
        expect(count(markup, /<form /g), stateId).toBe(1);
        expect(markup, stateId).toContain(`>${escaped(title)}</h4>`);
      }
    });
  });

  it("is wrapped in a column as wide as a sidebar, whose form fills it", () => {
    for (const stateId of [undefined, ...stateIds[sidebar]]) {
      expect(sidebarColumn(stateId, "en").props.className, String(stateId)).toContain("max-w-sm");
    }
  });
});

describe("FilterDrawer's stories", () => {
  it("say what the task asks: the name, the sheet, the foot, clear closes it, 0 pressable, JS", () => {
    const notes = story(drawer).a11y.join("\n");
    expect(notes).toMatch(/modal sheet/);
    expect(notes).toMatch(/focus starts on the close button/i);
    expect(notes).toMatch(/Escape closes it/);
    expect(notes).toMatch(/stays in view/i);
    expect(notes).toMatch(/closes the sheet/i);
    expect(notes).toMatch(/pressable at 0/i);
    expect(notes).toMatch(/needs JavaScript/i);
    expect(notes).toMatch(/2\.5\.3/);
    expect(notes).toMatch(/prefers-reduced-motion/);
    expect(notes).toMatch(/44 px/);
    const en = organisms("en").filterDrawer;
    expect(notes).toContain(`“${en.open}”`);
    expect(notes).toContain(`“${en.clear}”`);
    expect(notes).toContain("“Filters, 6 filters chosen”");
    expect(notes).toContain("“Show 24 results”");
    expect(notes).toContain("“No results”");
  });

  describe("the live render", () => {
    it.each(LOCALES)("is the closed drawer with the fixtures' panel, in %s", (locale) => {
      const props = drawerProps(undefined, locale);
      const { filters } = listing(locale);
      expect(props.action).toBe(filters.action);
      expect(props.groups).toEqual(filters.groups);
      expect(props.active).toEqual(filters.active);
      expect(props.resultCount).toBe(24);
      expect(props.copy).toEqual(organisms(locale).filterDrawer);
      expect(props.groupCopy).toEqual(molecules(locale).filterGroup);
      expect(props.locale).toBe(htmlLang(locale));
      expect(props.defaultOpen).toBeUndefined();
      expect(props.modal).toBeUndefined();
      expect(props.popupClassName).toBeUndefined();
    });

    it.each(LOCALES)(
      "draws the button on the server with the number chosen, no sheet, in %s",
      (locale) => {
        const markup = html(drawer, undefined, locale);
        expect(count(markup, /data-slot="filter-drawer-trigger"/g)).toBe(1);
        expect(markup).not.toContain('data-slot="filter-drawer"');
        expect(markup).toContain(organisms(locale).filterDrawer.open);
        expect(markup).toContain('data-slot="filter-drawer-count"');
      },
    );
  });

  describe("the states", () => {
    it.each(LOCALES)("are drawn open in a box of their own, not modal, still, in %s", (locale) => {
      for (const stateId of stateIds[drawer]) {
        const box = boxed(node(drawer, stateId, locale));
        expect(box.name, stateId).toBe(state(drawer, stateId).label);
        // The sheet is as tall as its box: room for a header, a body that scrolls and a foot.
        expect(box.height, stateId).toBeGreaterThanOrEqual(640);
        const props = drawerProps(stateId, locale);
        expect(props.defaultOpen, stateId).toBe(true);
        expect(props.modal, stateId).toBe(false);
        expect(props.popupClassName, stateId).toContain("duration-0");
        expect(props.prefetch, stateId).toBe(false);
      }
    });

    it.each(LOCALES)("draw the panels the task lists, in %s", (locale) => {
      const { filters } = listing(locale);
      const chosen = drawerProps("chosen", locale);
      expect(chosen.active).toEqual(filters.active);
      expect(chosen.resultCount).toBe(24);
      const none = drawerProps("none", locale);
      expect(none.active).toBeUndefined();
      expect(none.resultCount).toBe(24);
      const zero = drawerProps("zero", locale);
      expect(zero.resultCount).toBe(0);
      expect(zero.active).toEqual(filters.active);
      const long = drawerProps("long", locale);
      expect(long.active?.filters).toHaveLength(6);
      expect(long.groups.map((group) => group.label)).not.toEqual(
        filters.groups.map((group) => group.label),
      );
    });

    it.each(LOCALES)(
      "draw the long state's title, close button and clear link in the longest words, in %s",
      (locale) => {
        const { long } = createContext(locale).fixture;
        const props = drawerProps("long", locale);
        expect(props.copy.close).toBe(long.linkLabel);
        expect(props.copy.clear).toBe(long.action);
        expect(props.copy.title).toBe(`${long.fieldLabel} (${state(drawer, "long").label})`);
        // The rest of the catalog's words stay.
        expect(props.copy.open).toBe(organisms(locale).filterDrawer.open);
        expect(props.copy.show).toBe(organisms(locale).filterDrawer.show);
        expect(props.copy.chosen).toBe(organisms(locale).filterDrawer.chosen);
      },
    );
  });

  describe("the sheets' names", () => {
    it.each(LOCALES)(
      "are apart: the live render's own, and each state's with its label, in %s",
      (locale) => {
        const titles = [undefined, ...stateIds[drawer]].map(
          (stateId) => drawerProps(stateId, locale).copy.title,
        );
        expect(new Set(titles).size).toBe(titles.length);
        expect(titles[0]).toBe(organisms(locale).filterDrawer.title);
        for (const [index, stateId] of stateIds[drawer].entries()) {
          const own =
            stateId === "long"
              ? createContext(locale).fixture.long.fieldLabel
              : organisms(locale).filterDrawer.title;
          expect(titles[index + 1]).toBe(`${own} (${state(drawer, stateId).label})`);
        }
      },
    );
  });
});

describe("ProductToolbar's stories", () => {
  it("say what the task asks: a count, a sort form, a group of links, the slot below lg, the rows", () => {
    const notes = story(toolbar).a11y.join("\n");
    expect(notes).toMatch(/not a live region/i);
    expect(notes).toMatch(/SortSelect/);
    expect(notes).toMatch(/group named “View” of two links/);
    expect(notes).toMatch(/aria-current/);
    expect(notes).toMatch(/not a colour alone/i);
    expect(notes).toMatch(/below lg only/i);
    expect(notes).toMatch(/share the first row/);
    expect(notes).toMatch(/44 px/);
    expect(notes).toMatch(/wrap-anywhere/);
    expect(notes).toContain("“24 products”");
    expect(notes).toContain(`“${organisms("en").productToolbar.view}”`);
  });

  describe("the live render", () => {
    it.each(LOCALES)(
      "is the toolbar with the filters drawer in its slot and the view toggle, in %s",
      (locale) => {
        const props = toolbarProps(undefined, locale);
        const { filters } = listing(locale);
        expect(props.count).toBe(filters.resultCount);
        expect(props.view?.current).toBe("grid");
        expect(props.copy).toEqual(organisms(locale).productToolbar);
        expect(props.sortCopy).toEqual(molecules(locale).sortSelect);
        expect(props.locale).toBe(htmlLang(locale));
        const slot = rendered<DrawerProps>(props.filters, FilterDrawer).props;
        expect(slot.groups).toEqual(filters.groups);
        expect(slot.active).toEqual(filters.active);
        expect(slot.resultCount).toBe(props.count);
        expect(slot.defaultOpen).toBeUndefined();
      },
    );

    it.each(LOCALES)("draws the count, the toggle, the sort and the button, in %s", (locale) => {
      const markup = html(toolbar, undefined, locale);
      expect(markup).toContain('data-slot="product-toolbar"');
      expect(markup).toContain('data-slot="product-toolbar-count"');
      expect(markup).toContain('data-slot="product-toolbar-view"');
      expect(markup).toContain('data-slot="sort-select"');
      expect(markup).toContain('data-slot="filter-drawer-trigger"');
      expect(count(markup, /aria-current="true"/g)).toBe(1);
      expect(count(markup, /data-slot="product-toolbar-view-link"/g)).toBe(2);
    });
  });

  describe("the sort", () => {
    it.each(LOCALES)(
      "is built from the catalog's words for the market's listing, in %s",
      (locale) => {
        const words = molecules(locale).sortSelect.options;
        for (const stateId of [undefined, "no-view", "list", "one", "none"]) {
          const { sort } = toolbarProps(stateId, locale);
          expect(sort.action, String(stateId)).toBe(`${commerceFixtures[locale].prefix}/store`);
          expect(sort.name).toBe("sort");
          expect(sort.options.map((option) => option.value)).toEqual([
            "relevance",
            "newest",
            "price-asc",
            "price-desc",
          ]);
          expect(sort.options.map((option) => option.label)).toEqual([
            words.relevance,
            words.newest,
            words.priceAsc,
            words.priceDesc,
          ]);
          expect(sort.selected).toBe("relevance");
        }
      },
    );

    it.each(LOCALES)(
      "keeps the listing's chosen filters and the view as hidden inputs, in %s",
      (locale) => {
        const { sort, view } = toolbarProps(undefined, locale);
        const names = sort.params.map((param) => param.name);
        // The six values chosen by the fixtures' facets, and the view.
        expect(names).toContain("category");
        expect(names).toContain("price.min");
        expect(names).toContain("price.max");
        expect(sort.params.at(-1)).toEqual({ name: "view", value: "grid" });
        expect(names).not.toContain("sort");
        expect(names).not.toContain("page");
        expect(view?.gridHref).toContain("view=grid");
        expect(view?.listHref).toContain("view=list");
        expect(view?.gridHref.startsWith(sort.action)).toBe(true);
        // No view: nothing about the view travels.
        expect(
          toolbarProps("no-view", locale).sort.params.map((param) => param.name),
        ).not.toContain("view");
      },
    );
  });

  describe("the states", () => {
    it.each(LOCALES)("draw what the task lists, in %s", (locale) => {
      const resultCount = listing(locale).filters.resultCount;
      const noView = toolbarProps("no-view", locale);
      expect(noView.view).toBeUndefined();
      expect(noView.count).toBe(resultCount);
      expect(toolbarProps("list", locale).view?.current).toBe("list");
      expect(toolbarProps("list", locale).count).toBe(resultCount);
      expect(toolbarProps("one", locale).count).toBe(1);
      expect(toolbarProps("none", locale).count).toBe(0);
      expect(toolbarProps("one", locale).view?.current).toBe("grid");
      expect(toolbarProps("none", locale).view?.current).toBe("grid");
    });

    it.each(LOCALES)("say the count in the locale's words, in %s", (locale) => {
      const words = organisms(locale).productToolbar.count;
      for (const [stateId, expected] of [
        ["no-view", listing(locale).filters.resultCount],
        ["list", listing(locale).filters.resultCount],
        ["one", 1],
        ["none", 0],
        ["long", 1284],
      ] as const) {
        const text = formatMessage(words, { count: expected }, htmlLang(locale));
        expect(html(toolbar, stateId, locale), stateId).toContain(`>${escaped(text)}</p>`);
      }
    });

    it.each(LOCALES)(
      "mark one link of the toggle as current, the one the state names, in %s",
      (locale) => {
        for (const [stateId, current] of [
          [undefined, "grid"],
          ["list", "list"],
          ["one", "grid"],
          ["none", "grid"],
          ["long", "grid"],
        ] as const) {
          const markup = html(toolbar, stateId, locale);
          expect(count(markup, /aria-current="true"/g), String(stateId)).toBe(1);
          expect(markup, String(stateId)).toMatch(
            new RegExp(
              `data-view="${current}"[^>]*aria-current="true"|aria-current="true"[^>]*data-view="${current}"`,
            ),
          );
        }
        expect(html(toolbar, "no-view", locale)).not.toContain('data-slot="product-toolbar-view"');
      },
    );

    it.each(LOCALES)(
      "keep the drawer in the slot closed, with the count as its result count, in %s",
      (locale) => {
        for (const stateId of stateIds[toolbar]) {
          const props = toolbarProps(stateId, locale);
          const slot = rendered<DrawerProps>(props.filters, FilterDrawer).props;
          expect(slot.defaultOpen, stateId).toBeUndefined();
          expect(slot.resultCount, stateId).toBe(props.count);
          // The drawer's form keeps what the filters do not own.
          const kept = slot.params.map((param) => param.name);
          expect(kept, stateId).toContain("sort");
          expect(kept.includes("view"), stateId).toBe(props.view !== undefined);
          for (const group of slot.groups) expect(kept, group.id).not.toContain(group.id);
        }
      },
    );

    it.each(LOCALES)(
      "draw the longest words in the toggle, the sort and the filters button, in %s",
      (locale) => {
        const { long } = createContext(locale).fixture;
        const props = toolbarProps("long", locale);
        expect(props.count).toBeGreaterThanOrEqual(1000);
        expect(props.copy.grid).toBe(long.action);
        expect(props.copy.list).toBe(long.chipLabel);
        expect(props.copy.view).toBe(`${long.fieldLabel} (${state(toolbar, "long").label})`);
        expect(props.sortCopy.label).toBe(long.fieldLabel);
        expect(props.sortCopy.apply).toBe(long.action);
        expect(props.sort.options.map((option) => option.label)).toEqual([
          long.optionLabel,
          long.hint,
          long.toggleLabel,
          long.badge,
        ]);
        expect(rendered<DrawerProps>(props.filters, FilterDrawer).props.copy.open).toBe(
          long.linkLabel,
        );
      },
    );
  });

  describe("the toggles' names", () => {
    it.each(LOCALES)(
      "are apart: the live render's own, and each state's with its label, in %s",
      (locale) => {
        const names = [undefined, ...stateIds[toolbar]].map(
          (stateId) => toolbarProps(stateId, locale).copy.view,
        );
        expect(new Set(names).size).toBe(names.length);
        expect(names[0]).toBe(organisms(locale).productToolbar.view);
      },
    );

    it.each(LOCALES)(
      "are the markup's group names, once for each state with a toggle, in %s",
      (locale) => {
        for (const stateId of stateIds[toolbar].filter((each) => each !== "no-view")) {
          const name = toolbarProps(stateId, locale).copy.view;
          const markup = html(toolbar, stateId, locale);
          expect(markup, stateId).toContain(`aria-label="${escaped(name)}"`);
        }
      },
    );
  });

  it("is not wrapped in a box: it is the page's own bar", () => {
    expect(rendered(node(toolbar, "list", "en"), ProductToolbar).type).toBe(ProductToolbar);
  });
});
