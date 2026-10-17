import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatNumber, LOCALES, type Locale } from "@shopblok/i18n";
import {
  Breadcrumbs,
  EmptyStateContent,
  Href,
  PageState,
  SearchQuery,
  SortState,
} from "@shopblok/registry/contracts";
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { listingMoleculeStories } from "./molecules-listing";

// The listing molecules' stories (T33; D40): the states the plan lists are there, each one shows
// what its description says in every locale, what each story hands a molecule is what the
// molecule's contract accepts, and a story passes a server component only what one can take.

type Id = keyof typeof listingMoleculeStories;
type Props = Record<string, unknown>;

const story = (id: Id) => listingMoleculeStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
/** The markup as text: React's escapes undone, and no-break spaces (Intl's, the catalogs') plain. */
const plain = (text: string) =>
  text
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replace(/\s/g, " ");
const html = (id: Id, stateId: string, locale: Locale) =>
  plain(renderToStaticMarkup(state(id, stateId).render(createContext(locale))));
/** The props of the element a story returns: the molecule's own. */
const propsOf = (node: ReactNode): Props => {
  if (!isValidElement<Props>(node)) throw new Error("a story must return an element");
  return node.props;
};
const stateProps = (id: Id, stateId: string, locale: Locale = "en") =>
  propsOf(state(id, stateId).render(createContext(locale)));
/** Every node a story draws: the live render, then each state in order. */
const rendered = (id: Id, locale: Locale = "en") => {
  const ctx = createContext(locale);
  const { live, states = [] } = story(id);
  return [live(ctx), ...states.map((each) => each.render(ctx))];
};
const fixtures = (locale: Locale) => commerceFixtures[locale];
const catalog = (locale: Locale) => catalogs[locale].molecules;
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const count = (markup: string, needle: string) => markup.split(needle).length - 1;
/** The path a market's links start with: none for el-cy. */
const prefix = (locale: Locale) => fixtures(locale).prefix;

