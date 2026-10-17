import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import {
  MarketSwitcherOverlay,
  type MarketSwitcherClientProps,
  type MarketSwitcherCountry,
} from "./market-switcher-client";

// The client part takes words and flag nodes already made; these stand in for the server's.
const flag = (code: string) => <svg data-testid={`flag-${code}`} role="img" aria-label={code} />;

function country(
  code: string,
  name: string,
  currency: string,
  languages: [string, string, string, string, boolean][],
): MarketSwitcherCountry {
  return {
    country: code,
    name,
    currency,
    flag: flag(code),
    languages: languages.map(([language, htmlLang, languageName, href, current]) => ({
      language,
      htmlLang,
      name: languageName,
      label: `${languageName}, ${name}`,
      href,
      current,
    })),
  };
}

const countries = [
  country("CY", "Cyprus", "EUR", [
    ["el", "el-CY", "Ελληνικά", "/", true],
    ["en", "en-CY", "English", "/en", false],
  ]),
  country("US", "United States", "USD", [["en", "en-US", "English", "/us", false]]),
  country("CH", "Switzerland", "CHF", [
    ["de", "de-CH", "Deutsch", "/ch/de", false],
    ["fr", "fr-CH", "Français", "/ch/fr", false],
  ]),
];

const props: MarketSwitcherClientProps = {
  current: {
    flag: flag("CY"),
    country: "Cyprus",
    language: "Ελληνικά",
    htmlLang: "el-CY",
    currency: "EUR",
  },
  triggerLabel: "Country and language: Cyprus, Ελληνικά, EUR",
  title: "Country and language",
  description: "Your country sets the currency.",
  closeLabel: "Close",
  listLabel: "Countries and languages",
  countries,
};

function setup(overrides: Partial<MarketSwitcherClientProps> = {}) {
  return render(
    <>
      <button type="button">Before</button>
      <MarketSwitcherOverlay {...props} {...overrides} />
      <button type="button">After</button>
    </>,
  );
}

const trigger = (index = 0) =>
  document.querySelectorAll<HTMLElement>("[data-slot=market-switcher-trigger]")[
    index
  ] as HTMLElement;
const popup = () => document.querySelector<HTMLElement>("[data-slot=market-switcher-popup]");
const links = (within_: HTMLElement) => within_.querySelectorAll<HTMLElement>("a[href]");

