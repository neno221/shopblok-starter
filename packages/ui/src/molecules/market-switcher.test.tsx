import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, countryName, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { MarketOption } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { MarketSwitcher, type MarketSwitcherProps } from "./market-switcher";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** The market each DS locale is in, and the language it reads. */
const home = {
  en: { country: "us", own: "English" },
  el: { country: "cy", own: "Ελληνικά" },
  de: { country: "de", own: "Deutsch" },
  fr: { country: "ch", own: "Français" },
} as const;

/** The props a test changes; `form` and `defaultOpen` are one union in the component, loose here. */
type Overrides = Partial<Omit<MarketSwitcherProps, "form" | "defaultOpen">> & {
  form?: "auto" | "popover" | "drawer";
  defaultOpen?: boolean;
};

/** Drawn as a popover, open and non-modal unless a test says otherwise. */
function setup(locale: Locale = "en", props: Overrides = {}) {
  const all = {
    markets: commerceFixtures[locale].markets,
    copy: catalogs[locale].molecules.marketSwitcher,
    locale: htmlLang[locale],
    form: "popover",
    defaultOpen: true,
    modal: false,
    ...props,
  } as MarketSwitcherProps;
  return render(<MarketSwitcher {...all} />);
}

function currencyOf(locale: Locale, country: string): string {
  const market = commerceFixtures[locale].markets.find((each) => each.country === country);
  if (market === undefined) throw new Error(`The fixtures have no market ${country}`);
  return market.currencyCode;
}

const trigger = () => document.querySelector("[data-slot=market-switcher-trigger]") as HTMLElement;

