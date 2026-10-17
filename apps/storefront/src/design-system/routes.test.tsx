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
import * as previewLayout from "../app/design-system/[locale]/preview/[...entry]/layout";
import * as previewPage from "../app/design-system/[locale]/preview/[...entry]/page";
import { manifest as entries } from "./catalog";

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
  it("gives the entry, frame and preview layouts every entry in each of the four locales", () => {
    on();
    for (const layout of [entryLayout, frameLayout, previewLayout]) {
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
    expect(previewLayout.generateStaticParams()).toHaveLength(1);
    expect(overviewLayout.generateStaticParams()).toHaveLength(1);
  });
});

describe("the root layouts", () => {
  it("set <html lang> from the locale's market and keep the font variable", async () => {
    on();
    for (const layout of [overviewLayout, entryLayout, frameLayout, previewLayout]) {
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
    for (const layout of [overviewLayout, entryLayout, frameLayout, previewLayout]) {
      for (const locale of ["xx", "EN", "en-US", ""]) {
        await expect(renderLayout(layout, locale), locale).rejects.toMatchObject(NOT_FOUND);
      }
    }
  });

  it("are a 404 for an unknown entry, before anything streams (the entry, frame and preview layouts)", async () => {
    on();
    for (const layout of [entryLayout, frameLayout, previewLayout]) {
      for (const entry of [
        ["nope"],
        ["foundations", "nope"],
        ["atoms", "nope"],
        ["frame"],
        ["preview"],
      ]) {
        await expect(renderLayout(layout, "en", entry), entry.join("/")).rejects.toMatchObject(
          NOT_FOUND,
        );
      }
    }
  });

  it("are a 404 for a real entry in a real locale when the flag is off", async () => {
    off();
    for (const layout of [overviewLayout, entryLayout, frameLayout, previewLayout]) {
      await expect(renderLayout(layout, "en")).rejects.toMatchObject(NOT_FOUND);
    }
  });

  it("tell search engines not to index anything", () => {
    for (const layout of [overviewLayout, entryLayout, frameLayout, previewLayout]) {
      expect(layout.metadata.robots).toEqual({ index: false, follow: false });
    }
  });

  it("wrap the overview and the entry in the shell, and the frame and the preview in nothing", async () => {
    on();
    const overview = await renderLayout(overviewLayout, "de");
    const entry = await renderLayout(entryLayout, "de");
    for (const markup of [overview, entry]) {
      expect(markup).toContain('aria-label="Design system"');
      expect(markup).toContain('href="#content"');
      expect(markup).toContain("<p>child</p>");
    }
    for (const layout of [frameLayout, previewLayout]) {
      const markup = await renderLayout(layout, "de");
      expect(markup).not.toContain("<nav");
      expect(markup).not.toContain("<aside");
      expect(markup).toContain("<p>child</p>");
    }
  });
});

describe("the pages", () => {
  it("render an entry, page, frame and preview, in the locale (flag on)", async () => {
    on();
    root.locale.mockResolvedValue("el");
    root.entry.mockResolvedValue(["foundations", "typography"]);
    const page = renderToStaticMarkup(await entryPage.default());
    const frame = renderToStaticMarkup(await framePage.default());
    const preview = renderToStaticMarkup(await previewPage.default());
    for (const markup of [page, frame, preview]) {
      expect(markup).toContain("Φούτερ με κουκούλα Heritage");
    }
    // The frame and the preview are bare renders: no title, no iframes.
    for (const markup of [frame, preview]) {
      expect(markup).not.toContain("<h1");
      expect(markup).not.toContain("<iframe");
    }
    expect(page).toContain("<h1");
    expect(page).toContain("<iframe");
  });

  it("render the live render alone in the preview, without the states", async () => {
    on();
    root.locale.mockResolvedValue("en");
    root.entry.mockResolvedValue(["atoms", "button"]);
    const frame = renderToStaticMarkup(await framePage.default());
    const preview = renderToStaticMarkup(await previewPage.default());
    // The frame has the section headings and the states matrix; the preview has neither.
    expect(frame).toContain("data-state=");
    expect(frame).toContain('id="live-render"');
    expect(preview).not.toContain("data-state=");
    expect(preview).not.toContain('id="live-render"');
    expect(preview).toContain("<button");
  });

  it("are all static: a build fails if one reads the request (D44)", () => {
    for (const page of [overviewPage, entryPage, framePage, previewPage]) {
      expect(page.ensureStatic).toBe("navigation");
    }
  });

  it("answer 404 on their own too, for an unknown entry or with the flag off", async () => {
    on();
    root.locale.mockResolvedValue("en");
    root.entry.mockResolvedValue(["nope"]);
    for (const page of [entryPage, framePage, previewPage]) {
      await expect(page.default()).rejects.toMatchObject(NOT_FOUND);
    }
    off();
    root.entry.mockResolvedValue(["foundations", "colors"]);
    for (const page of [entryPage, framePage, previewPage, overviewPage]) {
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
    expect(await previewPage.generateMetadata(params(["foundations", "colors"]))).toEqual({
      title: "Colors · preview",
    });
  });

  it("render the overview with the groups, the entries and the locale toggle", async () => {
    on();
    root.locale.mockResolvedValue("fr");
    const markup = renderToStaticMarkup(await overviewPage.default());
    expect(markup).toContain("Foundations");
    expect(markup).toContain('href="/design-system/fr/foundations/colors"');
    expect(markup).toContain('href="/design-system/de"');
    expect(markup).toContain("Atoms");
    expect(markup).toContain('href="/design-system/fr/atoms/button"');
  });
});
