import { LOCALES } from "@shopblok/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EntryBody } from "./components/entry-body";
import { createContext } from "./context";
import { entries } from "./entries";

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