describe("MarketSwitcherOverlay: the two forms", () => {
  it("draws a popover trigger and a sheet trigger, and CSS shows one per breakpoint", () => {
    setup();
    const triggers = document.querySelectorAll("[data-slot=market-switcher-trigger]");
    expect(triggers).toHaveLength(2);
    const [popover, sheet] = [...triggers];
    // From `md` up the popover's trigger; below it the sheet's: no matchMedia, so the server and
    // the browser draw the same markup.
    expect(popover?.className).toContain("max-md:hidden");
    expect(popover?.className).not.toMatch(/(?:^|\s)md:hidden/);
    expect(sheet?.className).toContain("md:hidden");
    expect(sheet?.className).not.toContain("max-md:hidden");
    // The two differ in what they open, not in what they say.
    expect(popover?.getAttribute("aria-label")).toBe(props.triggerLabel);
    expect(sheet?.getAttribute("aria-label")).toBe(props.triggerLabel);
    expect(popover?.getAttribute("aria-haspopup")).toBe("dialog");
    expect(sheet?.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("draws one form alone, with no hiding class, when `form` says which", () => {
    const { unmount } = setup({ form: "popover" });
    expect(document.querySelectorAll("[data-slot=market-switcher-trigger]")).toHaveLength(1);
    expect(trigger().className).not.toMatch(/(?:^|\s)(?:max-md:|md:)hidden/);
    unmount();
    setup({ form: "drawer" });
    expect(document.querySelectorAll("[data-slot=market-switcher-trigger]")).toHaveLength(1);
    expect(trigger().className).not.toMatch(/(?:^|\s)(?:max-md:|md:)hidden/);
  });

  it("opens nothing at first render unless a form is chosen and `defaultOpen` is set", () => {
    const { unmount } = setup({ defaultOpen: true });
    // `auto` would open two popups at once, so it opens none.
    expect(popup()).toBeNull();
    unmount();
    setup({ form: "popover", defaultOpen: true, modal: false });
    expect(popup()).not.toBeNull();
  });

  it("shows the current market on the trigger: flag, country, language and currency", () => {
    setup({ form: "popover" });
    const shown = trigger();
    expect(within(shown).getByTestId("flag-CY")).toBeTruthy();
    expect(shown.textContent).toContain("Cyprus");
    expect(shown.textContent).toContain("Ελληνικά");
    expect(shown.textContent).toContain("EUR");
    // The trigger is named for what it is, and the name holds each visible word (WCAG 2.5.3).
    const name = shown.getAttribute("aria-label") ?? "";
    for (const word of ["Cyprus", "Ελληνικά", "EUR"]) expect(name).toContain(word);
    // The language is read in its own language (WCAG 3.1.2).
    expect(shown.querySelector("[lang=el-CY]")?.textContent).toBe("Ελληνικά");
    // 44 px, and a long name wraps instead of being cut.
    expect(shown.className).toContain("min-h-11");
    expect(shown.className).not.toMatch(CLIPPING_CLASSES);
    expect(shown.getAttribute("data-slot")).toBe("market-switcher-trigger");
  });
});

describe.each(["popover", "drawer"] as const)("MarketSwitcherOverlay as a %s", (form) => {
  async function open() {
    const user = userEvent.setup();
    setup({ form });
    const opener = trigger();
    opener.focus();
    await user.keyboard("{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Country and language" });
    return { user, opener, dialog };
  }

  it("opens from the keyboard into a named dialog that says what it is for", async () => {
    const { opener, dialog } = await open();
    expect(popup()).toBe(dialog);
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    expect(within(dialog).getByText("Your country sets the currency.")).toBeTruthy();
    expect(within(dialog).getByRole("list", { name: "Countries and languages" })).toBeTruthy();
  });

  it("moves focus inside when it opens", async () => {
    const { dialog } = await open();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("keeps Tab and Shift+Tab inside, going round more than once", async () => {
    const { user, dialog } = await open();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    // The close button and the five language links: six stops.
    const stops = dialog.querySelectorAll("button, a[href]").length;
    expect(stops).toBe(6);
    for (let press = 0; press < stops * 2 + 2; press += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement), `Tab ${press + 1}`).toBe(true);
    }
    for (let press = 0; press < stops * 2 + 2; press += 1) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement), `Shift+Tab ${press + 1}`).toBe(true);
    }
  });

  it("reaches every language link and the close button with Tab", async () => {
    const { user, dialog } = await open();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    const reached = new Set<Element | null>();
    for (let press = 0; press < 8; press += 1) {
      await user.tab();
      reached.add(document.activeElement);
    }
    for (const control of dialog.querySelectorAll("button, a[href]")) {
      expect(reached.has(control), control.textContent ?? "").toBe(true);
    }
  });

  it("closes on Escape and gives focus back to the trigger", async () => {
    const { user, opener } = await open();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
    expect(opener.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes with its visible close button, focus back on the trigger", async () => {
    const { user, opener, dialog } = await open();
    const close = within(dialog).getByRole("button", { name: "Close" });
    expect(close.className).toContain("size-11");
    expect(close.textContent).toBe("");
    await user.click(close);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("lists each country with its flag and its languages, each language a plain link", async () => {
    const { dialog } = await open();
    const rows = dialog.querySelectorAll("li[data-country]");
    expect([...rows].map((row) => row.getAttribute("data-country"))).toEqual(["CY", "US", "CH"]);
    expect(within(dialog).getByTestId("flag-US")).toBeTruthy();
    const all = links(dialog);
    expect([...all].map((link) => link.getAttribute("href"))).toEqual([
      "/",
      "/en",
      "/us",
      "/ch/de",
      "/ch/fr",
    ]);
    for (const link of all) {
      expect(link.tagName).toBe("A");
      expect(link.className).toContain("min-h-11");
      expect(link.className).not.toMatch(CLIPPING_CLASSES);
    }
    // Each country's languages are a list named by the country.
    const swiss = within(dialog).getByRole("list", { name: "Switzerland" });
    expect(within(swiss).getAllByRole("link")).toHaveLength(2);
  });

  it("names a link by its language and its country, and the language in its own language", async () => {
    const { dialog } = await open();
    expect(within(dialog).getByRole("link", { name: "English, United States" })).toBeTruthy();
    const french = within(dialog).getByRole("link", { name: "Français, Switzerland" });
    expect(french.getAttribute("hreflang")).toBe("fr-CH");
    expect(french.querySelector("[lang=fr-CH]")?.textContent).toBe("Français");
  });

  it("marks the current language with aria-current and a visible check, not by colour alone", async () => {
    const { dialog } = await open();
    const current = dialog.querySelectorAll("[aria-current]");
    expect(current).toHaveLength(1);
    const link = current[0] as HTMLElement;
    expect(link.getAttribute("aria-current")).toBe("true");
    expect(link.textContent).toBe("Ελληνικά");
    expect(link.querySelector("svg")).not.toBeNull();
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    // The others carry no mark.
    const other = within(dialog).getByRole("link", { name: "English, Cyprus" });
    expect(other.hasAttribute("aria-current")).toBe(false);
    expect(other.querySelector("svg")).toBeNull();
  });

  it("scrolls its list rather than growing past the screen", async () => {
    const { dialog } = await open();
    const list = within(dialog).getByRole("list", { name: "Countries and languages" });
    expect(list.className).toContain("overflow-y-auto");
    expect(list.className).toContain("max-h-");
    // A focused link's ring (3 px) is not cut off by the scroll area.
    expect(list.className).toContain("p-1");
  });

  it("takes no focus when it is drawn open at first render, and takes it when the reader opens it", async () => {
    const user = userEvent.setup();
    setup({ form, defaultOpen: true, modal: false });
    const dialog = await screen.findByRole("dialog", { name: "Country and language" });
    // Several drawn open on one page would take focus from each other, and close.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(dialog.contains(document.activeElement)).toBe(false);
    await user.keyboard("{Escape}");
    await user.click(trigger());
    const again = await screen.findByRole("dialog", { name: "Country and language" });
    await waitFor(() => expect(again.contains(document.activeElement)).toBe(true));
  });

  it("opens drawn, with the page behind reachable, when told (`defaultOpen`, `modal={false}`)", async () => {
    setup({ form, defaultOpen: true, modal: false });
    const dialog = await screen.findByRole("dialog", { name: "Country and language" });
    expect(dialog.getAttribute("data-slot")).toBe("market-switcher-popup");
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    expect(document.querySelector("[data-slot=drawer-overlay]")).toBeNull();
  });
});

describe("MarketSwitcherOverlay: what is modal", () => {
  it("hides the page behind the sheet from assistive technology while it is open", async () => {
    const user = userEvent.setup();
    setup({ form: "drawer" });
    await user.click(trigger());
    await screen.findByRole("dialog");
    expect(
      screen.getByText("Before").closest("[data-base-ui-inert]")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("traps the popover's focus without locking the page: no backdrop, no overlay", async () => {
    const user = userEvent.setup();
    setup({ form: "popover" });
    await user.click(trigger());
    await screen.findByRole("dialog");
    expect(document.querySelector("[data-slot=drawer-overlay]")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("MarketSwitcherOverlay: width", () => {
  it("keeps the popover within the room Base UI says is left (a narrow cell, a small screen)", async () => {
    setup({ form: "popover", defaultOpen: true, modal: false });
    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toContain("max-w-(--available-width)");
    expect(dialog.className).toContain("w-[min(26rem,calc(100vw-2rem))]");
  });
});

describe("the client file (D49)", () => {
  const source = readFileSync(path.join(import.meta.dirname, "market-switcher-client.tsx"), "utf8");
  // What the file imports, from the module specifiers (its header comment names the flag files).
  const specifiers = [...source.matchAll(/(?:from\s+|import\(\s*)["']([^"']+)["']/g)].map(
    (match) => match[1] ?? "",
  );

  it("is a client component", () => {
    expect(source).toMatch(/^"use client";?$/m);
    expect(specifiers.length).toBeGreaterThan(5);
  });

  it("imports neither atoms/flag nor country-flag-icons, so no flag's drawing is in a client chunk", () => {
    expect(specifiers.filter((each) => /(?:^|\/)flag(?:\.tsx)?$/.test(each))).toEqual([]);
    expect(specifiers.filter((each) => each.includes("country-flag-icons"))).toEqual([]);
  });

  it("imports no formatter and no catalog either: it takes the words made", () => {
    expect(specifiers.filter((each) => /@shopblok\/(?:i18n|registry|fixtures)/.test(each))).toEqual(
      [],
    );
  });
});
