// @vitest-environment happy-dom
// Ours (T37, SETUP.md "Listing organisms (T37)"). SearchFixture is the design system's stand-in for
// M3's search, so what it promises is tested: it answers after 250 ms and says it is loading until
// then, it finds the locale's products by title whatever the case and the accents, it shows six and
// counts them all, a newer question replaces the one on its way, an empty field goes back to the
// recent queries at once, and "Clear recent searches" empties them. The storefront's tests have no
// Testing Library, so the pragma above runs this file in happy-dom and the fixture is driven with
// react-dom and `act`. The dialog is drawn open (`defaultOpen`, `modal={false}`), as the states
// draw it; the clock is faked once it is open, because Base UI waits for animation frames to open.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchFixture, type SearchFixtureProps } from "./search-fixture";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const htmlLang = {
  en: "en-US",
  el: "el-CY",
  de: "de-DE",
  fr: "fr-CH",
} as const;

function propsOf(locale: Locale, more: Partial<SearchFixtureProps> = {}): SearchFixtureProps {
  const { listing, products } = commerceFixtures[locale];
  return {
    action: listing.search.idle.search.action,
    recent: listing.search.idle.recent,
    products,
    copy: catalogs[locale].organisms.searchOverlay,
    priceCopy: catalogs[locale].molecules.priceBlock,
    locale: htmlLang[locale],
    prefetch: false,
    defaultOpen: true,
    modal: false,
    ...more,
  };
}

const roots: { root: Root; container: HTMLElement }[] = [];

/** Mounts the fixture with its dialog open, and then the clock is the test's. */
async function mount(locale: Locale = "en", more?: Partial<SearchFixtureProps>) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });
  await act(async () => root.render(<SearchFixture {...propsOf(locale, more)} />));
  // Base UI opens a dialog on animation frames: let it, in real time, before the clock is faked.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  vi.useFakeTimers();
  return container;
}

