import { catalogs, LOCALES } from "@shopblok/i18n";
import { entries as registry } from "@shopblok/registry";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { manifest as entries } from "./catalog";
import { EntryBody } from "./components/entry-body";
import { createContext } from "./context";
import { interactions, type DsInteraction } from "./interactions";
import { stories } from "./stories";

describe("the stories and the registry (D40)", () => {
  it("have the same ids: a story for every entry, and an entry for every story", () => {
    const ids: readonly string[] = registry.map((entry) => entry.id);
    expect(
      Object.keys(stories).filter((id) => !ids.includes(id)),
      "stories with no entry",
    ).toEqual([]);
    expect(
      ids.filter((id) => !Object.hasOwn(stories, id)),
      "entries with no story",
    ).toEqual([]);
  });

  it("give the manifest the registry's entries, in its order", () => {
    expect(entries.map((entry) => entry.id)).toEqual(registry.map((entry) => entry.id));
    for (const [index, entry] of entries.entries()) {
      expect(entry).toMatchObject(registry[index]!);
    }
  });

  it("point every entry with a component at a module of @shopblok/ui that exports it", async () => {
    for (const entry of registry) {
      if (entry.component === undefined) {
        expect(entry.kind, entry.id).toBe("foundation");
        continue;
      }
      const exports: Record<string, unknown> = await import(entry.component.module);
      expect(typeof exports[entry.component.name], `${entry.id}: ${entry.component.name}`).toBe(
        "function",
      );
    }
  });
});

describe("every entry of the manifest", () => {
  for (const entry of entries) {
    it.each(LOCALES)(`${entry.id} renders in %s`, (locale) => {
      const markup = renderToStaticMarkup(<EntryBody entry={entry} ctx={createContext(locale)} />);
      expect(markup.length).toBeGreaterThan(200);
      expect(markup).not.toContain("undefined");
      expect(markup).not.toContain("NaN");
    });
  }
});

