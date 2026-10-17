import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { ActiveFilters, FacetGroup, Href } from "@shopblok/registry/contracts";
import { ActiveFilterChips } from "@shopblok/ui/molecules/active-filter-chips";
import { FilterGroup } from "@shopblok/ui/molecules/filter-group";
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { filterMoleculeStories } from "./molecules-filters";

// The filter molecules' stories (T33; D40): the states the plan lists are there, each one shows what
// its description says in every locale, what each story hands a molecule is what its contract
// accepts and plain data (a story renders on the server), and the ids of the states side by side
// never collide.

type Id = keyof typeof filterMoleculeStories;
type Props = Record<string, unknown>;

const GROUP = "molecules/filter-group" satisfies Id;
const CHIPS = "molecules/active-filter-chips" satisfies Id;

const story = (id: Id) => filterMoleculeStories[id];
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
/** Every node a story draws: the live render, then each state in order. */
const rendered = (id: Id, locale: Locale = "en") => {
  const ctx = createContext(locale);
  const { live, states = [] } = story(id);
  return [live(ctx), ...states.map((each) => each.render(ctx))];
};
const catalog = (locale: Locale) => catalogs[locale].molecules;
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const fixtures = (locale: Locale) => commerceFixtures[locale];

/** The props of every element of `type` in a story's tree: the molecule's own. */
function propsOf(node: ReactNode, type: unknown): Props[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = node.type === type ? [node.props as Props] : [];
  return [
    ...own,
    ...Children.toArray(node.props.children).flatMap((child) => propsOf(child, type)),
  ];
}
/** The one molecule element of a state. */
function only(id: Id, stateId: string, locale: Locale = "en"): Props {
  const type = id === GROUP ? FilterGroup : ActiveFilterChips;
  const found = propsOf(state(id, stateId).render(createContext(locale)), type);
  if (found.length !== 1) throw new Error(`${id} ${stateId} draws ${found.length} molecules`);
  return found[0] as Props;
}

/** The `<input …>` tags of a markup that carry this name. */
const inputs = (markup: string, name: string) =>
  [...markup.matchAll(/<input\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => tag.includes(` name="${name}"`));
const valueOf = (tag: string) => tag.match(/ value="([^"]*)"/)?.[1];
const chosen = (markup: string, name: string) =>
  inputs(markup, name)
    .filter((tag) => / checked=""/.test(tag))
    .map(valueOf);
const disabled = (markup: string, name: string) =>
  inputs(markup, name)
    .filter((tag) => / disabled=""/.test(tag))
    .map(valueOf);
const count = (markup: string, needle: string) => markup.split(needle).length - 1;