afterEach(async () => {
  vi.useRealTimers();
  for (const { root, container } of roots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  document.body.innerHTML = "";
});

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const field = () =>
  document.querySelector<HTMLInputElement>('input[type="search"]') as HTMLInputElement;
const results = () => slot("search-overlay-results") as HTMLElement;
const mode = () => results().getAttribute("data-mode");
const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const optionTexts = () => options().map((option) => option.textContent ?? "");
/** The status region's words, without the word joiner Base UI adds so a repeat is announced. */
const status = () => (slot("search-overlay-status")?.textContent ?? "").replaceAll("⁠", "");
const submit = () => slot("search-overlay-submit");

/** Types into the field the way a keyboard does: the value changes, and React is told. */
async function type(text: string) {
  const input = field();
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setValue?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
/** Lets time pass on the faked clock. */
const wait = (milliseconds: number) => act(async () => void vi.advanceTimersByTime(milliseconds));
const click = (element: HTMLElement | null) => {
  if (element === null) throw new Error("nothing to click");
  return act(async () => element.click());
};

describe("SearchFixture: the recent queries", () => {
  it.each(LOCALES)("starts with the fixtures' recent queries, in %s", async (locale) => {
    await mount(locale);
    expect(mode()).toBe("recent");
    const recent = commerceFixtures[locale].listing.search.idle.recent;
    expect(recent.length).toBeGreaterThan(0);
    expect(optionTexts()).toEqual(recent);
    expect(submit()).toBeNull();
  });

  it("empties them with “Clear recent searches”, and the button goes with them", async () => {
    await mount("en");
    const clear = slot("search-overlay-clear-recent");
    expect(clear?.textContent).toBe("Clear recent searches");
    await click(clear);
    expect(options()).toEqual([]);
    expect(slot("search-overlay-clear-recent")).toBeNull();
    expect(mode()).toBe("recent");
  });

  it("puts a recent query in the field and asks for its results, as typing does", async () => {
    await mount("en");
    const [first] = options();
    await click(first ?? null);
    expect(field().value).toBe("linen shirt");
    expect(mode()).toBe("waiting");
    await wait(250);
    expect(mode()).toBe("empty");
  });

  it("starts from the recent queries it is given, and from none", async () => {
    await mount("en", { recent: ["tote"] });
    expect(optionTexts()).toEqual(["tote"]);
    await act(async () => roots.splice(0).forEach(({ root }) => root.unmount()));
    document.body.innerHTML = "";
    vi.useRealTimers();
    await mount("en", { recent: [] });
    expect(options()).toEqual([]);
    expect(slot("search-overlay-clear-recent")).toBeNull();
  });
});

describe("SearchFixture: the answer", () => {
  it("says it is loading for 250 ms and then answers", async () => {
    await mount("en");
    await type("hoodie");
    // Asked, not answered: the status says so, and the list is busy.
    expect(status()).toBe(catalogs.en.organisms.searchOverlay.loading);
    expect(mode()).toBe("waiting");
    expect(results().getAttribute("aria-busy")).toBe("true");
    expect(slot("search-overlay-loading")).not.toBeNull();
    await wait(249);
    expect(mode()).toBe("waiting");
    expect(options()).toEqual([]);
    await wait(1);
    expect(mode()).toBe("results");
    expect(results().hasAttribute("aria-busy")).toBe(false);
    expect(slot("search-overlay-loading")).toBeNull();
    expect(optionTexts().length).toBe(4);
    expect(status()).toBe("4 results");
    expect(submit()?.textContent).toBe("See all 4 results");
  });

  it("keeps the last answer on screen, busy, while the next one is on its way", async () => {
    await mount("en");
    await type("hoodie");
    await wait(250);
    const before = optionTexts();
    await type("hoodies");
    expect(mode()).toBe("results");
    expect(results().getAttribute("aria-busy")).toBe("true");
    expect(optionTexts()).toEqual(before);
    expect(status()).toBe(catalogs.en.organisms.searchOverlay.loading);
    expect(submit()).not.toBeNull();
    await wait(250);
    expect(mode()).toBe("empty");
    expect(results().hasAttribute("aria-busy")).toBe(false);
  });

  it("replaces a question on its way with the newer one: the older answer never lands", async () => {
    await mount("en");
    await type("ho");
    await wait(200);
    await type("canvas");
    // 250 ms after the first question, 50 after the second: nothing has been answered.
    await wait(50);
    expect(mode()).toBe("waiting");
    expect(options()).toEqual([]);
    await wait(199);
    expect(mode()).toBe("waiting");
    await wait(1);
    expect(optionTexts().length).toBe(1);
    expect(optionTexts()[0]).toContain("Canvas Tote Bag");
    // And the first question's timer is gone: nothing else lands later.
    await wait(1000);
    expect(optionTexts().length).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("answers after the delay it is given", async () => {
    await mount("en", { delay: 1000 });
    await type("hoodie");
    await wait(999);
    expect(mode()).toBe("waiting");
    await wait(1);
    expect(mode()).toBe("results");
  });

  it("goes back to the recent queries at once when the field is emptied, and asks nothing", async () => {
    await mount("en");
    await type("hoodie");
    await wait(250);
    expect(mode()).toBe("results");
    await type("");
    expect(mode()).toBe("recent");
    expect(results().hasAttribute("aria-busy")).toBe(false);
    expect(optionTexts()).toEqual(commerceFixtures.en.listing.search.idle.recent);
    expect(status()).toBe("");
    expect(submit()).toBeNull();
    // A question on its way when the field is emptied is dropped.
    await type("tote");
    await type("   ");
    expect(vi.getTimerCount()).toBe(0);
    await wait(500);
    expect(mode()).toBe("recent");
  });

  it("does not ask for a query of spaces", async () => {
    await mount("en");
    await type("   ");
    expect(vi.getTimerCount()).toBe(0);
    expect(mode()).toBe("recent");
  });

  it("draws the sentence for a query that finds nothing", async () => {
    await mount("en");
    await type("zzzz");
    await wait(250);
    expect(mode()).toBe("empty");
    expect(slot("search-overlay-empty")?.textContent).toContain("zzzz");
    expect(status()).toBe("No results");
    expect(submit()).toBeNull();
    expect(options()).toEqual([]);
  });

  it("drops its timer when it goes, so nothing answers a page that has gone", async () => {
    await mount("en");
    await type("hoodie");
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    const [{ root, container }] = roots.splice(0, 1) as [(typeof roots)[number]];
    await act(async () => root.unmount());
    container.remove();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("SearchFixture: the match", () => {
  // The typed text, and the indexes in the twelve cards of the titles it must find. Each is written
  // the way a reader would not: capitals, no accents, a different sigma.
  const cases: [Locale, string, number[]][] = [
    ["en", "HOODIE", [0, 1, 2, 3]],
    ["en", "cotton", [1, 4, 7]],
    ["de", "GEBURSTETEM", [2]],
    ["de", "gebürstetem", [2]],
    ["el", "καλτσεσ", [8]],
    ["el", "ΒΟΥΡΤΣΙΣΜΕΝΟ", [2]],
    ["fr", "MERINOS", [8, 11]],
    ["fr", "sweat a capuche", [0, 1, 2, 3]],
  ];

  it.each(cases)("finds %s %j by title: the cards %j", async (locale, typed, indexes) => {
    await mount(locale);
    await type(typed);
    await wait(250);
    const titles = commerceFixtures[locale].products.map((product) => product.title);
    expect(mode()).toBe("results");
    expect(optionTexts().length).toBe(indexes.length);
    indexes.forEach((index) => {
      expect(optionTexts().some((text) => text.includes(titles[index] ?? "never"))).toBe(true);
    });
    expect(status()).toBe(
      formatMessage(
        catalogs[locale].organisms.searchOverlay.status,
        { count: indexes.length },
        htmlLang[locale],
      ),
    );
    expect(submit()).not.toBeNull();
  });

  it("matches inside the title, not only at its start, and ignores the spaces around the query", async () => {
    await mount("en");
    await type("  tote ");
    await wait(250);
    expect(optionTexts().length).toBe(1);
    expect(optionTexts()[0]).toContain("Canvas Tote Bag");
  });

  it("shows the first six matches and counts them all", async () => {
    await mount("en");
    // Eleven of the twelve titles have an e.
    await type("e");
    await wait(250);
    expect(optionTexts().length).toBe(6);
    expect(status()).toBe("11 results");
    expect(submit()?.textContent).toBe("See all 11 results");
    // The first six, in the cards' order.
    const titles = commerceFixtures.en.products.map((product) => product.title);
    titles.slice(0, 6).forEach((title, index) => {
      expect(optionTexts()[index]).toContain(title);
    });
  });

  it("answers with no category and no suggestion: only the products", async () => {
    await mount("en");
    await type("hoodie");
    await wait(250);
    expect(slot("search-overlay-results")?.textContent).not.toContain(
      catalogs.en.organisms.searchOverlay.categories,
    );
    expect(slot("search-overlay-results")?.textContent).not.toContain(
      catalogs.en.organisms.searchOverlay.suggestions,
    );
    expect(options().every((option) => option.tagName === "A")).toBe(true);
  });

  it("links each product to its page", async () => {
    await mount("en");
    await type("canvas");
    await wait(250);
    const [link] = options();
    const canvas = commerceFixtures.en.products.find(
      (product) => product.title === "Canvas Tote Bag",
    );
    expect(link?.getAttribute("href")).toBe(canvas?.href);
  });
});

describe("SearchFixture: the form", () => {
  it.each(LOCALES)("GETs the search page with the query as q, in %s", async (locale) => {
    await mount(locale);
    await type("tote");
    const form = field().closest("form") as HTMLFormElement;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe(
      commerceFixtures[locale].listing.search.idle.search.action,
    );
    expect(new FormData(form).getAll("q")).toEqual(["tote"]);
  });
});

describe("the file", () => {
  const source = readFileSync(path.join(import.meta.dirname, "search-fixture.tsx"), "utf8");

  it("is a client component that imports no fixtures and no catalog: they arrive as props", () => {
    expect(source.trimStart().startsWith('"use client";')).toBe(true);
    const specifiers = [
      ...source.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms),
    ].map((match) => match[1]);
    expect(specifiers).not.toContain("@shopblok/fixtures");
    expect(specifiers).not.toContain("@shopblok/i18n");
    expect(specifiers).toContain("@shopblok/ui/organisms/search-overlay");
  });
});