describe("the interaction checks (D45, T33)", () => {
  it.each(Object.entries(interactions as Record<string, DsInteraction>))(
    "%s has an entry whose live render draws its trigger (on the server, or only in the browser)",
    (id, interaction) => {
      const entry = entries.find((candidate) => candidate.id === id);
      expect(entry, id).toBeDefined();
      if (entry === undefined) return;
      // The selectors are one attribute each (`[data-slot="…"]`), so the markup shows it as written.
      expect(interaction.trigger).toMatch(/^\[[a-z-]+="[^"]+"\]$/);
      const markup = renderToStaticMarkup(<>{entry.live(createContext("en"))}</>);
      // A trigger the browser draws (D44, T36) is in no server render: the design-system job waits
      // for it after hydration.
      if (interaction.afterHydration === true)
        expect(markup).not.toContain(interaction.trigger.slice(1, -1));
      else expect(markup).toContain(interaction.trigger.slice(1, -1));
    },
  );
});

const atomEntries = entries.filter((entry) => entry.group === "atoms");

describe("the atoms' entries (T21, T23)", () => {
  const html = (id: string, locale: (typeof LOCALES)[number]) => {
    const entry = entries.find((candidate) => candidate.id === id);
    if (entry === undefined) throw new Error(`no entry ${id}`);
    return renderToStaticMarkup(<EntryBody entry={entry} ctx={createContext(locale)} />);
  };

  it("has one entry for each of SPEC §9.3's 32 atoms, each with states", () => {
    const slugs = atomEntries.map((entry) => entry.id.replace("atoms/", "")).sort();
    expect(slugs).toEqual(
      [
        "avatar",
        "badge",
        "button",
        "checkbox",
        "chip",
        "flag",
        "icon",
        "icon-button",
        "image",
        "input",
        "kbd",
        "label",
        "link",
        "logo",
        "native-select",
        "payment-icon",
        "price",
        "progress",
        "quantity-stepper",
        "radio-group",
        "rating",
        "select",
        "separator",
        "size-pill",
        "skeleton",
        "spinner",
        "stock-indicator",
        "swatch",
        "switch",
        "textarea",
        "tooltip",
        "visually-hidden",
      ].sort(),
    );
    for (const entry of atomEntries) {
      expect(entry.states?.length ?? 0, entry.id).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES)("keeps every id on a page unique, in %s", (locale) => {
    for (const entry of atomEntries) {
      const markup = renderToStaticMarkup(<EntryBody entry={entry} ctx={createContext(locale)} />);
      const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
      expect(
        ids.filter((id, index) => ids.indexOf(id) !== index),
        entry.id,
      ).toEqual([]);
    }
  });

  it.each(LOCALES)("shows Price in the market's own format, in %s", (locale) => {
    const ctx = createContext(locale);
    // React escapes an ASCII apostrophe, which newer Node versions write as fr-CH's grouping mark
    // (SPEC §14, "Test rule"), so the markup is unescaped before it is compared.
    const markup = html("atoms/price", locale).replaceAll("&#x27;", "'");
    expect(markup).toContain(ctx.money(ctx.fixture.prices.regular));
    expect(markup).toContain(ctx.money(ctx.fixture.prices.sale.original));
    expect(markup).toContain(ctx.money(ctx.fixture.prices.high));
    expect(markup).toContain(catalogs[locale].atoms.price.sale);
    expect(markup).toContain(catalogs[locale].atoms.price.original);
  });

  it.each(LOCALES)("takes the atoms' own copy from the catalog, in %s", (locale) => {
    const copy = catalogs[locale].atoms;
    expect(html("atoms/chip", locale)).toContain(copy.chip.remove);
    expect(html("atoms/stock-indicator", locale)).toContain(copy.stock.inStock);
    expect(html("atoms/stock-indicator", locale)).toContain(copy.stock.outOfStock);
    expect(html("atoms/quantity-stepper", locale)).toContain(copy.quantityStepper.increase);
    expect(html("atoms/payment-icon", locale)).toContain(copy.payment.americanexpress);
    expect(html("atoms/swatch", locale)).toContain(copy.variant.unavailable);
    expect(html("atoms/link", locale)).toContain(copy.link.newTab);
  });

  it("labels the rating in the locale's number format", () => {
    expect(html("atoms/rating", "de")).toContain("4,5 von 5");
    expect(html("atoms/rating", "en")).toContain("4.5 out of 5");
    // A whole value is spoken without a padded zero (PR 43 review).
    expect(html("atoms/rating", "en")).toContain("3 out of 5");
    expect(html("atoms/rating", "en")).not.toContain("3.0 out of 5");
  });

  it("names the flags in the locale, from Intl", () => {
    expect(html("atoms/flag", "el")).toContain("Κύπρος");
    expect(html("atoms/flag", "de")).toContain("Deutschland");
    expect(html("atoms/flag", "fr")).toContain("Suisse");
  });
});

describe("the Foundations pages", () => {
  const html = (id: string, locale: (typeof LOCALES)[number] = "en") => {
    const entry = entries.find((candidate) => candidate.id === id);
    if (entry === undefined) throw new Error(`no entry ${id}`);
    return renderToStaticMarkup(<EntryBody entry={entry} ctx={createContext(locale)} />);
  };

  it("show the kit's value beside ours where we override it", () => {
    const markup = html("foundations/colors");
    // muted-foreground: ours #707070, the kit's #737373 (T19's Overrides).
    expect(markup).toContain("#707070");
    expect(markup).toContain("Kit: <code>#737373</code>");
    expect(markup).toContain("Fails 4.5:1 on `muted`.");
  });

  it("list the contrast pairs with their ratios and whether they pass", () => {
    const markup = html("foundations/colors");
    expect(markup).toContain("Contrast pairs");
    expect(markup).toContain("4.54:1");
    expect(markup).toContain("Pass");
    expect(markup).not.toContain(">Fail<");
  });

  it("set the type scale in the locale's text", () => {
    expect(html("foundations/typography", "el")).toContain("Φούτερ με κουκούλα Heritage");
    expect(html("foundations/typography", "de")).toContain("Heritage-Hoodie");
    expect(html("foundations/typography", "en")).toContain("text-9xl");
  });

  it("show spacing, radius, shadows, breakpoints, layers and the credits", () => {
    expect(html("foundations/spacing")).toContain("w-11");
    expect(html("foundations/radius")).toContain("rounded-4xl");
    expect(html("foundations/shadows")).toContain("shadow-2xl");
    const layout = html("foundations/layout");
    expect(layout).toContain("1440px");
    expect(layout).toContain("--z-toast");
    const credits = html("foundations/icons-credits");
    expect(credits).toContain("CC BY 4.0");
    expect(credits).toContain("ChevronDown");
    expect(credits).toContain("shadcn/ui");
  });
});