describe("the listing molecules' stories", () => {
  it("are one for each of the five entries, each with a summary and a11y notes", () => {
    expect(Object.keys(listingMoleculeStories).sort()).toEqual([
      "molecules/breadcrumbs",
      "molecules/empty-state",
      "molecules/pagination",
      "molecules/search-field",
      "molecules/sort-select",
    ]);
    for (const [id, each] of Object.entries(listingMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("have the states the plan lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids("molecules/search-field")).toEqual(["empty", "query", "long-query", "long-label"]);
    expect(ids("molecules/breadcrumbs")).toEqual(["product", "category", "top", "long"]);
    expect(ids("molecules/pagination")).toEqual([
      "first",
      "middle",
      "last",
      "few",
      "large-numbers",
      "long-label",
    ]);
    expect(ids("molecules/sort-select")).toEqual(["default", "price", "no-filters", "long-label"]);
    expect(ids("molecules/empty-state")).toEqual([
      "filters",
      "search",
      "category",
      "no-icon",
      "title-only",
      "heading-level",
      "long",
    ]);
  });

  it("name every state once: no two share an id or a label in an entry", () => {
    for (const [id, each] of Object.entries(listingMoleculeStories)) {
      const states: readonly { id: string; label: string }[] = each.states ?? [];
      expect(new Set(states.map((part) => part.id)).size, `${id} ids`).toBe(states.length);
      expect(new Set(states.map((part) => part.label)).size, `${id} labels`).toBe(states.length);
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(listingMoleculeStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(100);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
      }
    }
  });

  it("give the same page no id twice, in every state side by side", () => {
    for (const locale of LOCALES) {
      for (const id of Object.keys(listingMoleculeStories) as Id[]) {
        // One tree, as the page draws it: `useId` numbers its ids across the whole render.
        const markup = renderToStaticMarkup(
          <>
            {rendered(id, locale).map((node, index) => (
              <div key={index}>{node}</div>
            ))}
          </>,
        );
        const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
        expect(
          ids.filter((each, index) => ids.indexOf(each) !== index),
          `${id} ${locale}`,
        ).toEqual([]);
      }
    }
  });
});

describe("what the stories hand the molecules", () => {
  const issues = (
    result:
      | { success: true }
      | {
          success: false;
          error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
        },
  ) =>
    result.success
      ? []
      : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);

  /** Each molecule's props, cut to the contract it takes (registry/entries/molecules.ts). */
  const parsed: Record<Id, (props: Props) => string[]> = {
    "molecules/search-field": ({ action, query }) =>
      issues(SearchQuery.safeParse({ action, query })),
    "molecules/breadcrumbs": ({ trail, current }) =>
      issues(Breadcrumbs.safeParse({ trail, current })),
    "molecules/pagination": ({ page, pageCount }) =>
      issues(PageState.safeParse({ page, pageCount })),
    "molecules/sort-select": ({ action, name, options, selected, params }) =>
      issues(SortState.safeParse({ action, name, options, selected, params })),
    "molecules/empty-state": ({ title, text, action }) =>
      issues(EmptyStateContent.safeParse({ title, text, action })),
  };

  it.each(LOCALES)("are values their contracts accept, in %s", (locale) => {
    for (const id of Object.keys(listingMoleculeStories) as Id[]) {
      for (const node of rendered(id, locale)) {
        expect(parsed[id](propsOf(node)), `${id} ${locale}`).toEqual([]);
      }
    }
  });

  it("pass a server component only what it can take: data, and for two props a function", () => {
    // Pagination's `hrefFor` and EmptyState's `icon` are functions that stay on the server, where
    // all five molecules run; everything else is plain data, so no story needs a client boundary.
    const allowed: Partial<Record<Id, string[]>> = {
      "molecules/pagination": ["hrefFor"],
      "molecules/empty-state": ["icon"],
    };
    for (const id of Object.keys(listingMoleculeStories) as Id[]) {
      for (const node of rendered(id)) {
        const data = Object.fromEntries(
          Object.entries(propsOf(node)).filter(([name]) => !(allowed[id] ?? []).includes(name)),
        );
        expect(JSON.parse(JSON.stringify(data)), id).toEqual(data);
      }
    }
  });

  it("send every link and form to the market's own paths", () => {
    for (const locale of LOCALES) {
      const root = prefix(locale);
      expect(stateProps("molecules/search-field", "query", locale).action).toBe(`${root}/search`);
      expect(stateProps("molecules/sort-select", "default", locale).action).toBe(`${root}/store`);
      const hrefFor = stateProps("molecules/pagination", "middle", locale).hrefFor as (
        page: number,
      ) => string;
      for (const page of [1, 2, 20]) {
        expect(hrefFor(page).startsWith(`${root}/store`), `${locale} ${page}`).toBe(true);
        expect(Href.safeParse(hrefFor(page)).success, `${locale} ${page}`).toBe(true);
      }
    }
  });
});

describe("SearchField's states", () => {
  const id = "molecules/search-field";
  const value = (markup: string) => markup.match(/<input [^>]*\bvalue="([^"]*)"/)?.[1];

  it.each(LOCALES)("start from the query each one names, in %s", (locale) => {
    expect(value(html(id, "empty", locale))).toBe("");
    expect(value(html(id, "query", locale))).toBe(fixtures(locale).search.query);
    expect(plain(value(html(id, "long-query", locale)) ?? "")).toBe(
      createContext(locale).fixture.long.productName,
    );
  });

  it.each(LOCALES)("name the field and the landmark in the catalog's words, in %s", (locale) => {
    const copy = catalog(locale).searchField;
    const markup = html(id, "empty", locale);
    expect(markup).toContain(`aria-label="${plain(copy.label)}"`);
    expect(count(markup, `aria-label="${plain(copy.label)}"`)).toBe(2);
    expect(markup).toContain(`placeholder="${plain(copy.placeholder)}"`);
    expect(markup).toContain(`>${plain(copy.submit)}</button>`);
    // The clear button waits for hydration, so the server markup has none.
    expect(markup).not.toContain(plain(copy.clear));
  });

  it("puts the long strings in the label, the placeholder and the button", () => {
    for (const locale of ["de", "el"] as const) {
      const { long } = createContext(locale).fixture;
      const markup = html(id, "long-label", locale);
      expect(markup).toContain(`aria-label="${plain(long.fieldLabel)}"`);
      expect(markup).toContain(`placeholder="${plain(long.placeholder)}"`);
      expect(markup).toContain(`>${plain(long.action)}</button>`);
    }
  });

  it("marks the input data-truncate, so a long query is not a clipping finding", () => {
    expect(html(id, "long-query", "en")).toMatch(/<input [^>]*data-truncate=""/);
  });
});

describe("Breadcrumbs' states", () => {
  const id = "molecules/breadcrumbs";
  const trailOf = (stateId: string, locale: Locale = "en") =>
    stateProps(id, stateId, locale).trail as { label: string; href: string }[];

  it.each(LOCALES)("draw the trail each one names, ending in the current page, in %s", (locale) => {
    const product = fixtures(locale).product;
    expect(trailOf("product", locale).map((step) => step.label)).toEqual(
      product.breadcrumbs.map((step) => step.label),
    );
    expect(stateProps(id, "product", locale).current).toBe(product.title);
    const markup = html(id, "product", locale);
    expect(markup).toContain('aria-current="page"');
    expect(count(markup, 'aria-current="page"')).toBe(1);
    expect(markup).toContain(`aria-label="${plain(catalog(locale).breadcrumbs.label)}"`);
  });

  it("collapses the middle of a long trail and only that", () => {
    const more = catalog("en").breadcrumbs.more;
    expect(html(id, "product", "en")).toContain(more);
    expect(html(id, "long", "en")).toContain(more);
    expect(html(id, "category", "en")).not.toContain(more);
    expect(html(id, "top", "en")).not.toContain(more);
    expect(trailOf("category")).toHaveLength(3);
    expect(trailOf("top")).toHaveLength(1);
  });

  it("makes the category page's last step its current page", () => {
    const hoodies = fixtures("en").product.breadcrumbs[3]!.label;
    expect(stateProps(id, "category").current).toBe(hoodies);
    expect(html(id, "category", "en")).toContain(`>${hoodies}</span>`);
  });

  it.each(["de", "el"] as const)("carries every long name, wrapped, in %s", (locale) => {
    const { linkLabel, chipLabel, badge, productName } = createContext(locale).fixture.long;
    const markup = html(id, "long", locale);
    for (const name of [linkLabel, chipLabel, badge, productName])
      expect(markup).toContain(plain(name));
    expect(markup).toContain("wrap-anywhere");
    // The steps keep the product's own addresses, under the market's prefix.
    expect(trailOf("long", locale).map((step) => step.href)).toEqual(
      fixtures(locale).product.breadcrumbs.map((step) => step.href),
    );
  });
});

describe("Pagination's states", () => {
  const id = "molecules/pagination";
  const hrefFor = (stateId: string, locale: Locale = "en") =>
    stateProps(id, stateId, locale).hrefFor as (page: number) => string;

  it("leaves Previous out on the first page and Next out on the last", () => {
    expect(html(id, "first", "en")).not.toContain('rel="prev"');
    expect(html(id, "first", "en")).toContain('rel="next"');
    expect(html(id, "last", "en")).toContain('rel="prev"');
    expect(html(id, "last", "en")).not.toContain('rel="next"');
    for (const stateId of ["middle", "few", "large-numbers"]) {
      expect(html(id, stateId, "en"), stateId).toContain('rel="prev"');
      expect(html(id, stateId, "en"), stateId).toContain('rel="next"');
    }
  });

  it.each(LOCALES)(
    "names the current page and the others in the catalog's words, in %s",
    (locale) => {
      const copy = catalog(locale).pagination;
      const lang = htmlLang(locale);
      const middle = html(id, "middle", locale);
      expect(count(middle, 'aria-current="page"')).toBe(1);
      expect(middle).toContain(
        `aria-label="${plain(formatMessage(copy.current, { page: 10, pageCount: 20 }, lang))}"`,
      );
      expect(middle).toContain(
        `aria-label="${plain(formatMessage(copy.page, { page: 9 }, lang))}"`,
      );
      expect(middle).toContain(`aria-label="${plain(copy.label)}"`);
    },
  );

  it("draws an ellipsis for a gap, and none when every page has a link", () => {
    const more = catalog("en").pagination.more;
    // Page 10 of 20 has a gap on each side of the current page.
    expect(count(html(id, "middle", "en"), `>${more}<`)).toBe(2);
    expect(html(id, "few", "en")).not.toContain(more);
    // Previous, the five pages and Next.
    expect(count(html(id, "few", "en"), 'data-slot="pagination-link"')).toBe(7);
  });

  it("keeps the filters in every address and puts the page last, the first page without one", () => {
    for (const locale of LOCALES) {
      const first = hrefFor("middle", locale)(1);
      const third = hrefFor("middle", locale)(3);
      expect(first, locale).not.toContain("page=");
      expect(first, locale).toContain("?");
      expect(third.startsWith(first), locale).toBe(true);
      expect(third.endsWith("&page=3"), locale).toBe(true);
      expect(new URLSearchParams(third.split("?")[1]).getAll("page")).toEqual(["3"]);
    }
  });

  it.each(LOCALES)("writes four-digit pages with the market's grouping, in %s", (locale) => {
    const markup = html(id, "large-numbers", locale);
    expect(markup).toContain(`>${plain(formatNumber(1284, htmlLang(locale)))}<`);
    expect(markup).toContain(`>${plain(formatNumber(2500, htmlLang(locale)))}<`);
  });

  it("wraps the long Previous and Next, in the page's order", () => {
    for (const locale of ["de", "el"] as const) {
      const { action, linkLabel } = createContext(locale).fixture.long;
      const markup = html(id, "long-label", locale);
      expect(markup).toContain(`>${plain(action)}</span>`);
      expect(markup).toContain(`>${plain(linkLabel)}</span>`);
      expect(markup.indexOf(plain(action))).toBeLessThan(markup.indexOf(plain(linkLabel)));
    }
  });
});

describe("SortSelect's states", () => {
  const id = "molecules/sort-select";
  const hidden = (markup: string) =>
    [...markup.matchAll(/<input type="hidden" name="([^"]*)" value="([^"]*)"/g)].map(
      (match) => [match[1], match[2]] as const,
    );
  const options = (markup: string) =>
    [...markup.matchAll(/<option [^>]*?\bvalue="([^"]*)"([^>]*)>([^<]*)<\/option>/g)].map(
      (match) => ({
        value: match[1],
        selected: match[2]?.includes("selected") ?? false,
        label: match[3],
      }),
    );

  it.each(LOCALES)("lists the four sorts in the catalog's words, in %s", (locale) => {
    const words = catalog(locale).sortSelect.options;
    expect(options(html(id, "default", locale)).map((each) => [each.value, each.label])).toEqual([
      ["relevance", plain(words.relevance)],
      ["newest", plain(words.newest)],
      ["price-asc", plain(words.priceAsc)],
      ["price-desc", plain(words.priceDesc)],
    ]);
    expect(html(id, "default", locale)).toContain(
      `>${plain(catalog(locale).sortSelect.apply)}</button>`,
    );
  });

  it("chooses the sort each state names", () => {
    const chosen = (stateId: string) =>
      options(html(id, stateId, "en"))
        .filter((each) => each.selected)
        .map((each) => each.value);
    expect(chosen("default")).toEqual(["relevance"]);
    expect(chosen("price")).toEqual(["price-desc"]);
    expect(chosen("no-filters")).toEqual(["newest"]);
    expect(chosen("long-label")).toEqual(["price-asc"]);
  });

  it.each(LOCALES)(
    "keeps the chosen filters as hidden inputs, and never the page, in %s",
    (locale) => {
      const sent = hidden(html(id, "default", locale));
      const { facets } = fixtures(locale);
      expect(sent.length).toBeGreaterThan(3);
      // The parameters are the facets' own: a range adds .min and .max, a switch that is on adds =1.
      const names = new Set(facets.map((facet) => facet.id));
      for (const [name] of sent)
        expect(names.has(name!.replace(/\.(min|max)$/, "")), name).toBe(true);
      expect(sent.map(([name]) => name)).not.toContain("page");
      expect(sent.map(([name]) => name)).not.toContain("sort");
      // The same list is in the pagination's addresses.
      const href = (
        stateProps("molecules/pagination", "middle", locale).hrefFor as (page: number) => string
      )(1);
      expect([...new URLSearchParams(href.split("?")[1])]).toEqual(sent.map(([n, v]) => [n, v]));
    },
  );

  it("has no hidden input for a listing with no filter", () => {
    expect(hidden(html(id, "no-filters", "en"))).toEqual([]);
  });

  it("is a GET form to the listing, with the select named by its label", () => {
    const markup = html(id, "default", "en");
    const form = markup.match(/<form [^>]*>/)?.[0] ?? "";
    expect(form).toContain(`action="${prefix("en")}/store"`);
    expect(form).toContain('method="get"');
    const select = markup.match(/<select [^>]*>/)?.[0] ?? "";
    expect(select).toContain('name="sort"');
    const selectId = select.match(/ id="([^"]+)"/)?.[1];
    expect(markup).toContain(`for="${selectId}"`);
  });

  it.each(["de", "el"] as const)(
    "puts the long strings in the label, options and button, in %s",
    (locale) => {
      const { optionLabel, hint, toggleLabel, badge, fieldLabel, action } =
        createContext(locale).fixture.long;
      const markup = html(id, "long-label", locale);
      for (const text of [optionLabel, hint, toggleLabel, badge, fieldLabel, action])
        expect(markup, text).toContain(plain(text));
    },
  );
});

