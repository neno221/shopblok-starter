import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, countryName, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { MarketSuggestion } from "@shopblok/registry/contracts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import {
  MarketSuggestionBanner,
  type MarketSuggestionBannerProps,
} from "./market-suggestion-banner";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.marketSuggestionBanner;
const suggestions = (locale: Locale) => commerceFixtures[locale].header.suggestions;
/** The country each DS locale's market is in. */
const home = { en: "us", el: "cy", de: "de", fr: "ch" } as const;

function element(
  locale: Locale,
  suggestion: MarketSuggestion | undefined,
  props: Partial<MarketSuggestionBannerProps> = {},
) {
  return (
    <MarketSuggestionBanner
      suggestion={suggestion}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}

const setup = (
  locale: Locale,
  suggestion: MarketSuggestion | undefined,
  props?: Partial<MarketSuggestionBannerProps>,
) => render(element(locale, suggestion, props));

/** The suggestion with the suggested store somewhere else, or the page somewhere else. */
function suggesting(
  locale: Locale,
  change: { suggested?: Partial<MarketSuggestion["suggested"]>; current?: string },
): MarketSuggestion {
  const base = suggestions(locale).copy;
  return {
    ...base,
    current: { country: change.current ?? base.current.country },
    suggested: { ...base.suggested, ...change.suggested },
  };
}

/** South Georgia and the South Sandwich Islands: `Intl`'s longest country name, with no spaces to break at in some scripts. */
const longSuggested = {
  country: "gs",
  language: "en",
  htmlLang: "en-GB",
  currencyCode: "GBP",
  href: "/gs",
};

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const banner = () => slot("market-suggestion-banner") as HTMLElement;
const go = () => slot("market-suggestion-go") as HTMLElement;
const stay = () => slot("market-suggestion-stay") as HTMLElement;
const messageText = () => slot("market-suggestion-message")?.textContent;

describe("MarketSuggestionBanner", () => {
  describe("without a suggestion", () => {
    it("draws nothing, not an empty strip (D44)", () => {
      const { container } = setup("en", undefined);
      expect(container.innerHTML).toBe("");
      expect(renderToString(element("en", undefined))).toBe("");
    });

    it("draws nothing for a suggestion to the country the page is already in", () => {
      const same = suggesting("en", { suggested: { country: "us" }, current: "us" });
      const { container } = setup("en", same);
      expect(container.innerHTML).toBe("");
    });
  });

  describe("the landmark", () => {
    it.each(LOCALES)("is a region named by the copy, in %s", (locale) => {
      setup(locale, suggestions(locale).copy);
      expect(screen.getByRole("region", { name: copyOf(locale).region })).toBe(banner());
    });
  });

  describe("the sentence", () => {
    it.each(LOCALES)(
      "is the copy's with the suggested country in the page's language and its currency, in %s",
      (locale) => {
        const { suggested } = suggestions(locale).copy;
        setup(locale, suggestions(locale).copy);
        const expected = formatMessage(
          copyOf(locale).message,
          {
            country: countryName(suggested.country, htmlLang[locale]),
            currency: suggested.currencyCode,
          },
          htmlLang[locale],
        );
        expect(messageText()).toBe(expected);
        expect(messageText()).toContain(countryName(suggested.country, htmlLang[locale]));
        expect(messageText()).toContain(suggested.currencyCode);
      },
    );

    it.each(LOCALES)("is the shop's own message when it has one, in %s", (locale) => {
      const own = suggestions(locale).message;
      expect(own.message).toBeTruthy();
      setup(locale, own);
      expect(messageText()).toBe(own.message);
      // The copy's sentence is not there as well.
      const { suggested } = own;
      const copysOwn = formatMessage(
        copyOf(locale).message,
        {
          country: countryName(suggested.country, htmlLang[locale]),
          currency: suggested.currencyCode,
        },
        htmlLang[locale],
      );
      expect(banner().textContent).not.toContain(copysOwn);
    });

    it("names the suggested country in English from Intl: Cyprus for a visitor in the United States", () => {
      setup("en", suggestions("en").copy);
      const { suggested } = suggestions("en").copy;
      expect(countryName(suggested.country, "en-US")).toBeTruthy();
      expect(messageText()).toContain(countryName(suggested.country, "en-US"));
    });
  });

  describe("go to the other store", () => {
    it.each(LOCALES)(
      "is a plain link named by the copy with the country, to the suggested href, in %s",
      (locale) => {
        const { suggested } = suggestions(locale).copy;
        setup(locale, suggestions(locale).copy);
        const label = formatMessage(
          copyOf(locale).go,
          { country: countryName(suggested.country, htmlLang[locale]) },
          htmlLang[locale],
        );
        const link = screen.getByRole("link", { name: label });
        expect(link).toBe(go());
        expect(link.tagName).toBe("A");
        // Words as the copy has them, no-break spaces included (French sets ":" after one).
        expect(link.textContent).toBe(label);
        expect(link.getAttribute("href")).toBe(suggested.href);
        expect(link.getAttribute("hreflang")).toBe(suggested.htmlLang);
      },
    );

    it("is an anchor, not next/link: the whole page changes market, so the browser loads it anew", () => {
      setup("en", suggestions("en").copy);
      expect(go().tagName).toBe("A");
      expect(go().hasAttribute("target")).toBe(false);
      expect(screen.queryAllByRole("button", { name: /Go to/ })).toHaveLength(0);
    });

    it("keeps an absolute address as written", () => {
      setup("en", suggesting("en", { suggested: { href: "https://example.com/cy/en" } }));
      expect(go().getAttribute("href")).toBe("https://example.com/cy/en");
    });
  });

  describe("stay", () => {
    it.each(LOCALES)("is a button named by the copy with the current country, in %s", (locale) => {
      setup(locale, suggestions(locale).copy);
      const label = formatMessage(
        copyOf(locale).stay,
        { current: countryName(home[locale], htmlLang[locale]) },
        htmlLang[locale],
      );
      const button = screen.getByRole("button", { name: label });
      expect(button).toBe(stay());
      expect(button.textContent).toBe(label);
    });

    it("reads 'Stay in the United States store' in English", () => {
      setup("en", suggestions("en").copy);
      expect(screen.getByRole("button", { name: "Stay in the United States store" })).toBe(stay());
    });

    it("hides the banner when pressed", () => {
      setup("en", suggestions("en").copy);
      fireEvent.click(stay());
      expect(banner()).toBeNull();
      expect(screen.queryByRole("region")).toBeNull();
      expect(screen.queryAllByRole("link")).toHaveLength(0);
    });

    it("moves focus to the control that follows the banner, not to the body", () => {
      render(
        <>
          <button type="button">Before</button>
          {element("en", suggestions("en").copy)}
          <a href="/home">Home</a>
        </>,
      );
      act(() => stay().focus());
      fireEvent.click(stay());
      expect(banner()).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Home" }));
    });

    it("works from the keyboard: Tab to it, Enter, and the next Tab carries on", async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">Before</button>
          {element("en", suggestions("en").copy)}
          <a href="/home">Home</a>
          <button type="button">After</button>
        </>,
      );
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Before" }));
      await user.tab();
      expect(document.activeElement).toBe(go());
      await user.tab();
      expect(document.activeElement).toBe(stay());
      await user.keyboard("{Enter}");
      expect(banner()).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Home" }));
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    });

    it("hides the banner when it is the last thing on the page, and does not throw", () => {
      setup("en", suggestions("en").copy);
      act(() => stay().focus());
      expect(() => fireEvent.click(stay())).not.toThrow();
      expect(banner()).toBeNull();
    });

    it("is hidden without JavaScript, where it would do nothing, and the link stays", () => {
      const view = document.createElement("div");
      view.innerHTML = renderToString(element("en", suggestions("en").copy));
      expect(slot("market-suggestion-stay", view)?.className).toContain("noscript:hidden");
      expect(slot("market-suggestion-go", view)?.className).not.toContain("noscript:hidden");
    });
  });

  describe("the flag (D49)", () => {
    it.each(LOCALES)(
      "is the suggested country's, named by it, and hidden from readers, in %s",
      (locale) => {
        const { suggested } = suggestions(locale).copy;
        setup(locale, suggestions(locale).copy);
        const flag = slot("flag") as HTMLElement;
        expect(flag.getAttribute("data-code")).toBe(suggested.country.toUpperCase());
        expect(flag.getAttribute("aria-label")).toBe(
          countryName(suggested.country, htmlLang[locale]),
        );
        // Decoration: the sentence names the country, so the picture is not read as well.
        expect(flag.closest('[aria-hidden="true"]')).not.toBeNull();
        expect(within(banner()).queryAllByRole("img")).toHaveLength(0);
      },
    );

    it("draws no flag for a country the set lacks, and the sentence still names it", () => {
      setup("en", suggesting("en", { suggested: { country: "xx" } }));
      expect(slot("flag")).toBeNull();
      expect(messageText()).toContain(countryName("xx", "en-US"));
      expect(go()).toBeTruthy();
    });
  });

  describe("long names and long text", () => {
    it.each(["en", "de", "el", "fr"] as const)(
      "wraps South Georgia and the South Sandwich Islands in the link, the button and the sentence, in %s",
      (locale) => {
        setup(locale, suggesting(locale, { suggested: longSuggested }));
        const name = countryName("gs", htmlLang[locale]);
        expect(name.length).toBeGreaterThan(20);
        expect(go().textContent).toContain(name);
        expect(messageText()).toContain(name);
        for (const each of [banner(), ...banner().querySelectorAll("*")]) {
          expect(each.getAttribute("class") ?? "", each.tagName).not.toMatch(CLIPPING_CLASSES);
        }
        // A word that cannot break (a long name in one piece) still wraps inside the box.
        expect(go().className).toContain("wrap-anywhere");
        expect(go().className).toContain("max-w-full");
        expect(stay().className).toContain("wrap-anywhere");
        expect(stay().className).toContain("max-w-full");
        expect(slot("market-suggestion-message")?.className).toContain("wrap-break-word");
      },
    );

    it.each(["en", "de", "el", "fr"] as const)(
      "names a long current country on the stay button, in %s",
      (locale) => {
        setup(locale, suggesting(locale, { current: "gs" }));
        expect(stay().textContent).toContain(countryName("gs", htmlLang[locale]));
      },
    );

    it("has no fixed height: the strip grows with its text", () => {
      setup("de", suggesting("de", { suggested: longSuggested }));
      // The flag is a picture of a fixed size; the strip and its text are not.
      const classes = [...banner().querySelectorAll("*")]
        .filter((each) => each.closest('[data-slot="flag"]') === null)
        .map((each) => each.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)(?:h|max-h)-(?:\d|\[)/);
    });

    it("keeps both controls at 44 px, in every locale", () => {
      for (const locale of LOCALES) {
        const view = setup(locale, suggestions(locale).copy);
        expect(go().className).toContain("min-h-11");
        expect(stay().className).toContain("min-h-11");
        view.unmount();
      }
    });
  });

  describe("the markup", () => {
    it("is a section with the message in a paragraph and the two controls after it", () => {
      setup("en", suggestions("en").copy);
      expect(banner().tagName).toBe("SECTION");
      expect(banner().querySelector("p")?.contains(slot("market-suggestion-message"))).toBe(true);
      expect(banner().querySelector("p")?.querySelectorAll("a, button")).toHaveLength(0);
      const controls = [...banner().querySelectorAll("a, button")];
      expect(controls.map((control) => control.getAttribute("data-slot"))).toEqual([
        "market-suggestion-go",
        "market-suggestion-stay",
      ]);
    });

    it("puts no control inside another", () => {
      setup("en", suggestions("en").copy);
      for (const control of banner().querySelectorAll("a, button")) {
        expect(control.querySelectorAll("a, button")).toHaveLength(0);
      }
    });

    it("keeps its colours to the tokens: a secondary ground, the primary button, an outline button", () => {
      setup("en", suggestions("en").copy);
      expect(banner().className).toContain("bg-secondary");
      expect(banner().className).toContain("text-secondary-foreground");
      expect(go().className).toContain("bg-primary");
      expect(stay().className).toContain("bg-background");
    });

    it("passes className to the region", () => {
      setup("en", suggestions("en").copy, { className: "sticky top-0" });
      expect(banner().className).toContain("sticky top-0");
      expect(banner().className).toContain("bg-secondary");
    });
  });

  describe("on the server and after hydration", () => {
    it("renders the whole banner on the server, shown", () => {
      const html = renderToString(element("en", suggestions("en").copy));
      const view = document.createElement("div");
      view.innerHTML = html;
      expect(slot("market-suggestion-banner", view)).not.toBeNull();
      expect(slot("market-suggestion-go", view)?.getAttribute("href")).toBe(
        suggestions("en").copy.suggested.href,
      );
      expect(slot("flag", view)).not.toBeNull();
      expect(view.textContent).toContain("Stay in the United States store");
    });

    it.each(LOCALES)("hydrates the server's markup with no mismatch, in %s", async (locale) => {
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element(locale, suggestions(locale).copy));
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      await act(async () => {
        hydrateRoot(container, element(locale, suggestions(locale).copy), { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      // And it works once hydrated.
      fireEvent.click(stay());
      expect(banner()).toBeNull();
      container.remove();
      error.mockRestore();
    });
  });
});

describe("the server file (D49)", () => {
  const source = readFileSync(
    path.join(import.meta.dirname, "market-suggestion-banner.tsx"),
    "utf8",
  );

  it("is not a client component, and is where the flag is drawn", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(source).toContain('from "@shopblok/ui/atoms/flag"');
    expect(source).toContain('from "@shopblok/i18n/format"');
  });
});

describe("the client file (D49)", () => {
  const source = readFileSync(
    path.join(import.meta.dirname, "market-suggestion-banner-client.tsx"),
    "utf8",
  );
  // What the file imports, from the module specifiers (its header comment names the flag files).
  const specifiers = [...source.matchAll(/(?:from\s+|import\(\s*)["']([^"']+)["']/g)].map(
    (match) => match[1] ?? "",
  );

  it("is a client component", () => {
    expect(source).toMatch(/^"use client";?$/m);
    expect(specifiers.length).toBeGreaterThan(3);
  });

  it("imports neither atoms/flag nor country-flag-icons, so no flag's drawing is in a client chunk", () => {
    expect(specifiers.filter((each) => /(?:^|\/)flag(?:\.tsx)?$/.test(each))).toEqual([]);
    expect(specifiers.filter((each) => each.includes("country-flag-icons"))).toEqual([]);
  });

  it("imports neither flag-code nor any formatter, catalog or fixture: it takes the words made", () => {
    expect(specifiers.filter((each) => /flag-code/.test(each))).toEqual([]);
    expect(specifiers.filter((each) => /@shopblok\/(?:i18n|registry|fixtures)/.test(each))).toEqual(
      [],
    );
  });
});
