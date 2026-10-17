// @vitest-environment happy-dom
// Ours (T37, SETUP.md "Listing organisms (T37)"). The stories of SearchOverlay, FilterSidebar,
// FilterDrawer and ProductToolbar, rendered the way the design-system page renders them: in a
// browser DOM (happy-dom, as `lib/visitor/cookie-consent.test.tsx` runs, driven with react-dom and
// `act`). `organisms-search-filters.test.tsx` reads what each story gives the organism; this file
// checks what comes out: that every open state really is open, in its own box, named apart, that
// the answers the fixtures hold are on screen, and that a page with the live render and all the
// states has no id twice (axe's `duplicate-id-aria` and the label that points at the wrong box).
// Pixels (the sizes, the clipping, the two rows of the toolbar on a phone) and axe are the
// design-system job's browser check, not this one.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createContext } from "../context";
import { searchFilterOrganismStories } from "./organisms-search-filters";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Id = keyof typeof searchFilterOrganismStories;

const roots: { root: Root; container: HTMLElement }[] = [];

/** Lets Base UI open a dialog or a sheet: it waits for animation frames. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });

/** Renders the live render (`undefined`) or the states of an entry, as a page puts them one under another. */
async function mount(id: Id, locale: Locale, stateIds?: string[]) {
  const ctx = createContext(locale);
  const story = searchFilterOrganismStories[id];
  const parts = (story.states ?? []).filter(
    (part) => stateIds === undefined || stateIds.includes(part.id),
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });
  await act(async () =>
    root.render(
      <div>
        <section data-live="">{story.live(ctx)}</section>
        {parts.map((part) => (
          <section key={part.id} data-state={part.id}>
            {part.render(ctx)}
          </section>
        ))}
      </div>,
    ),
  );
  await settle();
  return container;
}