describe("EmptyState's states", () => {
  const id = "molecules/empty-state";

  it.each(LOCALES)("draws the three samples in their own words, in %s", (locale) => {
    const { filters, search, category } = fixtures(locale).emptyStates;
    expect(html(id, "filters", locale)).toContain(`>${plain(filters.title)}</h2>`);
    expect(html(id, "filters", locale)).toContain(plain(filters.text ?? ""));
    expect(html(id, "search", locale)).toContain(plain(search.title));
    expect(html(id, "category", locale)).toContain(plain(category.title));
    expect(html(id, "category", locale)).toContain(plain(category.text ?? ""));
  });

  it("gives the two samples that have a way on a link drawn as a button, and the third none", () => {
    for (const locale of LOCALES) {
      const { filters, search } = fixtures(locale).emptyStates;
      for (const [stateId, sample] of [
        ["filters", filters],
        ["search", search],
      ] as const) {
        const markup = html(id, stateId, locale);
        expect(markup, stateId).toContain(`href="${sample.action?.href}"`);
        expect(markup, stateId).toContain('data-slot="empty-state-action"');
        expect(markup, stateId).not.toContain('role="button"');
      }
      expect(html(id, "category", locale)).not.toContain("empty-state-action");
    }
  });

  it("never prefetches an action: its sample page does not exist before M3", () => {
    for (const node of rendered(id)) expect(propsOf(node).prefetch).toBe(false);
  });

  it("draws an icon where the state has one, and not where it has none", () => {
    for (const stateId of ["filters", "search", "category", "heading-level", "long"])
      expect(html(id, stateId, "en"), stateId).toContain('data-slot="empty-state-icon"');
    for (const stateId of ["no-icon", "title-only"])
      expect(html(id, stateId, "en"), stateId).not.toContain("empty-state-icon");
    // Three samples, three drawings.
    const drawing = (stateId: string) => html(id, stateId, "en").match(/<svg[^>]*>.*?<\/svg>/)?.[0];
    expect(new Set(["filters", "search", "category"].map(drawing)).size).toBe(3);
  });

  it("draws the title alone for a title-only state", () => {
    const markup = html(id, "title-only", "en");
    expect(markup).toContain("<h2");
    expect(markup).not.toContain("<p");
    expect(markup).not.toContain("<a ");
  });

  it("puts the title at the level the state names", () => {
    expect(html(id, "heading-level", "en")).toMatch(/<h3[^>]*>/);
    expect(html(id, "heading-level", "en")).not.toContain("<h2");
    expect(html(id, "filters", "en")).toMatch(/<h2[^>]*>/);
  });

  it.each(["de", "el"] as const)("carries the long title, text and action, in %s", (locale) => {
    const { productName, productDescription, action } = createContext(locale).fixture.long;
    const markup = html(id, "long", locale);
    for (const text of [productName, productDescription, action])
      expect(markup, text).toContain(plain(text));
    expect(markup).toContain("wrap-anywhere");
    // The action still goes to the way out, under the market's prefix.
    expect(markup).toContain(`href="${prefix(locale)}/categories/women/clothing/hoodies"`);
  });
});
