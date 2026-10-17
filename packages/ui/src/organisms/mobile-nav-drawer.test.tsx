// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). MobileNavDrawer's tests, in Testing
// Library and happy-dom: the menu button, the sheet and its first level, the levels with their back
// button and focus, the keyboard (a focus trap, Escape, and Escape inside the nested market
// switcher), the sheet drawn open for the design system, long labels, the props, and a read of the
// two files' imports (D49): the client part must not import the flag atom or the i18n index.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { NavItem } from "@shopblok/registry/contracts";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type NextLink from "next/link";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { MobileNavDrawer, type MobileNavDrawerProps } from "./mobile-nav-drawer";

// next/link is the real one; the mock only records the props each link was drawn with.
const drawnLinks: { href: unknown; prefetch: unknown }[] = [];
vi.mock("next/link", async () => {
  const React = await import("react");
  const actual = await vi.importActual<{ default: typeof NextLink }>("next/link");
  const Actual = actual.default;
  return {
    default: (props: ComponentProps<typeof NextLink>) => {
      drawnLinks.push({ href: props.href, prefetch: props.prefetch });
      return React.createElement(Actual, props);
    },
  };
});

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const content = (locale: Locale) => commerceFixtures[locale].header.mobileNav;
const copyOf = (locale: Locale) => catalogs[locale].organisms.mobileNavDrawer;
/** The fixtures' items: New in (a link), Women and Men (mega menus), Accessories (a dropdown), Sale. */
const [NEW_IN, WOMEN, MEN, ACCESSORIES, SALE] = [0, 1, 2, 3, 4] as const;

function drawer(locale: Locale = "en", props: Partial<MobileNavDrawerProps> = {}) {
  return (
    <>
      <button type="button">Before</button>
      <MobileNavDrawer
        {...content(locale)}
        copy={copyOf(locale)}
        marketSwitcherCopy={catalogs[locale].molecules.marketSwitcher}
        locale={htmlLang[locale]}
        prefetch={false}
        {...props}
      />
      <button type="button">After</button>
    </>
  );
}

const label = (locale: Locale, index: number) => content(locale).items[index]?.label ?? "";
const menuButton = () =>
  document.querySelector<HTMLButtonElement>(
    '[data-slot="mobile-nav-trigger"]',
  ) as HTMLButtonElement;
const dialog = () => document.querySelector<HTMLElement>('[data-slot="mobile-nav-drawer"]');
const body = () => dialog()?.querySelector<HTMLElement>('[data-slot="mobile-nav-body"]') ?? null;
const levelView = () => dialog()?.querySelector<HTMLElement>('[data-slot="mobile-nav-level"]');
const foot = () => dialog()?.querySelector<HTMLElement>('[data-slot="mobile-nav-foot"]');
const switcherTrigger = () =>
  document.querySelector<HTMLElement>('[data-slot="market-switcher-trigger"]');
const switcherPopup = () =>
  document.querySelector<HTMLElement>('[data-slot="market-switcher-popup"]');
/** The controls a Tab visits inside the sheet, in document order. */
const stops = () => [
  ...(dialog()?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []),
];
/** Every class of every element in `root` (SVG elements have no string `className`). */
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((element) => element.getAttribute("class") ?? "");

async function openSheet(locale: Locale = "en", props: Partial<MobileNavDrawerProps> = {}) {
  render(drawer(locale, props));
  const user = userEvent.setup();
  const opener = menuButton();
  await user.click(opener);
  await waitFor(() => expect(dialog()).not.toBeNull());
  return { user, opener };
}

/** Opens the sheet and the level of the item at `index`. */
async function openLevel(locale: Locale, index: number, props: Partial<MobileNavDrawerProps> = {}) {
  const { user, opener } = await openSheet(locale, props);
  const item = label(locale, index);
  await user.click(within(dialog() as HTMLElement).getByRole("button", { name: item }));
  await waitFor(() => expect(levelView()).toBeTruthy());
  return { user, opener, item };
}