describe("MarketSwitcher", () => {
  describe("the trigger", () => {
    it.each(LOCALES)(
      "says what the control is and what it holds, in %s: the catalog's words, the market's names",
      (locale) => {
        setup(locale, { defaultOpen: false });
        const { country, own } = home[locale];
        const expected = formatMessage(
          catalogs[locale].molecules.marketSwitcher.trigger,
          {
            country: countryName(country, htmlLang[locale]),
            language: own,
            currency: currencyOf(locale, country),
          },
          htmlLang[locale],
        );
        expect(trigger().getAttribute("aria-label")).toBe(expected);
        expect(screen.getByRole("button", { name: expected })).toBe(trigger());
      },
    );

    it("reads 'Country and language: United States, English, USD' in English", () => {
      setup("en", { defaultOpen: false });
      expect(trigger().getAttribute("aria-label")).toBe(
        "Country and language: United States, English, USD",
      );
    });

    it("shows the flag, the country, the language and the currency code, all in the name", () => {
      setup("el", { defaultOpen: false });
      expect(within(trigger()).getByRole("img", { name: "Κύπρος", hidden: true })).toBeTruthy();
      const shown = trigger().textContent ?? "";
      for (const word of ["Κύπρος", "Ελληνικά", "EUR"]) {
        expect(shown).toContain(word);
        expect(trigger().getAttribute("aria-label")).toContain(word);
      }
    });

    it("is the only thing drawn until it is pressed: no popup in the page", () => {
      setup("en", { form: "auto", defaultOpen: undefined });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.querySelectorAll("[data-slot=market-switcher-trigger]")).toHaveLength(2);
    });

    it("is a 44 px control that wraps instead of cutting a long name", () => {
      setup("de", { defaultOpen: false });
      expect(trigger().className).toContain("min-h-11");
      expect(trigger().className).not.toMatch(CLIPPING_CLASSES);
      expect(trigger().className).toContain("max-w-full");
      expect(trigger().querySelector(".wrap-anywhere")).not.toBeNull();
    });
  });

  describe("the list", () => {
    it.each(LOCALES)(
      "names every country in the page's language, in %s, each with its flag",
      (locale) => {
        setup(locale);
        const dialog = screen.getByRole("dialog");
        const list = within(dialog).getByRole("list", {
          name: catalogs[locale].molecules.marketSwitcher.list,
        });
        const rows = list.querySelectorAll(":scope > li");
        expect(rows).toHaveLength(commerceFixtures[locale].markets.length);
        for (const market of commerceFixtures[locale].markets) {
          const name = countryName(market.country, htmlLang[locale]);
          // The flag is an image named by the country (D30).
          const flag = within(dialog).getAllByRole("img", { name, hidden: true });
          expect(flag.length).toBeGreaterThan(0);
          expect(flag[0]?.getAttribute("data-code")).toBe(market.flagCode);
          expect(within(dialog).getByRole("list", { name })).toBeTruthy();
        }
      },
    );

    it("lists the languages of a country with two (Switzerland) as links to their hrefs", () => {
      setup("fr");
      const dialog = screen.getByRole("dialog");
      const swiss = within(dialog).getByRole("list", { name: "Suisse" });
      const links = within(swiss).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toEqual(["/ch", "/ch/fr"]);
      expect(links.map((link) => link.textContent)).toEqual(["Deutsch", "Français"]);
      for (const link of links) expect(link.tagName).toBe("A");
    });

    it.each(LOCALES)("writes every language in its own language, in %s", (locale) => {
      setup(locale);
      const dialog = screen.getByRole("dialog");
      const names = [...dialog.querySelectorAll("a[href]")].map((link) => link.textContent);
      // The same seven links, whatever the page's language: English, Deutsch, Ελληνικά…
      expect(names.sort()).toEqual(
        ["Deutsch", "Deutsch", "English", "English", "Français", "Français", "Ελληνικά"].sort(),
      );
      for (const link of dialog.querySelectorAll("a[href]")) {
        expect(link.querySelector("[lang]")?.getAttribute("lang")).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      }
    });

    it.each(LOCALES)("marks exactly the market's own language as current, in %s", (locale) => {
      setup(locale);
      const dialog = screen.getByRole("dialog");
      const current = dialog.querySelectorAll("a[aria-current]");
      expect(current).toHaveLength(1);
      expect(current[0]?.textContent).toBe(home[locale].own);
      expect(current[0]?.getAttribute("aria-current")).toBe("true");
      expect(current[0]?.querySelector("svg")).not.toBeNull();
    });

    it("names a link by its language and its country, as the catalog words it", () => {
      setup("de");
      const dialog = screen.getByRole("dialog");
      const expected = formatMessage(
        catalogs.de.molecules.marketSwitcher.option,
        { language: "Français", country: countryName("ch", "de-DE") },
        "de-DE",
      );
      expect(expected).toBe("Français, Schweiz");
      expect(within(dialog).getByRole("link", { name: expected })).toBeTruthy();
    });

    it("keeps its close button, its title and its description in the catalog's words", () => {
      setup("el");
      const dialog = screen.getByRole("dialog", {
        name: catalogs.el.molecules.marketSwitcher.title,
      });
      expect(
        within(dialog).getByText(catalogs.el.molecules.marketSwitcher.description),
      ).toBeTruthy();
      expect(
        within(dialog).getByRole("button", { name: catalogs.el.molecules.marketSwitcher.close }),
      ).toBeTruthy();
    });
  });

  describe("its parts", () => {
    it("is a div with its own slot that takes the caller's class and attributes", () => {
      const { container } = setup("en", {
        defaultOpen: false,
        className: "ms-4",
        id: "switcher",
      });
      const root = container.querySelector("[data-slot=market-switcher]");
      expect(root?.tagName).toBe("DIV");
      expect(root?.className).toContain("ms-4");
      expect(root?.id).toBe("switcher");
    });

    it("gives the popup the caller's classes", async () => {
      setup("en", { popupClassName: "w-96" });
      const dialog = await screen.findByRole("dialog");
      expect(dialog.className).toContain("w-96");
      expect(dialog.getAttribute("data-slot")).toBe("market-switcher-popup");
    });

    it("draws nothing when it has no market", () => {
      const { container } = setup("en", { markets: [] });
      expect(container.innerHTML).toBe("");
    });

    it("falls back to the first market when none is current (the contract forbids it)", () => {
      const markets = commerceFixtures.en.markets.map((market) => ({
        ...market,
        languages: market.languages.map((language) => ({ ...language, current: false })),
      }));
      setup("en", { markets, defaultOpen: false });
      expect(trigger().getAttribute("aria-label")).toContain("Cyprus");
    });

    it("draws a code the flag set lacks as an empty frame with the country's name", () => {
      const nowhere: MarketOption = {
        country: "ZZ",
        flagCode: "ZZ",
        currencyCode: "EUR",
        languages: [{ language: "en", htmlLang: "en-GB", href: "/zz", current: false }],
      };
      setup("en", { markets: [...commerceFixtures.en.markets, nowhere] });
      const dialog = screen.getByRole("dialog");
      const frame = dialog.querySelector("[data-slot=flag][data-code=ZZ]");
      expect(frame).not.toBeNull();
      expect(frame?.tagName).toBe("SPAN");
    });

    it("refuses `defaultOpen` without a `form` (a type error, checked by tsc)", () => {
      const markets = commerceFixtures.en.markets;
      const copy = catalogs.en.molecules.marketSwitcher;
      const bad = (
        // @ts-expect-error -- `auto` draws two popups, so it cannot open one at first render.
        <MarketSwitcher markets={markets} copy={copy} locale="en-US" defaultOpen />
      );
      const good = (
        <MarketSwitcher markets={markets} copy={copy} locale="en-US" form="drawer" defaultOpen />
      );
      expect([bad, good]).toHaveLength(2);
    });
  });

  describe("long names", () => {
    /** A country whose name runs to 40 characters in English and longer in German and Greek. */
    const long: MarketOption = {
      country: "GS",
      flagCode: "GS",
      currencyCode: "GBP",
      languages: [{ language: "en", htmlLang: "en-GB", href: "/gs", current: false }],
    };

    it.each(LOCALES)(
      "wraps a country with a very long name instead of cutting it, in %s",
      (locale) => {
        setup(locale, { markets: [...commerceFixtures[locale].markets, long] });
        const dialog = screen.getByRole("dialog");
        const name = countryName("GS", htmlLang[locale]);
        expect(name.length).toBeGreaterThan(20);
        const label = within(dialog).getByText(name);
        expect(label.className).toContain("wrap-anywhere");
        expect(label.className).toContain("min-w-0");
        expect(label.className).not.toMatch(CLIPPING_CLASSES);
        for (const link of dialog.querySelectorAll("a[href]")) {
          expect(link.className).not.toMatch(CLIPPING_CLASSES);
          expect(link.className).toContain("wrap-anywhere");
        }
      },
    );

    it.each(longLabels)(
      "takes a %s catalog line at any length without a clipping class",
      (_l, strings) => {
        const copy = {
          ...catalogs.en.molecules.marketSwitcher,
          title: strings.productName,
          description: strings.productDescription,
        };
        setup("en", { copy });
        const dialog = screen.getByRole("dialog", { name: strings.productName });
        expect(within(dialog).getByText(strings.productDescription).className).not.toMatch(
          CLIPPING_CLASSES,
        );
      },
    );
  });

  describe("use", () => {
    it("opens from the keyboard (Enter) into the popup and closes on Escape, focus back", async () => {
      const user = userEvent.setup();
      setup("en", { defaultOpen: false, modal: undefined });
      const opener = trigger();
      opener.focus();
      await user.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog");
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(opener);
    });

    it("opens the sheet the same way", async () => {
      const user = userEvent.setup();
      setup("en", { form: "drawer", defaultOpen: false, modal: undefined });
      const opener = trigger();
      opener.focus();
      await user.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog");
      expect(dialog.getAttribute("data-slot")).toBe("market-switcher-popup");
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(document.activeElement).toBe(opener);
    });
  });

  describe("the file", () => {
    const source = readFileSync(path.join(import.meta.dirname, "market-switcher.tsx"), "utf8");

    it("is a server component: no 'use client', no hook", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
      expect(source).not.toMatch(/\buse(?:State|Effect|Ref|Id|Memo|Callback)\(/);
    });

    it("renders the flags on the server: it imports Flag and passes nodes to the client part", () => {
      expect(source).toMatch(/from "@shopblok\/ui\/atoms\/flag"/);
      expect(source).toMatch(/from "\.\/market-switcher-client"/);
    });
  });
});
