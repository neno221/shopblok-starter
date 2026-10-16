import { LOCALES } from "@shopblok/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = vi.hoisted(() => ({
  locale: vi.fn<() => Promise<string>>(),
  entry: vi.fn<() => Promise<string[]>>(),
}));
vi.mock("next/root-params", () => root);
// `next/font` only works inside Next's build; the layouts' markup is what is under test.
vi.mock("../lib/fonts", () => ({ inter: { variable: "inter-variable" } }));

import * as entryLayout from "../app/design-system/[locale]/(entry)/[...entry]/layout";
import * as entryPage from "../app/design-system/[locale]/(entry)/[...entry]/page";
import * as overviewLayout from "../app/design-system/[locale]/(overview)/layout";
import * as overviewPage from "../app/design-system/[locale]/(overview)/page";
import * as frameLayout from "../app/design-system/[locale]/frame/[...entry]/layout";
import * as framePage from "../app/design-system/[locale]/frame/[...entry]/page";
import { entries } from "./entries";

const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

afterEach(() => {
  vi.unstubAllEnvs();
  root.locale.mockReset();
  root.entry.mockReset();
});

function on() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DESIGN_SYSTEM_ENABLED", "true");
}

function off() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DESIGN_SYSTEM_ENABLED", "");
}

/** Sets the root params as Next would for a URL, then renders a layout. */
async function renderLayout(
  layout: { default: (props: { children: React.ReactNode }) => Promise<React.ReactElement> },
  locale: string,
  entry: string[] = ["foundations", "colors"],
) {
  root.locale.mockResolvedValue(locale);
  root.entry.mockResolvedValue(entry);
  return renderToStaticMarkup(await layout.default({ children: <p>child</p> }));
}

describe("generateStaticParams of the DS routes (flag on)", () => {
  it("gives the entry layout and the frame layout every entry in each of the four locales", () => {
    on();
    for (const layout of [entryLayout, frameLayout]) {
      const params = layout.generateStaticParams();
      expect(params).toHaveLength(entries.length * 4);
      for (const locale of LOCALES) {
        for (const entry of entries) {
          expect(params, `${locale} ${entry.id}`).toContainEqual({
            locale,
            entry: entry.id.split("/"),
          });
        }
      }
    }
  });

  it("gives the overview layout the four locales", () => {
    on();
    expect(overviewLayout.generateStaticParams()).toEqual([
      { locale: "en" },
      { locale: "el" },
      { locale: "de" },
      { locale: "fr" },
    ]);
  });

  it("gives one param each, not hundreds of 404 pages, when the flag is off", () => {
    off();
    expect(entryLayout.generateStaticParams()).toHaveLength(1);
    expect(frameLayout.generateStaticParams()).toHaveLength(1);
    expect(overviewLayout.generateStaticParams()).toHaveLength(1);
  });
});

describe("the root layouts", () => {
  it("set <html lang> from the locale's market and keep the font variable", async () => {
    on();
    for (const layout of [overviewLayout, entryLayout, frameLayout]) {
      expect(await renderLayout(layout, "en")).toContain(
        '<html lang="en-US" class="inter-variable">',
      );
      expect(await renderLayout(layout, "el")).toContain('<html lang="el-CY"');
      expect(await renderLayout(layout, "de")).toContain('<html lang="de-DE"');
      expect(await renderLayout(layout, "fr")).toContain('<html lang="fr-CH"');
    }
  });

  it("are a 404 for an unknown locale", async () => {
    on();
    for (const layout of [overviewLayout, entryLayout, frameLayout]) {
      for (const locale of ["xx", "EN", "en-US", ""]) {
        await expect(renderLayout(layout, locale), locale).rejects.toMatchObject(NOT_FOUND);
      }
    }
  });

  it("are a 404 for an unknown entry, before anything streams (the entry and frame layouts)", async () => {
    on();
    for (const layout of [entryLayout, frameLayout]) {
      for (const entry of [["nope"], ["foundations", "nope"], ["atoms", "button"], ["frame"]]) {
        await expect(renderLayout(layout, "en", entry), entry.join("/")).rejects.toMatchObject(
          NOT_FOUND,
        );
      }
    }
  });

  it("are a 404 for a real entry in a real locale when the flag is off", async () => {
    off();
    for (const layout of [overviewLayout, entryLayout, frameLayout]) {
      await expect(renderLayout(layout, "en")).rejects.toMatchObject(NOT_FOUND);
    }
  });

  it("tell search engines not to index anything", () => {
    for (const layout of [overviewLayout, entryLayout, frameLayout]) {
      expect(layout.metadata.robots).toEqual({ index: false, follow: false });
    }
  });

  it("wrap the overview and the entry in the shell, and the frame in nothing", async () => {
    on();
    const overview = await renderLayout(overviewLayout, "de");
    const entry = await renderLayout(entryLayout, "de");
    const frame = await renderLayout(frameLayout, "de");
    for (const markup of [overview, entry]) {
      expect(markup).toContain('aria-label="Design system"');
      expect(markup).toContain('href="#content"');
      expect(markup).toContain("<p>child</p>");
    }
    expect(frame).not.toContain("<nav");
    expect(frame).not.toContain("<aside");
    expect(frame).toContain("<p>child</p>");
  });
});

describe("the pages", () => {
  it("render an entry, page and frame, in the locale (flag on)", async () => {
    on();
    root.locale.mockResolvedValue("el");
    root.entry.mockResolvedValue(["foundations", "typography"]);
    const page = renderToStaticMarkup(await entryPage.default());
    const frame = renderToStaticMarkup(await framePage.default());
    for (const markup of [page, frame]) {
      expect(markup).toContain("Φούτερ με κουκούλα Heritage");
    }
    // The frame is the bare render: no title, no iframes.
    expect(frame).not.toContain("<h1");
    expect(frame).not.toContain("<iframe");
    expect(page).toContain("<h1");
    expect(page).toContain("<iframe");
  });

  it("answer 404 on their own too, for an unknown entry or with the flag off", async () => {
    on();
    root.locale.mockResolvedValue("en");
    root.entry.mockResolvedValue(["nope"]);
    for (const page of [entryPage, framePage]) {
      await expect(page.default()).rejects.toMatchObject(NOT_FOUND);
    }
    off();
    root.entry.mockResolvedValue(["foundations", "colors"]);
    for (const page of [entryPage, framePage, overviewPage]) {
      await expect(page.default()).rejects.toMatchObject(NOT_FOUND);
    }
  });

  it("give each entry a title", async () => {
    const params = (entry: string[]) => ({ params: Promise.resolve({ entry }) });
    expect(await entryPage.generateMetadata(params(["foundations", "colors"]))).toEqual({
      title: "Colors · Design system",
    });
    expect(await framePage.generateMetadata(params(["foundations", "colors"]))).toEqual({
      title: "Colors · frame",
    });
  });

  it("render the overview with the groups, the entries and the locale toggle", async () => {
    on();
    root.locale.mockResolvedValue("fr");
    const markup = renderToStaticMarkup(await overviewPage.default());
    expect(markup).toContain("Foundations");
    expect(markup).toContain('href="/design-system/fr/foundations/colors"');
    expect(markup).toContain('href="/design-system/de"');
    expect(markup).not.toContain("Atoms");
  });
});