describe("MobileNavDrawer: the menu button", () => {
  it.each(LOCALES)(
    "is the only thing drawn until it is pressed, named for its job, in %s",
    (locale) => {
      render(drawer(locale));
      const button = menuButton();
      expect(button.tagName).toBe("BUTTON");
      expect(screen.getByRole("button", { name: copyOf(locale).open })).toBe(button);
      expect(button.getAttribute("aria-haspopup")).toBe("dialog");
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(dialog()).toBeNull();
      expect(document.querySelector("[data-base-ui-portal]")).toBeNull();
      // The sheet's words are not in the page until it opens.
      expect(screen.queryByText(copyOf(locale).account)).toBeNull();
      expect(switcherTrigger()).toBeNull();
    },
  );

  it("is 44 px square, and takes the header's classes after its own", () => {
    render(drawer("en", { triggerClassName: "lg:hidden" }));
    expect(menuButton().className).toContain("size-11");
    expect(menuButton().className).toContain("lg:hidden");
    expect(menuButton().className).toContain("focus-visible:ring-ring");
    expect(menuButton().className).not.toMatch(/ring-ring\//);
  });

  it("holds an icon that is hidden from a reader, and the name as text", () => {
    render(drawer());
    expect(menuButton().querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(menuButton().textContent).toBe("Menu");
    expect(within(menuButton()).getByText("Menu").className).toContain("sr-only");
  });

  it.each([["{Enter}"], [" "]])("opens the sheet on %j from the keyboard", async (key) => {
    render(drawer());
    const user = userEvent.setup();
    menuButton().focus();
    await user.keyboard(key);
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
  });
});

describe("MobileNavDrawer: the open sheet", () => {
  it.each(LOCALES)(
    "is a dialog named for its title, with a close button, in %s",
    async (locale) => {
      await openSheet(locale);
      const sheet = screen.getByRole("dialog", { name: copyOf(locale).title });
      expect(sheet).toBe(dialog());
      expect(sheet.getAttribute("data-side")).toBe("inline-start");
      const close = within(sheet).getByRole("button", { name: copyOf(locale).close });
      expect(close.getAttribute("data-slot")).toBe("mobile-nav-close");
      expect(close.className).toContain("size-11");
      // The primitive's corner button is not drawn: this close button is the first control.
      expect(sheet.querySelectorAll('[data-slot="sheet-close"]')).toHaveLength(0);
      expect(sheet.querySelectorAll('[data-slot="mobile-nav-close"]')).toHaveLength(1);
      expect(stops()[0]).toBe(close);
    },
  );

  it.each(LOCALES)(
    "lists the items on its first level: links go places, the rest open a level, in %s",
    async (locale) => {
      await openSheet(locale);
      const sheet = dialog() as HTMLElement;
      const nav = within(sheet).getByRole("navigation", { name: copyOf(locale).title });
      const rows = within(nav).getAllByRole("listitem");
      expect(rows).toHaveLength(content(locale).items.length);
      content(locale).items.forEach((item, index) => {
        const row = rows[index] as HTMLElement;
        if (item.kind === "link") {
          const link = within(row).getByRole("link", { name: item.label });
          expect(link.getAttribute("href")).toBe(item.href);
        } else {
          const button = within(row).getByRole("button", { name: item.label });
          // A chevron that points to the level, mirrored in right-to-left, and hidden from a reader.
          const chevron = button.querySelector("svg");
          expect(chevron?.getAttribute("aria-hidden")).toBe("true");
          expect(chevron?.getAttribute("class")).toContain("rtl:rotate-180");
          expect(within(row).queryByRole("link")).toBeNull();
        }
      });
      // Only the first level's controls are in the sheet: no level's links are drawn yet.
      expect(within(sheet).queryByRole("button", { name: copyOf(locale).back })).toBeNull();
    },
  );

  it.each(LOCALES)(
    "ends with the account links, then the market switcher, in %s",
    async (locale) => {
      await openSheet(locale);
      const end = foot() as HTMLElement;
      expect(end).toBeTruthy();
      const account = within(end).getByRole("navigation", { name: copyOf(locale).account });
      const links = within(account).getAllByRole("link");
      expect(links.map((link) => link.textContent)).toEqual(
        content(locale).account.map((each) => each.label),
      );
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        content(locale).account.map((each) => each.href),
      );
      // The switcher is drawn by the server part as the sheet form, and comes last.
      const markets = switcherTrigger() as HTMLElement;
      expect(end.contains(markets)).toBe(true);
      expect(
        account.compareDocumentPosition(markets) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(document.querySelectorAll('[data-slot="market-switcher-trigger"]')).toHaveLength(1);
      expect(markets.className).not.toMatch(/(?:^|\s)(?:max-md:|md:)hidden/);
      expect(markets.className).toContain("w-full");
    },
  );

  it("leaves the switcher out when the content has no market, and the account group when it has no links", async () => {
    await openSheet("en", { market: undefined, account: [] });
    expect(switcherTrigger()).toBeNull();
    expect(within(foot() as HTMLElement).queryByRole("navigation")).toBeNull();
  });

  it("scrolls inside the sheet, so a short phone reaches every link", async () => {
    await openSheet();
    expect(body()?.className).toContain("overflow-y-auto");
    expect(body()?.className).toContain("min-h-0");
    expect(dialog()?.className).toContain("flex-col");
  });

  it("is a sheet that does not slide under prefers-reduced-motion, and takes the caller's classes", async () => {
    await openSheet("en", { popupClassName: "duration-0" });
    expect(dialog()?.className).toContain("motion-reduce:transition-none");
    expect(dialog()?.className).toContain("duration-0");
    expect(dialog()?.className).not.toContain("duration-200");
  });
});

describe("MobileNavDrawer: focus on the first level", () => {
  it("starts on the close button, the first control", async () => {
    await openSheet();
    expect(document.activeElement).toBe(
      within(dialog() as HTMLElement).getByRole("button", { name: "Close menu" }),
    );
  });

  it("keeps Tab inside the sheet, loop after loop, and Shift+Tab from the first goes round to the last", async () => {
    const { user } = await openSheet();
    const controls = stops();
    expect(controls.length).toBeGreaterThan(8);
    const seen: Element[] = [];
    for (let press = 0; press < controls.length * 2 + 1; press += 1) {
      await user.tab();
      const active = document.activeElement as HTMLElement;
      expect(dialog()?.contains(active), `after Tab ${press + 1}`).toBe(true);
      seen.push(active);
    }
    // Every control was visited, in the order of the document.
    for (const control of controls) expect(seen).toContain(control);
    expect(seen.slice(0, controls.length - 1)).toEqual(controls.slice(1));
    expect(seen[controls.length - 1]).toBe(controls[0]);
    // And backwards from the first control: the last one.
    (controls[0] as HTMLElement).focus();
    await user.tab({ shift: true });
    expect(dialog()?.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(controls.at(-1));
  });

  it("hides the page behind it from a reader while it is open, and shows it again once closed", async () => {
    const { user } = await openSheet();
    expect(screen.queryByRole("button", { name: "Before" })).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
  });

  it("closes on Escape with focus back on the menu button", async () => {
    const { user, opener } = await openSheet();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
    expect(opener.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes on its close button with focus back on the menu button", async () => {
    const { user, opener } = await openSheet();
    await user.click(within(dialog() as HTMLElement).getByRole("button", { name: "Close menu" }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("closes when a link is pressed, because the header outlives the page it leads to", async () => {
    await openSheet();
    const link = within(dialog() as HTMLElement).getByRole("link", { name: label("en", SALE) });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it("closes when an account link is pressed", async () => {
    await openSheet();
    const link = within(foot() as HTMLElement).getAllByRole("link")[0] as HTMLAnchorElement;
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    await waitFor(() => expect(dialog()).toBeNull());
  });
});

describe("MobileNavDrawer: a level", () => {
  it.each(LOCALES)(
    "shows a mega menu's shop-all link, columns and featured links, in %s",
    async (locale) => {
      const { item } = await openLevel(locale, WOMEN);
      const women = content(locale).items[WOMEN] as Extract<NavItem, { kind: "megaMenu" }>;
      const level = levelView() as HTMLElement;
      const shopAll = (what: string) =>
        plain(formatMessage(copyOf(locale).shopAll, { label: what }, htmlLang[locale]));
      // The heading names the level, and the links are a navigation named by it.
      const heading = within(level).getByRole("heading", { name: item });
      expect(heading.tagName).toBe("H3");
      const nav = within(level).getByRole("navigation", { name: item });
      // The item's own link first, then each column as a group, then the featured links.
      const links = within(nav).getAllByRole("link");
      expect(plain(links[0]?.textContent)).toBe(shopAll(women.label));
      expect(links[0]?.getAttribute("href")).toBe(women.href);
      for (const column of women.columns) {
        const group = within(nav).getByRole("group", { name: column.title });
        const names = within(group)
          .getAllByRole("link")
          .map((link) => plain(link.textContent));
        const expected = column.links.map((link) => link.label);
        expect(names).toEqual(
          column.href === undefined ? expected : [shopAll(column.title), ...expected],
        );
      }
      const featured = women.featured.map((tile) => tile.title);
      expect(links.slice(-featured.length).map((link) => link.textContent)).toEqual(featured);
      expect(links.slice(-featured.length).map((link) => link.getAttribute("href"))).toEqual(
        women.featured.map((tile) => tile.href),
      );
      // The first level's list and the foot are gone: a level has the whole height.
      expect(
        within(dialog() as HTMLElement).queryByRole("navigation", { name: copyOf(locale).title }),
      ).toBeNull();
      expect(foot()).toBeFalsy();
      expect(switcherTrigger()).toBeNull();
    },
  );

  it("leaves 'Shop all' out for a mega menu and a column that go nowhere", async () => {
    const women = content("en").items[WOMEN] as Extract<NavItem, { kind: "megaMenu" }>;
    const items: NavItem[] = [
      {
        ...women,
        href: undefined,
        columns: women.columns.map((column) => ({ ...column, href: undefined })),
      },
    ];
    const { user } = await openSheet("en", { items });
    await user.click(within(dialog() as HTMLElement).getByRole("button", { name: women.label }));
    await waitFor(() => expect(levelView()).toBeTruthy());
    expect(within(levelView() as HTMLElement).queryByText(/^Shop all/)).toBeNull();
  });

  it.each(LOCALES)(
    "shows a dropdown's links alone, with no 'Shop all' and no group, in %s",
    async (locale) => {
      const { item } = await openLevel(locale, ACCESSORIES);
      const accessories = content(locale).items[ACCESSORIES] as Extract<
        NavItem,
        { kind: "dropdown" }
      >;
      const nav = within(levelView() as HTMLElement).getByRole("navigation", { name: item });
      expect(
        within(nav)
          .getAllByRole("link")
          .map((link) => link.textContent),
      ).toEqual(accessories.items.map((link) => link.label));
      expect(within(nav).queryByRole("group")).toBeNull();
    },
  );

  it.each(LOCALES)("has a back button named for the level it returns to, in %s", async (locale) => {
    await openLevel(locale, MEN);
    const back = within(levelView() as HTMLElement).getByRole("button", {
      // The name keeps the catalog's no-break space, so it is not run through `plain`.
      name: formatMessage(copyOf(locale).back, { label: copyOf(locale).title }, htmlLang[locale]),
    });
    expect(back.getAttribute("data-slot")).toBe("mobile-nav-back");
    expect(back.className).toContain("min-h-11");
    expect(back.className).toContain("text-start");
    const icon = back.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("class")).toContain("rtl:rotate-180");
  });

  it("puts focus on the level's heading, so a reader hears where they are", async () => {
    const { item } = await openLevel("en", WOMEN);
    const heading = within(levelView() as HTMLElement).getByRole("heading", { name: item });
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute("tabindex")).toBe("-1");
    // It takes focus and is not a stop of the Tab order.
    expect(stops()).not.toContain(heading);
  });

  it("goes back to the first level with focus on the button that opened the level", async () => {
    const { user, item } = await openLevel("en", MEN);
    await user.click(
      within(levelView() as HTMLElement).getByRole("button", { name: "Back to Menu" }),
    );
    await waitFor(() => expect(levelView()).toBeFalsy());
    expect(document.activeElement).toBe(
      within(dialog() as HTMLElement).getByRole("button", { name: item }),
    );
    expect(foot()).toBeTruthy();
    // And another level opens the same way after it.
    await user.click(
      within(dialog() as HTMLElement).getByRole("button", { name: label("en", ACCESSORIES) }),
    );
    await waitFor(() => expect(levelView()).toBeTruthy());
    expect(document.activeElement).toBe(
      within(levelView() as HTMLElement).getByRole("heading", { name: label("en", ACCESSORIES) }),
    );
  });

  it("keeps Tab inside the sheet on a level too", async () => {
    const { user } = await openLevel("en", WOMEN);
    const controls = stops();
    for (let press = 0; press < controls.length + 2; press += 1) {
      await user.tab();
      expect(dialog()?.contains(document.activeElement), `after Tab ${press + 1}`).toBe(true);
    }
  });

  it("closes on Escape from a level, and opens again at the first level", async () => {
    const { user, opener } = await openLevel("en", WOMEN);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
    await user.click(opener);
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(levelView()).toBeFalsy();
    expect(within(dialog() as HTMLElement).getByRole("navigation", { name: "Menu" })).toBeTruthy();
    // Opened by a reader, so focus starts on the close button as it does the first time.
    expect(document.activeElement).toBe(
      within(dialog() as HTMLElement).getByRole("button", { name: "Close menu" }),
    );
  });

  it("closes when a link of a level is pressed", async () => {
    const { user } = await openLevel("en", WOMEN);
    const link = within(levelView() as HTMLElement).getAllByRole("link")[1] as HTMLAnchorElement;
    link.addEventListener("click", (event) => event.preventDefault());
    await user.click(link);
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it("scrolls a level to its top when it opens", async () => {
    const { user } = await openSheet();
    (body() as HTMLElement).scrollTop = 240;
    await user.click(
      within(dialog() as HTMLElement).getByRole("button", { name: label("en", WOMEN) }),
    );
    await waitFor(() => expect(levelView()).toBeTruthy());
    expect(body()?.scrollTop).toBe(0);
  });

  it("has 44 px rows, links, buttons and a ring at full strength on every control", async () => {
    await openSheet();
    const check = (controls: HTMLElement[]) => {
      expect(controls.length).toBeGreaterThan(8);
      for (const control of controls) {
        expect(control.className, plain(control.textContent)).toMatch(
          /(?:^|\s)(?:min-h-11|size-11)(?:\s|$)/,
        );
        expect(control.className).not.toMatch(/ring-ring\//);
      }
    };
    check(stops());
    const { user } = { user: userEvent.setup() };
    await user.click(
      within(dialog() as HTMLElement).getByRole("button", { name: label("en", WOMEN) }),
    );
    await waitFor(() => expect(levelView()).toBeTruthy());
    check(stops());
  });
});

describe("MobileNavDrawer: the market switcher inside the sheet", () => {
  it("opens its own sheet over the drawer, and Escape closes that first", async () => {
    const { user, opener } = await openSheet();
    const markets = switcherTrigger() as HTMLElement;
    await user.click(markets);
    await waitFor(() => expect(switcherPopup()).not.toBeNull());
    expect(dialog()).not.toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(switcherPopup()).toBeNull());
    // The drawer is still there, and focus is back on the control that opened the switcher.
    expect(dialog()).not.toBeNull();
    expect(document.activeElement).toBe(markets);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("names the switcher's sheet in the page's language", async () => {
    const { user } = await openSheet("de");
    await user.click(switcherTrigger() as HTMLElement);
    await waitFor(() => expect(switcherPopup()).not.toBeNull());
    expect(screen.getByRole("dialog", { name: catalogs.de.molecules.marketSwitcher.title })).toBe(
      switcherPopup(),
    );
  });
});

describe("MobileNavDrawer: drawn open at first render (the design system's states)", () => {
  it("draws the sheet with nothing taking focus, and takes it once a reader opens it again", async () => {
    render(drawer("en", { defaultOpen: true, modal: false }));
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(dialog()?.contains(document.activeElement)).toBe(false);
    expect(document.activeElement).toBe(document.body);
    const user = userEvent.setup();
    await user.click(within(dialog() as HTMLElement).getByRole("button", { name: "Close menu" }));
    await waitFor(() => expect(dialog()).toBeNull());
    await user.click(menuButton());
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(document.activeElement).toBe(
      within(dialog() as HTMLElement).getByRole("button", { name: "Close menu" }),
    );
  });

  it("leaves the page behind reachable with `modal={false}`, and hides it by default", async () => {
    const { unmount } = render(drawer("en", { defaultOpen: true, modal: false }));
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
    unmount();
    render(drawer("en", { defaultOpen: true }));
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(screen.queryByRole("button", { name: "Before" })).toBeNull();
  });

  it("draws the level of `defaultLevel`, with no focus moved", async () => {
    render(drawer("en", { defaultOpen: true, modal: false, defaultLevel: MEN }));
    await waitFor(() => expect(levelView()).toBeTruthy());
    expect(
      within(levelView() as HTMLElement).getByRole("heading", { name: label("en", MEN) }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
    expect(foot()).toBeFalsy();
  });

  it.each([
    ["a link", NEW_IN],
    ["an index past the items", 99],
    ["a negative index", -1],
  ])("starts at the first level when `defaultLevel` is %s", async (_name, defaultLevel) => {
    render(drawer("en", { defaultOpen: true, modal: false, defaultLevel }));
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(levelView()).toBeFalsy();
    expect(foot()).toBeTruthy();
  });

  it("goes back from a drawn level to the first level, and stays open", async () => {
    render(drawer("en", { defaultOpen: true, modal: false, defaultLevel: WOMEN }));
    await waitFor(() => expect(levelView()).toBeTruthy());
    const user = userEvent.setup();
    await user.click(
      within(levelView() as HTMLElement).getByRole("button", { name: "Back to Menu" }),
    );
    await waitFor(() => expect(levelView()).toBeFalsy());
    // No opener was pressed in this sheet, so there is no button to return to; nothing is lost.
    expect(dialog()).not.toBeNull();
    expect(foot()).toBeTruthy();
  });
});

describe("MobileNavDrawer: long labels", () => {
  it.each(longLabels)(
    "wraps a long %s label on the first level and on its level, and cuts nothing",
    async (locale) => {
      const item = commerceFixtures[locale].long.navItem;
      expect(item.label.length).toBeGreaterThan(30);
      if (item.kind !== "megaMenu") throw new Error("the long item is a mega menu");
      const { user } = await openSheet(locale, { items: [item] });
      const sheet = dialog() as HTMLElement;
      const opener = within(sheet).getByRole("button", { name: item.label });
      expect(opener.querySelector("span")?.className).toContain("wrap-anywhere");
      for (const classes of classesIn(sheet)) expect(classes).not.toMatch(CLIPPING_CLASSES);
      await user.click(opener);
      await waitFor(() => expect(levelView()).toBeTruthy());
      const level = levelView() as HTMLElement;
      expect(within(level).getByRole("heading", { name: item.label }).className).toContain(
        "wrap-anywhere",
      );
      for (const column of item.columns) {
        const group = within(level).getByRole("group", { name: column.title });
        expect(group.querySelector("p")?.className).toContain("wrap-anywhere");
        for (const link of column.links) {
          const found = within(group).getByRole("link", { name: link.label });
          expect(found.querySelector("span")?.className).toContain("wrap-anywhere");
        }
      }
      for (const classes of classesIn(sheet)) expect(classes).not.toMatch(CLIPPING_CLASSES);
      // The back button's words and the title wrap as well.
      const back = within(level).getByRole("button", { name: /\S/ });
      expect(back.querySelector("span")?.className).toContain("wrap-anywhere");
    },
  );
});

describe("MobileNavDrawer: props", () => {
  it("draws every link with the `prefetch` it was given", async () => {
    drawnLinks.length = 0;
    const { user } = await openSheet("en", { prefetch: false });
    await user.click(
      within(dialog() as HTMLElement).getByRole("button", { name: label("en", WOMEN) }),
    );
    await waitFor(() => expect(levelView()).toBeTruthy());
    expect(drawnLinks.length).toBeGreaterThan(8);
    expect(new Set(drawnLinks.map((link) => link.prefetch))).toEqual(new Set([false]));
  });

  it("leaves `prefetch` to next/link when it is not given", async () => {
    drawnLinks.length = 0;
    render(
      <MobileNavDrawer
        {...content("en")}
        copy={copyOf("en")}
        marketSwitcherCopy={catalogs.en.molecules.marketSwitcher}
        locale="en-US"
        defaultOpen
        modal={false}
      />,
    );
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(drawnLinks.length).toBeGreaterThan(3);
    expect(new Set(drawnLinks.map((link) => link.prefetch))).toEqual(new Set([undefined]));
  });

  it.each(LOCALES)(
    "formats 'Back to' and 'Shop all' for the page's locale, in %s",
    async (locale) => {
      await openLevel(locale, WOMEN);
      const back = within(levelView() as HTMLElement).getAllByRole("button")[0] as HTMLElement;
      expect(plain(back.textContent)).toBe(
        plain(
          formatMessage(copyOf(locale).back, { label: copyOf(locale).title }, htmlLang[locale]),
        ),
      );
      const women = content(locale).items[WOMEN];
      expect(plain(within(levelView() as HTMLElement).getAllByRole("link")[0]?.textContent)).toBe(
        plain(
          formatMessage(copyOf(locale).shopAll, { label: women?.label ?? "" }, htmlLang[locale]),
        ),
      );
    },
  );
});

describe("MobileNavDrawer: the console", () => {
  it.each(LOCALES)(
    "logs no error and no warning through open, a level, back, the switcher and Escape, in %s",
    async (locale) => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        const { user, opener } = await openLevel(locale, WOMEN);
        const back = within(levelView() as HTMLElement).getAllByRole("button")[0] as HTMLElement;
        await user.click(back);
        await waitFor(() => expect(levelView()).toBeFalsy());
        await user.click(switcherTrigger() as HTMLElement);
        await waitFor(() => expect(switcherPopup()).not.toBeNull());
        await user.keyboard("{Escape}");
        await waitFor(() => expect(switcherPopup()).toBeNull());
        await user.keyboard("{Escape}");
        await waitFor(() => expect(dialog()).toBeNull());
        expect(document.activeElement).toBe(opener);
        expect(errors).not.toHaveBeenCalled();
        expect(warnings).not.toHaveBeenCalled();
      } finally {
        errors.mockRestore();
        warnings.mockRestore();
      }
    },
  );
});

describe("the files (D49)", () => {
  const read = (name: string) => readFileSync(path.join(import.meta.dirname, name), "utf8");
  const specifiers = (source: string) =>
    [...source.matchAll(/(?:from\s+|import\(\s*)["']([^"']+)["']/g)].map((match) => match[1] ?? "");

  it("keeps the client part free of the flag atom, the flag package, formatters, catalogs and contracts", () => {
    const source = read("mobile-nav-drawer-client.tsx");
    expect(source).toMatch(/^"use client";?$/m);
    const imported = specifiers(source);
    expect(imported.filter((each) => /atoms\/flag|country-flag-icons/.test(each))).toEqual([]);
    expect(imported.filter((each) => /@shopblok\/(?:i18n|registry|fixtures)/.test(each))).toEqual(
      [],
    );
    expect(imported.filter((each) => /market-switcher/.test(each))).toEqual([]);
  });

  it("makes the words and the switcher on the server, and is no client component", () => {
    const source = read("mobile-nav-drawer.tsx");
    expect(source).not.toMatch(/^"use client"/m);
    const imported = specifiers(source);
    expect(imported).toContain("@shopblok/i18n/format");
    expect(imported).toContain("@shopblok/ui/molecules/market-switcher");
    expect(imported).toContain("./mobile-nav-drawer-client");
    expect(source).toContain('form="drawer"');
  });
});
