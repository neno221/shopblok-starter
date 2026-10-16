import { LOCALES } from "@shopblok/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntryBody } from "./components/entry-body";
import { EntryPage } from "./components/entry-page";
import { NavTree } from "./components/nav-tree";
import { createContext } from "./context";
import type { DsEntry } from "./types";

// A test-only entry that exercises everything the machinery does with an atom's: a live render, a
// states matrix, a11y notes, strings from the fixtures. T21's atoms add entries of the same shape.
const sample: DsEntry = {
  id: "atoms/sample",
  group: "atoms",
  label: "Sample",
  summary: "An entry that exists only in this test.",
  a11y: ["First note.", "Second note."],
  live: (ctx) => <button type="button">{ctx.fixture.ordinary.action}</button>,
  states: [
    {
      id: "default",
      label: "Default",
      render: (ctx) => <button type="button">{ctx.fixture.ordinary.action}</button>,
    },
    {
      id: "long-label",
      label: "Long label",
      description: "The longest string the locale has.",
      render: (ctx) => <button type="button">{ctx.fixture.long.action}</button>,
    },
    {
      id: "price",
      label: "Sale price",
      render: (ctx) => (
        <span>
          {ctx.money(ctx.fixture.prices.sale.amount)} {ctx.money(ctx.fixture.prices.sale.original)}
        </span>
      ),
    },
  ],
};

const render = (entry: DsEntry, locale: (typeof LOCALES)[number]) =>
  renderToStaticMarkup(<EntryBody entry={entry} ctx={createContext(locale)} />);

describe("EntryBody (the live render and the states matrix)", () => {
  it.each(LOCALES)("renders the live render and every state in %s", (locale) => {
    const markup = render(sample, locale);
    const ctx = createContext(locale);
    expect(markup).toContain(ctx.fixture.ordinary.action);
    expect(markup).toContain(ctx.fixture.long.action);
    expect(markup).toContain(ctx.money(ctx.fixture.prices.sale.amount));
    for (const state of sample.states ?? []) expect(markup).toContain(`data-state="${state.id}"`);
    expect(markup).toContain("The longest string the locale has.");
  });

  it("states the language of each part: English chrome, the locale's content", () => {
    const markup = render(sample, "el");
    expect(markup).toContain('<h2 id="live-render" lang="en"');
    expect(markup).toContain('<div lang="el-CY">');
  });

  it("has no states section for an entry without states", () => {
    const markup = render({ ...sample, states: undefined }, "en");
    expect(markup).toContain("Live render");
    expect(markup).not.toContain('id="states"');
  });

  it("formats prices with the market of the locale (D33)", () => {
    const money = (locale: (typeof LOCALES)[number]) =>
      createContext(locale)
        .money(1249.5)
        .replace(/[\u00a0\u202f]/g, " ");
    expect(money("en")).toBe("$1,249.50");
    expect(money("el")).toBe("1.249,50 €");
    expect(money("de")).toBe("1.249,50 €");
    // Swiss grouping mark differs between ICU versions (i18n's own test says so): the digits and the
    // currency are what this checks.
    expect(money("fr")).toContain("249.50");
    expect(money("fr")).toContain("CHF");
  });
});

describe("EntryPage", () => {
  const page = (locale: (typeof LOCALES)[number]) =>
    renderToStaticMarkup(<EntryPage entry={sample} ctx={createContext(locale)} />);

  it("shows the title, the a11y notes, the live render and the states", () => {
    const markup = page("de");
    expect(markup).toContain("<h1");
    expect(markup).toContain("Sample");
    expect(markup).toContain("First note.");
    expect(markup).toContain("Second note.");
    expect(markup).toContain("Accessibility notes");
    expect(markup).toContain(createContext("de").fixture.long.action);
  });

  it("has a locale toggle with a link to this entry in each of the four locales", () => {
    const markup = page("el");
    for (const locale of LOCALES) {
      expect(markup).toContain(`href="/design-system/${locale}/atoms/sample"`);
    }
    // The current locale is marked, and only that one.
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toMatch(
      /<a [^>]*aria-current="page"[^>]*href="\/design-system\/el\/atoms\/sample"/,
    );
  });

  it("has a viewport switcher with an iframe of the frame route at 375, 768 and 1440 px", () => {
    const markup = page("fr");
    const iframes = markup.match(/<iframe[^>]*>/g) ?? [];
    expect(iframes).toHaveLength(3);
    for (const iframe of iframes) {
      expect(iframe).toContain('src="/design-system/fr/frame/atoms/sample"');
    }
    for (const width of [375, 768, 1440]) {
      expect(markup).toContain(`data-viewport="${width}"`);
      expect(markup).toContain(`Preview at ${width} px: Sample`);
    }
  });
});

describe("NavTree", () => {
  it("lists the overview and the entries of each group, and no empty group", () => {
    const markup = renderToStaticMarkup(<NavTree locale="en" entries={[sample]} />);
    expect(markup).toContain('href="/design-system/en"');
    expect(markup).toContain('href="/design-system/en/atoms/sample"');
    expect(markup).toContain("Atoms");
    expect(markup).not.toContain("Foundations");
  });
});