describe("the filter molecules' stories", () => {
  it("are one for each of the two entries, each with a summary and a11y notes", () => {
    expect(Object.keys(filterMoleculeStories).sort()).toEqual([CHIPS, GROUP]);
    for (const [id, each] of Object.entries(filterMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("have the states the plan lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(GROUP)).toEqual([
      "checkbox",
      "show-more",
      "show-more-open",
      "zero-count",
      "swatch",
      "swatch-open",
      "swatch-zero",
      "swatch-image",
      "range",
      "range-untouched",
      "range-one-price",
      "toggle",
      "toggle-off",
      "toggle-zero",
      "hidden-legend",
      "long",
      "long-swatch",
      "long-toggle",
      "long-range",
    ]);
    expect(ids(CHIPS)).toEqual(["default", "one", "on-off", "many", "long"]);
  });

  it("name every state once: no two share an id or a label in an entry", () => {
    for (const [id, each] of Object.entries(filterMoleculeStories)) {
      const states: readonly { id: string; label: string }[] = each.states ?? [];
      expect(new Set(states.map((part) => part.id)).size, `${id} ids`).toBe(states.length);
      expect(new Set(states.map((part) => part.label)).size, `${id} labels`).toBe(states.length);
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(filterMoleculeStories)) {
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
      for (const id of Object.keys(filterMoleculeStories) as Id[]) {
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

  it("put every group in a GET form of its own, and never a group in a group", () => {
    for (const locale of LOCALES) {
      for (const part of story(GROUP).states ?? []) {
        const markup = renderToStaticMarkup(part.render(createContext(locale)));
        expect(count(markup, "<form "), part.id).toBe(1);
        expect(markup, part.id).toMatch(/<form [^>]*method="get"/);
        expect(count(markup, 'data-slot="filter-group"'), part.id).toBe(1);
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

  it.each(LOCALES)("are values their contracts accept, in %s", (locale) => {
    for (const node of rendered(GROUP, locale)) {
      const groups = propsOf(node, FilterGroup);
      expect(groups.length).toBeGreaterThan(0);
      for (const props of groups) {
        expect(issues(FacetGroup.safeParse(props.facet)), `${locale}`).toEqual([]);
      }
    }
    for (const node of rendered(CHIPS, locale)) {
      const lists = propsOf(node, ActiveFilterChips);
      expect(lists).toHaveLength(1);
      expect(issues(ActiveFilters.safeParse(lists[0]?.active)), `${locale}`).toEqual([]);
    }
  });

  it("pass a server component plain data only, and every link no prefetch", () => {
    for (const id of [GROUP, CHIPS] as const) {
      const type = id === GROUP ? FilterGroup : ActiveFilterChips;
      for (const node of rendered(id)) {
        for (const props of propsOf(node, type)) {
          expect(JSON.parse(JSON.stringify(props)), id).toEqual(props);
        }
      }
    }
    for (const node of rendered(CHIPS)) {
      for (const props of propsOf(node, ActiveFilterChips)) expect(props.prefetch).toBe(false);
    }
  });

  it.each(LOCALES)("take the locale's words and its market's lang, in %s", (locale) => {
    for (const node of rendered(GROUP, locale)) {
      for (const props of propsOf(node, FilterGroup)) {
        expect(props.locale).toBe(htmlLang(locale));
        expect(Object.keys(props.copy as Props)).toEqual(Object.keys(catalog(locale).filterGroup));
      }
    }
    for (const node of rendered(CHIPS, locale)) {
      for (const props of propsOf(node, ActiveFilterChips)) {
        expect(props.locale).toBe(htmlLang(locale));
        expect(props.copy).toEqual(catalog(locale).activeFilterChips);
      }
    }
  });

  it("send every chip's links to the market's own listing", () => {
    for (const locale of LOCALES) {
      const root = `${fixtures(locale).prefix}/store`;
      for (const node of rendered(CHIPS, locale)) {
        for (const props of propsOf(node, ActiveFilterChips)) {
          const { filters, clearHref } = props.active as ActiveFilters;
          expect(clearHref).toBe(root);
          for (const filter of filters) {
            expect(filter.removeHref.startsWith(root), `${locale} ${filter.id}`).toBe(true);
            expect(Href.safeParse(filter.removeHref).success, `${locale} ${filter.id}`).toBe(true);
          }
        }
      }
    }
  });
});

describe("FilterGroup's states", () => {
  describe("checkbox groups", () => {
    it.each(LOCALES)("draw one named fieldset and a box per option, M chosen, in %s", (locale) => {
      const size = fixtures(locale).facets.find((facet) => facet.id === "size");
      const markup = html(GROUP, "checkbox", locale);
      expect(markup).toMatch(/<fieldset\b/);
      expect(markup).toContain(`>${size?.label}</legend>`);
      expect(inputs(markup, "size")).toHaveLength(6);
      expect(chosen(markup, "size")).toEqual(["m"]);
      expect(disabled(markup, "size")).toEqual([]);
      expect(count(markup, 'role="checkbox"')).toBe(6);
    });

    it("keep the last two categories behind a closed disclosure, whose boxes are still in the form", () => {
      for (const locale of LOCALES) {
        const markup = html(GROUP, "show-more", locale);
        expect(count(markup, "<details"), locale).toBe(1);
        expect(markup, locale).not.toMatch(/<details [^>]*\bopen=/);
        expect(inputs(markup, "category"), locale).toHaveLength(8);
        const words = formatMessage(
          catalog(locale).filterGroup.showMore,
          { count: 2 },
          htmlLang(locale),
        );
        expect(markup, locale).toContain(plain(words));
        expect(chosen(markup, "category"), locale).toEqual(["hoodies"]);
      }
    });

    it("open the disclosure when a category behind it is chosen", () => {
      const markup = html(GROUP, "show-more-open", "en");
      expect(markup).toMatch(/<details [^>]*\bopen=""/);
      expect(chosen(markup, "category")).toEqual(["hoodies", "ankle-socks"]);
    });

    it("disable the empty options that are not chosen, and not the chosen one", () => {
      const markup = html(GROUP, "zero-count", "en");
      expect(disabled(markup, "size")).toEqual(["xs", "xxl"]);
      expect(chosen(markup, "size")).toEqual(["m"]);
      expect(markup).toContain(", 0 products");
    });

    it("keeps the legend for a screen reader and off the screen with hideLegend", () => {
      expect(html(GROUP, "hidden-legend", "en")).toMatch(/<legend [^>]*class="[^"]*\bsr-only\b/);
      expect(html(GROUP, "checkbox", "en")).not.toMatch(/<legend [^>]*class="[^"]*\bsr-only\b/);
      expect(only(GROUP, "hidden-legend").hideLegend).toBe(true);
    });
  });

  describe("swatch groups", () => {
    it.each(LOCALES)("draw a checkbox swatch per colour, two chosen, in %s", (locale) => {
      const markup = html(GROUP, "swatch", locale);
      expect(count(markup, 'data-slot="swatch"')).toBe(8);
      expect(count(markup, 'role="checkbox"')).toBe(8);
      expect(markup).not.toContain("aria-pressed");
      expect(inputs(markup, "colour")).toHaveLength(8);
      expect(chosen(markup, "colour")).toEqual(["black", "forest"]);
      // Two colours are behind Show more, closed.
      expect(count(markup, "<details")).toBe(1);
      expect(markup).not.toMatch(/<details [^>]*\bopen=/);
    });

    it("open the disclosure for a chosen colour behind it", () => {
      const markup = html(GROUP, "swatch-open", "en");
      expect(markup).toMatch(/<details [^>]*\bopen=""/);
      expect(chosen(markup, "colour")).toEqual(["black", "forest", "sky"]);
    });

    it("disable an empty colour that is not chosen, and not a chosen one", () => {
      const markup = html(GROUP, "swatch-zero", "en");
      expect(disabled(markup, "colour")).toEqual(["white"]);
      expect(chosen(markup, "colour")).toEqual(["black", "forest"]);
    });

    it("draw two colours as pictures", () => {
      const markup = html(GROUP, "swatch-image", "en");
      expect(count(markup, "<img")).toBe(2);
      expect(inputs(markup, "colour")).toHaveLength(8);
    });
  });

  describe("range groups", () => {
    it.each(LOCALES)("send the chosen range in the market's currency, in %s", (locale) => {
      const price = fixtures(locale).facets.find((facet) => facet.id === "price");
      if (price?.kind !== "range" || price.selected === undefined) throw new Error("no range");
      const markup = html(GROUP, "range", locale);
      const [min, max] = [inputs(markup, "price.min")[0], inputs(markup, "price.max")[0]];
      expect(valueOf(min ?? "")).toBe(String(price.selected.min));
      expect(valueOf(max ?? "")).toBe(String(price.selected.max));
      const words = catalog(locale).filterGroup;
      expect(markup).toContain(`>${plain(words.minimum)}</label>`);
      expect(markup).toContain(`>${plain(words.maximum)}</label>`);
      expect(markup).toContain('data-slot="slider"');
      expect(markup).toContain(`max="${price.max}"`);
    });

    it("leave the fields empty for a range nobody has chosen", () => {
      const markup = html(GROUP, "range-untouched", "en");
      expect(valueOf(inputs(markup, "price.min")[0] ?? "")).toBe("");
      expect(valueOf(inputs(markup, "price.max")[0] ?? "")).toBe("");
    });

    it("leave the slider out when every product costs the same", () => {
      const markup = html(GROUP, "range-one-price", "en");
      expect(markup).not.toContain('data-slot="slider"');
      expect(inputs(markup, "price.min")).toHaveLength(1);
      expect(inputs(markup, "price.max")).toHaveLength(1);
      expect(markup).toContain("Prices from $49.00 to $49.00");
    });
  });

  describe("switches", () => {
    it.each(LOCALES)("are a switch with no fieldset, on for in stock, in %s", (locale) => {
      const markup = html(GROUP, "toggle", locale);
      expect(markup).not.toMatch(/<fieldset\b/);
      expect(markup).toContain('role="switch"');
      expect(markup).toContain('aria-checked="true"');
      expect(chosen(markup, "in-stock")).toEqual(["1"]);
    });

    it("sends nothing for a switch that is off, and cannot turn on one with nothing left", () => {
      const off = html(GROUP, "toggle-off", "en");
      expect(off).toContain('aria-checked="false"');
      expect(chosen(off, "on-sale")).toEqual([]);
      expect(disabled(off, "on-sale")).toEqual([]);
      const none = html(GROUP, "toggle-zero", "en");
      expect(disabled(none, "on-sale")).toEqual(["1"]);
      expect(none).toContain(", 0 products");
    });
  });

  describe("the live render", () => {
    it.each(LOCALES)("is the fixtures' six facets in one form, in %s", (locale) => {
      const markup = plain(renderToStaticMarkup(story(GROUP).live(createContext(locale))));
      expect(count(markup, "<form ")).toBe(1);
      expect(count(markup, 'data-slot="filter-group"')).toBe(6);
      for (const facet of fixtures(locale).facets) {
        expect(markup).toContain(`data-kind="${facet.kind}"`);
        expect(markup).toContain(plain(facet.label));
      }
      expect(chosen(markup, "category")).toEqual(["hoodies"]);
      expect(chosen(markup, "colour")).toEqual(["black", "forest"]);
      expect(chosen(markup, "size")).toEqual(["m"]);
      expect(chosen(markup, "in-stock")).toEqual(["1"]);
    });
  });

  describe("the long cases", () => {
    it.each(["de", "el"] as const)("put %s's long strings in every kind of group", (locale) => {
      const { long } = createContext(locale).fixture;
      const checkbox = html(GROUP, "long", locale);
      for (const text of [long.fieldLabel, long.optionLabel, long.toggleLabel, long.productName]) {
        expect(checkbox).toContain(plain(text));
      }
      // The last of the seven options is chosen, behind the limit: the disclosure is open.
      expect(checkbox).toMatch(/<details [^>]*\bopen=""/);
      expect(chosen(checkbox, "size")).toEqual(["long-7"]);
      expect(checkbox).toContain(plain((12480).toLocaleString(htmlLang(locale))));

      const swatch = html(GROUP, "long-swatch", locale);
      expect(swatch).toContain(plain(long.fieldLabel));
      expect(swatch).toContain(plain(long.optionLabel));
      expect(count(swatch, 'data-slot="swatch"')).toBe(7);

      expect(html(GROUP, "long-toggle", locale)).toContain(plain(long.toggleLabel));

      const range = html(GROUP, "long-range", locale);
      expect(range).toContain(plain(long.fieldLabel));
      expect(range).toContain(`>${plain(long.optionLabel)}</label>`);
      expect(range).toContain(`>${plain(long.hint)}</label>`);
    });

    it("never use a class that would cut a long name", () => {
      for (const part of story(GROUP).states ?? []) {
        for (const locale of ["de", "el"] as const) {
          const markup = renderToStaticMarkup(part.render(createContext(locale)));
          expect(markup, `${part.id} ${locale}`).not.toMatch(
            /\b(?:truncate|whitespace-nowrap|text-ellipsis|line-clamp-\d)\b/,
          );
        }
      }
    });
  });
});

describe("ActiveFilterChips' states", () => {
  const listOf = (stateId: string, locale: Locale = "en") =>
    only(CHIPS, stateId, locale).active as ActiveFilters;

  it.each(LOCALES)("draw the fixtures' six chips and Clear all, in %s", (locale) => {
    const copy = catalog(locale).activeFilterChips;
    const markup = html(CHIPS, "default", locale);
    const { filters, clearHref } = fixtures(locale).activeFilters;
    expect(filters).toHaveLength(6);
    expect(count(markup, 'data-slot="chip"')).toBe(6);
    expect(count(markup, 'data-slot="chip-remove"')).toBe(6);
    expect(markup).toContain(
      `aria-label="${plain(formatMessage(copy.label, { count: 6 }, htmlLang(locale)))}"`,
    );
    expect(markup).toContain(`aria-label="${plain(copy.clearAllLabel)}" href="${clearHref}"`);
    expect(markup).toContain(`>${plain(copy.clearAll)}</a>`);
    for (const filter of filters) {
      expect(markup).toContain(`href="${filter.removeHref}"`);
    }
  });

  it("is the same list in the live render and in the default state", () => {
    for (const locale of LOCALES) {
      expect(plain(renderToStaticMarkup(story(CHIPS).live(createContext(locale))))).toBe(
        html(CHIPS, "default", locale),
      );
    }
  });

  it("draws one chip whose link is the page Clear all goes to", () => {
    const { filters, clearHref } = listOf("one");
    expect(filters).toHaveLength(1);
    expect(filters[0]?.removeHref).toBe(clearHref);
    expect(html(CHIPS, "one", "en")).toContain('aria-label="1 active filter"');
  });

  it("says an on/off filter by its label alone", () => {
    const { filters } = listOf("on-off");
    expect(filters.map((filter) => filter.group)).toEqual([undefined, undefined]);
    const markup = html(CHIPS, "on-off", "en");
    expect(markup).toContain('aria-label="Remove In stock"');
    expect(markup).toContain('aria-label="Remove On sale"');
    expect(markup).not.toMatch(/<span>[^<]*: [^<]*<\/span>/);
  });

  it("wraps fourteen chips, each linking to the listing with the other thirteen", () => {
    const { filters } = listOf("many");
    expect(filters).toHaveLength(14);
    expect(new Set(filters.map((filter) => filter.id)).size).toBe(14);
    for (const filter of filters) {
      const query = new URL(filter.removeHref, "https://shop.test").searchParams;
      expect([...query.keys()]).toHaveLength(13);
      const [facet, value] = filter.id.split(":");
      expect(query.getAll(facet ?? "")).not.toContain(value);
    }
  });

  it.each(["de", "el"] as const)("puts %s's long strings in the chips", (locale) => {
    const { long } = createContext(locale).fixture;
    const markup = html(CHIPS, "long", locale);
    for (const text of [long.fieldLabel, long.optionLabel, long.toggleLabel, long.productName]) {
      expect(markup).toContain(plain(text));
    }
    expect(count(markup, 'data-slot="chip"')).toBe(3);
    expect(markup).not.toMatch(/\b(?:truncate|whitespace-nowrap|text-ellipsis|line-clamp-\d)\b/);
  });
});
