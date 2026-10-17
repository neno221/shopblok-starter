import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { VariantSelector } from "@shopblok/ui/molecules/variant-selector";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { productMoleculeStories } from "./molecules-product";

// The four product molecules' stories (T32; D40): the states the plan lists are there, each one
// shows what its description says in every locale, and the one client component gets props that
// serialize, because a story renders on the server.

type Id = keyof typeof productMoleculeStories;

const story = (id: Id) => productMoleculeStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
const plain = (text: string) => text.replace(/\s/g, " ");
/** The text of every element with a `data-slot`, or all matches of a pattern. */
const matches = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)];
const variantCopy = (locale: Locale) => catalogs[locale].molecules.variantSelector;
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;

describe("the product molecules' stories", () => {
  it("are one for each of the four entries, each with a summary and a11y notes", () => {
    expect(Object.keys(productMoleculeStories).sort()).toEqual([
      "molecules/media-figure",
      "molecules/rating-summary",
      "molecules/review-item",
      "molecules/variant-selector",
    ]);
    for (const [id, each] of Object.entries(productMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("have the states the plan lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids("molecules/variant-selector")).toEqual([
      "default",
      "chosen",
      "unavailable-chosen",
      "none-available",
      "long-label",
      "one-option",
    ]);
    expect(ids("molecules/rating-summary")).toEqual(["reviews", "one-review", "none", "long"]);
    expect(ids("molecules/review-item")).toEqual([
      "title-verified",
      "title-unverified",
      "no-title-unverified",
      "no-title-verified",
      "low-rating",
      "long",
    ]);
    expect(ids("molecules/media-figure")).toEqual([
      "caption-credit",
      "caption",
      "credit",
      "none",
      "long",
    ]);
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(productMoleculeStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(100);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
      }
    }
  });

  it("give the client component props that serialize (a story renders on the server)", () => {
    const ctx = createContext("en");
    const selectorIn = (node: ReactNode): ReactElement<Record<string, unknown>> => {
      if (!isValidElement<{ children?: ReactNode }>(node)) throw new Error("not an element");
      if (node.type === VariantSelector) return node as ReactElement<Record<string, unknown>>;
      return selectorIn(node.props.children);
    };
    const { live, states = [] } = productMoleculeStories["molecules/variant-selector"];
    const rendered = [live(ctx), ...states.map((each) => each.render(ctx))];
    expect(rendered).toHaveLength(7);
    for (const node of rendered) {
      const { props } = selectorIn(node);
      // Plain data and a choice to start from: nothing a server component cannot hand over.
      expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
      expect(JSON.parse(JSON.stringify(props))).toEqual(props);
      expect(props.defaultValue === undefined || typeof props.defaultValue === "object").toBe(true);
    }
  });
});

describe("VariantSelector's states", () => {
  const id = "molecules/variant-selector";
  const groups = (markup: string) => markup.split('role="radiogroup"').slice(1);
  const radiosOf = (group: string) =>
    matches(group, /<button [^>]*role="radio"[^>]*>(.*?)<\/button>/g).map((each) => each[0]);

  it.each(LOCALES)("shows what each one claims, in %s", (locale) => {
    const unavailable = variantCopy(locale).unavailable;
    // Default: nothing chosen, and XL (sold out in every colour) already unavailable.
    const initial = html(id, "default", locale);
    expect(initial).not.toContain('aria-checked="true"');
    expect(matches(initial, new RegExp(`, ${unavailable}</span>`, "g"))).toHaveLength(1);

    // Chosen: both groups carry a checked radio, and their labels say the choice.
    const chosen = html(id, "chosen", locale);
    expect(matches(chosen, /aria-checked="true"/g)).toHaveLength(2);
    const [colour, size] = commerceFixtures[locale].product.options;
    const said = (option: string, value: string) =>
      plain(formatMessage(variantCopy(locale).chosen, { option, value }, htmlLang(locale)));
    expect(plain(chosen)).toContain(said(colour!.title, colour!.values[1]!.label));
    expect(plain(chosen)).toContain(said(size!.title, "M"));

    // Unavailable value chosen: a checked radio that is also unavailable.
    const sky = html(id, "unavailable-chosen", locale);
    const checkedUnavailable = matches(
      sky,
      /<button [^>]*data-unavailable=""[^>]*aria-checked="true"[^>]*>/g,
    );
    expect(checkedUnavailable.length).toBeGreaterThanOrEqual(1);
    expect(checkedUnavailable.some((each) => each[0].includes('data-slot="size-pill"'))).toBe(true);

    // No value left for the colours: all four are unavailable.
    const none = html(id, "none-available", locale);
    const [colours] = groups(none);
    expect(radiosOf(colours!)).toHaveLength(4);
    expect(radiosOf(colours!).every((each) => each.includes('data-unavailable=""'))).toBe(true);
  });

  it("draws one group for one option, and two otherwise", () => {
    expect(groups(html(id, "one-option", "en"))).toHaveLength(1);
    expect(groups(html(id, "default", "en"))).toHaveLength(2);
  });

  it.each(["de", "el"] as const)("carries the long option names and values in %s", (locale) => {
    const markup = plain(html(id, "long-label", locale));
    const [colourLine, sizeLine] = commerceFixtures[locale].long.cartLine.options;
    for (const line of [colourLine!.option, colourLine!.value, sizeLine!.option, sizeLine!.value])
      expect(markup, line).toContain(line);
    expect(markup).toContain("wrap-anywhere");
  });

  it("names each part's radios apart, so groups of one name do not join in the browser", () => {
    const names = (markup: string) => [
      ...new Set(matches(markup, /name="([^"]+)"/g).map((each) => each[1])),
    ];
    const all = (story(id).states ?? []).flatMap((each) => names(html(id, each.id, "en")));
    expect(new Set(all).size).toBe(all.length);
    for (const name of all) expect(name).toMatch(/^ds-[a-z-]+\.(colour|size)$/);
  });
});