afterEach(async () => {
  for (const { root, container } of roots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  document.body.innerHTML = "";
});

const stateOf = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-state="${id}"]`) as HTMLElement;
const liveOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-live]") as HTMLElement;
const slot = (root: ParentNode, name: string) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const slots = (root: ParentNode, name: string) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const box = (root: ParentNode) =>
  root.querySelector<HTMLElement>("[data-overlay-box]") as HTMLElement;
/** The text of the element an `aria-labelledby` points at. */
const nameOf = (element: HTMLElement) =>
  (element.getAttribute("aria-labelledby") ?? "")
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();
const duplicateIds = (root: ParentNode) => {
  const seen = new Map<string, number>();
  for (const element of root.querySelectorAll("[id]")) {
    seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
  }
  return [...seen].filter(([, times]) => times > 1).map(([id]) => id);
};
const texts = (elements: Iterable<Element>) => [...elements].map((each) => each.textContent ?? "");
const search = (locale: Locale) => commerceFixtures[locale].listing.search;
const filters = (locale: Locale) => commerceFixtures[locale].listing.filters;
const searchWords = (locale: Locale) => catalogs[locale].organisms.searchOverlay;
const drawerWords = (locale: Locale) => catalogs[locale].organisms.filterDrawer;
const lang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;

describe("SearchOverlay's stories, rendered", () => {
  it.each(LOCALES)(
    "draw each state's dialog open in its own box, named apart, in %s",
    async (locale) => {
      const container = await mount("organisms/search-overlay", locale);
      const states = searchFilterOrganismStories["organisms/search-overlay"].states ?? [];
      const names: string[] = [];
      for (const part of states) {
        const section = stateOf(container, part.id);
        const popup = slot(section, "search-overlay");
        expect(popup, part.id).not.toBeNull();
        // The portal's container is the state's box, so the popup is inside it.
        expect(box(section).contains(popup), part.id).toBe(true);
        expect(popup?.getAttribute("role"), part.id).toBe("dialog");
        expect(popup?.getAttribute("aria-modal"), part.id).not.toBe("true");
        names.push(nameOf(popup as HTMLElement));
        expect(slots(section, "search-overlay")).toHaveLength(1);
        // The button that opens it is there too.
        expect(slot(section, "search-overlay-trigger"), part.id).not.toBeNull();
      }
      expect(new Set(names).size).toBe(names.length);
      for (const name of names) expect(name).toContain(" (");
      // The live render is closed: its button, and no popup.
      const live = liveOf(container);
      expect(slot(live, "search-overlay-trigger")).not.toBeNull();
      expect(slot(live, "search-overlay")).toBeNull();
      expect(duplicateIds(document)).toEqual([]);
    },
  );

  it.each(LOCALES)("draw the answers the fixtures hold, in %s", async (locale) => {
    const container = await mount("organisms/search-overlay", locale);
    const modeOf = (id: string) =>
      slot(stateOf(container, id), "search-overlay-results")?.getAttribute("data-mode");
    expect(modeOf("recent")).toBe("recent");
    expect(modeOf("results")).toBe("results");
    expect(modeOf("loading")).toBe("results");
    expect(modeOf("empty")).toBe("empty");
    expect(modeOf("long")).toBe("results");
    expect(modeOf("long-recent")).toBe("recent");

    // Before a query: the recent queries and the button that forgets them.
    for (const id of ["recent", "long-recent"]) {
      const section = stateOf(container, id);
      expect(slot(section, "search-overlay-clear-recent"), id).not.toBeNull();
      expect(slot(section, "search-overlay-submit"), id).toBeNull();
    }
    expect(texts(stateOf(container, "recent").querySelectorAll('[role="option"]'))).toEqual(
      search(locale).idle.recent,
    );

    // With results: four products, two categories, three suggestions, and the form's submit.
    const results = stateOf(container, "results");
    const answer = search(locale).results.result;
    expect(results.querySelectorAll('[role="option"]')).toHaveLength(
      (answer?.products.length ?? 0) +
        (answer?.categories.length ?? 0) +
        (answer?.suggestions.length ?? 0),
    );
    expect(slot(results, "search-overlay-submit")?.textContent).toBe(
      formatMessage(searchWords(locale).seeAll, { count: answer?.total ?? 0 }, lang(locale)),
    );
    expect(slot(results, "search-overlay-status")?.textContent?.replaceAll("⁠", "")).toBe(
      formatMessage(searchWords(locale).status, { count: answer?.total ?? 0 }, lang(locale)),
    );
    expect(results.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe(
      answer?.query,
    );

    // Loading: the last answer stays, busy, with the spinner and the words for it.
    const loading = stateOf(container, "loading");
    expect(slot(loading, "search-overlay-results")?.getAttribute("aria-busy")).toBe("true");
    expect(slot(loading, "search-overlay-loading")).not.toBeNull();
    expect(slot(loading, "search-overlay-status")?.textContent?.replaceAll("⁠", "")).toBe(
      searchWords(locale).loading,
    );
    expect(loading.querySelectorAll('[role="option"]').length).toBeGreaterThan(0);

    // No results: the sentence with the query in it, the hint, and no submit.
    const empty = stateOf(container, "empty");
    expect(slot(empty, "search-overlay-empty")?.textContent).toContain(
      search(locale).empty.search.query,
    );
    expect(slot(empty, "search-overlay-empty")?.textContent).toContain(
      searchWords(locale).noResultsHint,
    );
    expect(slot(empty, "search-overlay-submit")).toBeNull();
    expect(empty.querySelectorAll('[role="option"]')).toHaveLength(0);
  });

  it("draws every link of the states with the prefetch told off", async () => {
    // next/link renders an anchor either way; what it was told is what the story props say, and the
    // other test file reads those. Here: every product and category option is an anchor.
    const container = await mount("organisms/search-overlay", "en");
    const links = [...container.ownerDocument.querySelectorAll('[role="option"]')].filter(
      (option) => option.tagName === "A",
    );
    expect(links.length).toBeGreaterThan(0);
    for (const link of links)
      expect(link.getAttribute("href"), link.textContent ?? "").toMatch(/^\/us\//);
  });

  it("draws the long state's labels in full: the query, the longest title and the headings", async () => {
    const container = await mount("organisms/search-overlay", "en");
    const long = createContext("en").fixture.long;
    const section = stateOf(container, "long");
    expect(section.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe(
      long.productName,
    );
    const text = slot(section, "search-overlay-results")?.textContent ?? "";
    for (const heading of [long.fieldLabel, long.chipLabel, long.hint]) {
      expect(text).toContain(heading);
    }
    expect(text).toContain(commerceFixtures.en.products[1]?.title ?? "never");
  });
});

describe("FilterSidebar's stories, rendered", () => {
  it.each(LOCALES)(
    "draw one form for each state, named apart, with every group open, in %s",
    async (locale) => {
      const container = await mount("organisms/filter-sidebar", locale);
      const states = searchFilterOrganismStories["organisms/filter-sidebar"].states ?? [];
      const names: string[] = [];
      for (const section of [
        liveOf(container),
        ...states.map((part) => stateOf(container, part.id)),
      ]) {
        const form = slot(section, "filter-sidebar") as HTMLFormElement;
        expect(form.tagName).toBe("FORM");
        expect(form.getAttribute("method")).toBe("get");
        expect(form.getAttribute("action")).toBe(filters(locale).action);
        names.push(nameOf(form));
        // Five groups are accordion sections and the two switches are rows: all open, none closed.
        const triggers = [...form.querySelectorAll<HTMLElement>("button[aria-expanded]")];
        expect(triggers.length).toBe(
          filters(locale).groups.filter((group) => group.kind !== "toggle").length,
        );
        for (const trigger of triggers) expect(trigger.getAttribute("aria-expanded")).toBe("true");
        expect(slot(form, "filter-sidebar-apply")?.getAttribute("type")).toBe("submit");
      }
      expect(new Set(names).size).toBe(names.length);
      expect(duplicateIds(document)).toEqual([]);
    },
  );

  it.each(LOCALES)("send what is chosen, and nothing when nothing is, in %s", async (locale) => {
    const container = await mount("organisms/filter-sidebar", locale);
    const sent = (id: string) => {
      const form = slot(stateOf(container, id), "filter-sidebar") as HTMLFormElement;
      return [...new FormData(form).keys()];
    };
    const chosen = sent("chosen");
    expect(chosen).toContain("category");
    expect(chosen).toContain("colour");
    expect(chosen).toContain("in-stock");
    const none = sent("none");
    expect(none).not.toContain("category");
    expect(none).not.toContain("colour");
    expect(none).not.toContain("in-stock");
    expect(none).not.toContain("on-sale");
    // The chips: six, with “Clear all”, only where something is chosen.
    expect(slot(stateOf(container, "chosen"), "active-filter-chips")).not.toBeNull();
    expect(slot(stateOf(container, "none"), "active-filter-chips")).toBeNull();
  });
});

describe("FilterDrawer's stories, rendered", () => {
  it.each(LOCALES)(
    "draw each state's sheet open in its own box, named apart, in %s",
    async (locale) => {
      const container = await mount("organisms/filter-drawer", locale);
      const states = searchFilterOrganismStories["organisms/filter-drawer"].states ?? [];
      const names: string[] = [];
      for (const part of states) {
        const section = stateOf(container, part.id);
        const sheet = slot(section, "filter-drawer");
        expect(sheet, part.id).not.toBeNull();
        expect(box(section).contains(sheet), part.id).toBe(true);
        expect(sheet?.getAttribute("role"), part.id).toBe("dialog");
        names.push(nameOf(sheet as HTMLElement));
        expect(slots(section, "filter-drawer")).toHaveLength(1);
        expect(slot(section, "filter-drawer-trigger"), part.id).not.toBeNull();
      }
      expect(new Set(names).size).toBe(names.length);
      expect(slot(liveOf(container), "filter-drawer")).toBeNull();
      expect(slot(liveOf(container), "filter-drawer-trigger")).not.toBeNull();
      expect(duplicateIds(document)).toEqual([]);
    },
  );

  it.each(LOCALES)(
    "draw the foot each state has, and the button's badge, in %s",
    async (locale) => {
      const container = await mount("organisms/filter-drawer", locale);
      const submit = (id: string) =>
        slot(stateOf(container, id), "filter-drawer-submit")?.textContent;
      const show = (count: number) =>
        formatMessage(drawerWords(locale).show, { count }, lang(locale));
      expect(submit("chosen")).toBe(show(24));
      expect(submit("none")).toBe(show(24));
      expect(submit("zero")).toBe(show(0));
      // Clear all is a link to the listing without any filter, where something is chosen.
      for (const id of ["chosen", "zero", "long"]) {
        const clear = slot(stateOf(container, id), "filter-drawer-clear");
        expect(clear?.tagName, id).toBe("A");
        expect(clear?.getAttribute("href"), id).toBe(filters(locale).active?.clearHref);
      }
      expect(slot(stateOf(container, "none"), "filter-drawer-clear")).toBeNull();
      // The button behind says how many are chosen, as a badge and as words after its name.
      const badge = (id: string) => slot(stateOf(container, id), "filter-drawer-count");
      expect(badge("chosen")?.textContent).toBe("6");
      expect(badge("none")).toBeNull();
      const trigger = slot(stateOf(container, "chosen"), "filter-drawer-trigger");
      expect(trigger?.textContent).toContain(
        formatMessage(drawerWords(locale).chosen, { count: 6 }, lang(locale)),
      );
      // The body scrolls between the header and the foot, and the groups are in it.
      const sheet = slot(stateOf(container, "chosen"), "filter-drawer") as HTMLElement;
      expect(
        slot(sheet, "filter-drawer-body")?.querySelectorAll("button[aria-expanded]").length,
      ).toBe(4);
      expect(sheet.querySelectorAll("form")).toHaveLength(1);
      expect(sheet.querySelector("form")?.contains(slot(sheet, "filter-drawer-foot"))).toBe(true);
    },
  );

  it("sends the filters chosen and the listing's other parameters from the sheet's form", async () => {
    const container = await mount("organisms/filter-drawer", "en", ["chosen", "none"]);
    const keys = (id: string) => {
      const form = slot(stateOf(container, id), "filter-drawer")?.querySelector(
        "form",
      ) as HTMLFormElement;
      return [...new FormData(form).keys()];
    };
    expect(keys("chosen")).toContain("category");
    expect(keys("none")).not.toContain("category");
  });
});

describe("ProductToolbar's stories, rendered", () => {
  it.each(LOCALES)(
    "draw the bar's parts in order in the live render and every state, in %s",
    async (locale) => {
      const container = await mount("organisms/product-toolbar", locale);
      const states = searchFilterOrganismStories["organisms/product-toolbar"].states ?? [];
      for (const section of [
        liveOf(container),
        ...states.map((part) => stateOf(container, part.id)),
      ]) {
        const bar = slot(section, "product-toolbar") as HTMLElement;
        const order = [...bar.children].map((child) => child.getAttribute("data-slot"));
        const toggle = slot(bar, "product-toolbar-view") !== null;
        expect(order).toEqual([
          "product-toolbar-filters",
          "product-toolbar-count",
          ...(toggle ? ["product-toolbar-view"] : []),
          "sort-select",
        ]);
        // The filters button is the drawer's, closed.
        expect(slot(bar, "filter-drawer-trigger")).not.toBeNull();
        expect(slot(bar, "filter-drawer")).toBeNull();
      }
      expect(duplicateIds(document)).toEqual([]);
    },
  );

  it.each(LOCALES)(
    "mark the current view: grid in the live render, list where the state says so, in %s",
    async (locale) => {
      const container = await mount("organisms/product-toolbar", locale);
      const current = (section: HTMLElement) =>
        [
          ...section.querySelectorAll(
            '[data-slot="product-toolbar-view-link"][aria-current="true"]',
          ),
        ].map((link) => link.getAttribute("data-view"));
      expect(current(liveOf(container))).toEqual(["grid"]);
      expect(current(stateOf(container, "list"))).toEqual(["list"]);
      expect(current(stateOf(container, "no-view"))).toEqual([]);
      expect(slot(stateOf(container, "no-view"), "product-toolbar-view")).toBeNull();
    },
  );

  it.each(LOCALES)(
    "send the sort with the listing's filters and the view, in %s",
    async (locale) => {
      const container = await mount("organisms/product-toolbar", locale);
      const form = slot(liveOf(container), "sort-select") as HTMLFormElement;
      const data = new FormData(form);
      expect(data.get("sort")).toBe("relevance");
      expect(data.get("view")).toBe("grid");
      expect(data.getAll("category").length).toBeGreaterThan(0);
      const list = slot(stateOf(container, "list"), "sort-select") as HTMLFormElement;
      expect(new FormData(list).get("view")).toBe("list");
      const none = slot(stateOf(container, "no-view"), "sort-select") as HTMLFormElement;
      expect(new FormData(none).has("view")).toBe(false);
    },
  );
});