describe("RatingSummary's states", () => {
  const id = "molecules/rating-summary";
  const copy = (locale: Locale) => catalogs[locale].molecules.ratingSummary;

  it("shows five rows with reviews, and the message alone with none", () => {
    expect(matches(html(id, "reviews", "en"), /data-slot="rating-summary-row"/g)).toHaveLength(5);
    const none = html(id, "none", "en");
    expect(none).toContain("No reviews yet");
    expect(none).not.toContain("rating-summary-row");
    expect(none).not.toContain('role="img"');
    expect(copy("fr").count).toContain("=0");
  });

  it("uses the singular for one review", () => {
    expect(html(id, "one-review", "en")).toContain("Based on 1 review<");
    expect(plain(html(id, "one-review", "de"))).toContain("Basierend auf 1 Bewertung<");
  });

  it("writes large counts with the market's grouping", () => {
    expect(html(id, "long", "en")).toContain("9,400,000");
    expect(plain(html(id, "long", "de"))).toContain("9.400.000");
  });
});

describe("ReviewItem's states", () => {
  const id = "molecules/review-item";

  it("puts the title, or the author, in a level 4 heading, under the state's own heading", () => {
    expect(html(id, "title-verified", "en")).toMatch(/<h4[^>]*>My new favorite hoodie<\/h4>/);
    const untitled = html(id, "no-title-unverified", "en");
    expect(untitled).toMatch(/<h4[^>]*>Sam R\.<\/h4>/);
    expect(matches(untitled, /Sam R\./g)).toHaveLength(1);
    expect(untitled).not.toContain('data-slot="review-author"');
  });

  it("marks verified reviews and only those", () => {
    const mark = 'data-slot="review-verified"';
    expect(html(id, "title-verified", "en")).toContain(mark);
    expect(html(id, "no-title-verified", "en")).toContain(mark);
    expect(html(id, "title-unverified", "en")).not.toContain(mark);
    expect(html(id, "no-title-unverified", "en")).not.toContain(mark);
  });

  it("keeps the long review's five paragraphs", () => {
    const markup = html(id, "long", "de");
    const body = markup.slice(markup.indexOf('data-slot="review-body"'));
    expect(matches(body, /<p /g)).toHaveLength(5);
  });
});

describe("MediaFigure's states", () => {
  const id = "molecules/media-figure";

  it.each(LOCALES)("shows the caption and the credit that each state names, in %s", (locale) => {
    const credit = catalogs[locale].molecules.mediaFigure.credit.replace(
      "{credit}",
      "Shopblok Studio",
    );
    const both = plain(html(id, "caption-credit", locale));
    expect(both).toContain("<figcaption");
    expect(both).toContain(plain(credit));
    const captionOnly = html(id, "caption", locale);
    expect(captionOnly).toContain("<figcaption");
    expect(captionOnly).not.toContain("media-figure-credit");
    const creditOnly = html(id, "credit", locale);
    expect(creditOnly).toContain("media-figure-credit");
    expect(matches(creditOnly, /<span class="wrap-anywhere">/g)).toHaveLength(0);
    expect(html(id, "none", locale)).not.toContain("<figcaption");
  });
});
