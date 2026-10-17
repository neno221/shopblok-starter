// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §13). MegaMenu's tests, in Testing Library
// and happy-dom: the one landmark, the three kinds of item, a mega menu's panel and a dropdown's, the
// keyboard and the pointer, the panel drawn open for the design system, sizes and long labels, the
// props, and a read of the two files' imports (D49). happy-dom has no layout, so the panel's width
// is checked as what the primitive hands Base UI (the root as the anchor, `--anchor-width` on the
// positioner) and the classes that use it; the lead's browser checks measure the real thing.
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
import { MegaMenu, type MegaMenuProps } from "./mega-menu";

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
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const navigation = (locale: Locale) => commerceFixtures[locale].navigation;
const megaMenus = (locale: Locale) =>
  navigation(locale).filter((item): item is Extract<NavItem, { kind: "megaMenu" }> => {
    return item.kind === "megaMenu";
  });
/** The fixtures' bar: New in (a link), Women and Men (mega menus), Accessories (a dropdown), Sale. */
const [NEW_IN, WOMEN, MEN, ACCESSORIES, SALE] = [0, 1, 2, 3, 4] as const;

function bar(locale: Locale = "en", props: Partial<MegaMenuProps> = {}) {
  return (
    <>
      <button type="button">Before</button>
      <MegaMenu
        items={navigation(locale)}
        copy={catalogs[locale].organisms.megaMenu}
        label={catalogs[locale].organisms.header.navigation}
        locale={htmlLang[locale]}
        prefetch={false}
        {...props}
      />
      <button type="button">After</button>
    </>
  );
}

const label = (locale: Locale, index: number) => navigation(locale)[index]?.label ?? "";
const trigger = (locale: Locale, index: number) =>
  screen.getByRole("button", { name: label(locale, index) });
const panel = () => document.querySelector<HTMLElement>('[data-slot="mega-menu-panel"]');
const positioner = () => panel()?.closest<HTMLElement>('[role="presentation"]') ?? null;
const panelLinks = () => [...(panel()?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [])];

/** Draws the bar, focuses the trigger and presses Enter; resolves once the panel is in the document. */
async function openWithEnter(locale: Locale, index: number, props: Partial<MegaMenuProps> = {}) {
  render(bar(locale, props));
  const user = userEvent.setup();
  const opener = trigger(locale, index);
  opener.focus();
  await user.keyboard("{Enter}");
  await waitFor(() => expect(panel()).not.toBeNull());
  return { user, opener };
}

/** Every class of every element in `root` (SVG elements have no string `className`). */
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((element) => element.getAttribute("class") ?? "");

describe("MegaMenu: the landmark and the bar", () => {
  it.each(LOCALES)("is one navigation landmark named by `label`, in %s", (locale) => {
    render(bar(locale));
    const landmarks = screen.getAllByRole("navigation");
    expect(landmarks).toHaveLength(1);
    expect(landmarks[0]?.getAttribute("aria-label")).toBe(
      catalogs[locale].organisms.header.navigation,
    );
    expect(landmarks[0]?.getAttribute("data-slot")).toBe("mega-menu");
  });

  it("takes its name from `label`, whatever it says", () => {
    render(bar("en", { label: "Shop" }));
    expect(screen.getByRole("navigation", { name: "Shop" })).toBeTruthy();
  });

  it("stays one landmark while a panel is open: the panel is not a second <nav>", async () => {
    await openWithEnter("en", WOMEN);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(panel()?.closest("nav")).toBeNull();
    expect(document.querySelectorAll("nav")).toHaveLength(1);
  });

  it.each(LOCALES)(
    "draws a link as a link, a dropdown and a mega menu as buttons, in %s",
    (locale) => {
      render(bar(locale));
      const nav = screen.getByRole("navigation");
      for (const index of [NEW_IN, SALE]) {
        const link = within(nav).getByRole("link", { name: label(locale, index) });
        const item = navigation(locale)[index];
        expect(link.getAttribute("href")).toBe(item?.kind === "link" ? item.href : null);
      }
      for (const index of [WOMEN, MEN, ACCESSORIES]) {
        const button = trigger(locale, index);
        expect(button.getAttribute("aria-expanded")).toBe("false");
        expect(button.getAttribute("data-slot")).toBe("navigation-menu-trigger");
      }
      expect(within(nav).getAllByRole("listitem")).toHaveLength(navigation(locale).length);
    },
  );

  it("draws nothing but the bar until a trigger is used: no panel, no portal", () => {
    render(bar());
    expect(panel()).toBeNull();
    expect(document.querySelector("[data-base-ui-portal]")).toBeNull();
  });

  it("takes the caller's class on the root", () => {
    render(bar("en", { className: "ms-4" }));
    expect(screen.getByRole("navigation").className).toContain("ms-4");
  });

  it("is as wide as its row: no max-width, wrapping rather than overflowing", () => {
    render(bar());
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("max-w-none");
    expect(nav.className).toContain("flex-wrap");
    expect(nav.querySelector("ul")?.className).toContain("flex-wrap");
  });
});

describe("MegaMenu: the split navigation of the centered header", () => {
  const center = <a href="/us">Store, home</a>;

  it("draws two lists in the one landmark with `center` between them", () => {
    render(bar("en", { splitAt: 2, center }));
    const nav = screen.getByRole("navigation");
    const lists = nav.querySelectorAll("ul");
    expect(lists).toHaveLength(2);
    const names = (list: Element | undefined) =>
      [...(list?.querySelectorAll(":scope > li") ?? [])].map((item) => plain(item.textContent));
    expect(names(lists[0])).toEqual([label("en", NEW_IN), label("en", WOMEN)]);
    expect(names(lists[1])).toEqual([
      label("en", MEN),
      label("en", ACCESSORIES),
      label("en", SALE),
    ]);
    const home = within(nav).getByRole("link", { name: "Store, home" });
    expect(lists[0]?.compareDocumentPosition(home)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(home.compareDocumentPosition(lists[1] as Element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(nav.querySelectorAll("nav")).toHaveLength(0);
  });

  it("puts the second half at the end of its space", () => {
    render(bar("en", { splitAt: 2, center }));
    const [first, second] = screen.getByRole("navigation").querySelectorAll("ul");
    expect(first?.className).toContain("flex-1");
    expect(second?.className).toContain("flex-1");
    expect(second?.className).toContain("justify-end");
    expect(first?.className).not.toContain("justify-end");
  });

  it("tabs through the first half, the centre, then the second half", async () => {
    const user = userEvent.setup();
    render(bar("en", { splitAt: 2, center }));
    screen.getByRole("button", { name: "Before" }).focus();
    const seen: string[] = [];
    for (let press = 0; press < 7; press += 1) {
      await user.tab();
      seen.push(plain(document.activeElement?.textContent));
    }
    expect(seen).toEqual(["New in", "Women", "Store, home", "Men", "Accessories", "Sale", "After"]);
  });

  it("draws one list when splitAt is out of range, and no centre without it", () => {
    const { unmount } = render(bar("en", { splitAt: 0, center }));
    expect(screen.getByRole("navigation").querySelectorAll("ul")).toHaveLength(1);
    unmount();
    const { unmount: again } = render(bar("en", { splitAt: 99, center }));
    expect(screen.getByRole("navigation").querySelectorAll("ul")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Store, home" })).toBeTruthy();
    again();
    render(bar("en", { splitAt: 2 }));
    expect(document.querySelector('[data-slot="mega-menu-center"]')).toBeNull();
    expect(screen.getByRole("navigation").querySelectorAll("ul")).toHaveLength(2);
  });
});

describe("MegaMenu: a mega menu's panel", () => {
  it.each(LOCALES)(
    "opens with the item's own link first, then the columns as groups, in %s",
    async (locale) => {
      await openWithEnter(locale, WOMEN);
      const women = megaMenus(locale)[0];
      const copy = catalogs[locale].organisms.megaMenu;
      const shop = (what: string) => formatMessage(copy.shopAll, { label: what }, htmlLang[locale]);
      const links = panelLinks();
      expect(plain(links[0]?.textContent)).toBe(plain(shop(women?.label ?? "")));
      expect(links[0]?.getAttribute("href")).toBe(women?.href);
      for (const column of women?.columns ?? []) {
        const group = within(panel() as HTMLElement).getByRole("group", { name: column.title });
        const inside = [...group.querySelectorAll("a[href]")].map((link) =>
          plain(link.textContent),
        );
        const expected = column.links.map((link) => link.label);
        // "Shop all …" only for a column that goes somewhere.
        if (column.href !== undefined) expected.unshift(plain(shop(column.title)));
        expect(inside).toEqual(expected.map(plain));
        expect(within(group).queryAllByRole("link").length).toBe(expected.length);
      }
    },
  );

  it("leaves out 'Shop all' for a column or an item that goes nowhere", async () => {
    const women = megaMenus("en")[0] as Extract<NavItem, { kind: "megaMenu" }>;
    const items: NavItem[] = [
      {
        ...women,
        href: undefined,
        columns: women.columns.map((column) => ({ ...column, href: undefined })),
      },
    ];
    render(bar("en", { items }));
    const user = userEvent.setup();
    screen.getByRole("button", { name: women.label }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(panelLinks().map((link) => plain(link.textContent))).not.toContainEqual(
      expect.stringMatching(/^Shop all/),
    );
    expect(panelLinks()).toHaveLength(women.columns.flatMap((column) => column.links).length + 2);
  });

  it.each(LOCALES)("names the featured tiles' group and draws each tile, in %s", async (locale) => {
    await openWithEnter(locale, WOMEN);
    const women = megaMenus(locale)[0];
    const featured = within(panel() as HTMLElement).getByRole("group", {
      name: catalogs[locale].organisms.megaMenu.featured,
    });
    const tiles = featured.querySelectorAll('[data-slot="mega-menu-feature"]');
    expect(tiles).toHaveLength(2);
    for (const [index, tile] of [...tiles].entries()) {
      const feature = women?.featured[index];
      // The title is the link, and its name is the title alone: the picture is beside it.
      const link = within(tile as HTMLElement).getByRole("link", { name: feature?.title });
      expect(link.getAttribute("href")).toBe(feature?.href);
      const image = tile.querySelector("img");
      expect(image?.getAttribute("alt")).toBe(feature?.image.alt);
      expect(link.contains(image)).toBe(false);
      // The link's ::after covers the tile, so the whole tile is the target.
      expect(link.className).toContain("after:absolute");
      expect(link.className).toContain("after:inset-0");
      expect((tile as HTMLElement).className).toContain("relative");
    }
  });

  it("draws one tile for a menu with one", async () => {
    await openWithEnter("en", MEN);
    expect(panel()?.querySelectorAll('[data-slot="mega-menu-feature"]')).toHaveLength(1);
  });

  it("draws no featured group for a menu with no tiles", async () => {
    const men = megaMenus("en")[1] as Extract<NavItem, { kind: "megaMenu" }>;
    render(bar("en", { items: [{ ...men, featured: [] }] }));
    screen.getByRole("button", { name: men.label }).focus();
    await userEvent.setup().keyboard("{Enter}");
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(panel()?.querySelector('[data-slot="mega-menu-features"]')).toBeNull();
    expect(panel()?.querySelector('[data-slot="mega-menu-columns"]')).not.toBeNull();
  });

  it("is as wide as the root: the positioner takes Base UI's anchor width, and the popup fills it", async () => {
    await openWithEnter("en", WOMEN);
    const box = positioner();
    expect(box?.className).toContain("w-(--anchor-width)");
    expect(box?.className).toContain("h-auto");
    expect(box?.className).not.toContain("w-(--positioner-width)");
    const popup = panel()?.closest<HTMLElement>("[data-base-ui-portal] > div > div");
    expect(popup?.tagName).toBe("DIV");
    expect(popup?.className).toContain("w-full");
    expect(popup?.className).not.toContain("w-(--popup-width)");
    // Against the bar, with no gap, and never flipped above it.
    expect(popup?.className).toContain("rounded-t-none");
  });

  it("anchors the panel to the root, not to the trigger", async () => {
    const rect = (width: number, height: number) =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON() {},
      }) as DOMRect;
    const spy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return this.getAttribute("data-slot") === "mega-menu" ? rect(1000, 48) : rect(90, 44);
      });
    try {
      await openWithEnter("en", WOMEN);
      await waitFor(() =>
        expect(positioner()?.style.getPropertyValue("--anchor-width")).toBe("1000px"),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("lays its parts out by the room they have, not by the screen: a grid of tracks, wrapping", async () => {
    await openWithEnter("en", WOMEN);
    const columns = panel()?.querySelector('[data-slot="mega-menu-columns"]');
    expect(columns?.className).toContain(
      "grid-cols-[repeat(auto-fill,minmax(min(11rem,100%),1fr))]",
    );
    expect(columns?.className).toContain("min-w-0");
    expect(panel()?.firstElementChild?.className).toContain("flex-wrap");
    // The panel scrolls inside the room Base UI says is left, rather than past the screen.
    expect(panel()?.className).toContain("max-h-(--available-height)");
    expect(panel()?.className).toContain("overflow-y-auto");
  });

  it("marks the panel, in place of the primitive's slot", async () => {
    await openWithEnter("en", WOMEN);
    expect(panel()?.getAttribute("data-slot")).toBe("mega-menu-panel");
    expect(document.querySelectorAll('[data-slot="navigation-menu-content"]')).toHaveLength(0);
  });
});

describe("MegaMenu: a dropdown's panel", () => {
  it.each(LOCALES)(
    "lists the links narrow, with no groups and no 'Shop all', in %s",
    async (locale) => {
      await openWithEnter(locale, ACCESSORIES);
      const dropdown = navigation(locale)[ACCESSORIES];
      const expected = dropdown?.kind === "dropdown" ? dropdown.items : [];
      expect(panelLinks().map((link) => plain(link.textContent))).toEqual(
        expected.map((link) => plain(link.label)),
      );
      expect(panelLinks().map((link) => link.getAttribute("href"))).toEqual(
        expected.map((link) => link.href),
      );
      expect(within(panel() as HTMLElement).queryAllByRole("group")).toHaveLength(0);
      // Narrow, under its own trigger.
      const box = positioner();
      expect(box?.className).toContain("w-(--positioner-width)");
      expect(box?.className).not.toContain("w-(--anchor-width)");
      expect(panel()?.querySelector("ul")?.className).toContain("max-w-72");
    },
  );

  it("switches the panel between a dropdown's and a mega menu's as the open item changes", async () => {
    const user = userEvent.setup();
    render(bar());
    await user.hover(trigger("en", ACCESSORIES));
    await waitFor(() => expect(positioner()?.className).toContain("w-(--positioner-width)"));
    await user.hover(trigger("en", MEN));
    await waitFor(() => expect(positioner()?.className).toContain("w-(--anchor-width)"));
    await user.hover(trigger("en", ACCESSORIES));
    await waitFor(() => expect(positioner()?.className).toContain("w-(--positioner-width)"));
  });

  it("keeps a mega menu's shape while the panel closes, so it does not jump", async () => {
    const { user } = await openWithEnter("en", WOMEN);
    expect(positioner()?.className).toContain("w-(--anchor-width)");
    await user.keyboard("{Escape}");
    // The close is not waited for: whatever is still drawn is still the wide panel.
    const leaving = positioner();
    if (leaving !== null) expect(leaving.className).toContain("w-(--anchor-width)");
    await waitFor(() => expect(panel()).toBeNull());
  });
});

describe("MegaMenu: opening and closing by keyboard (SPEC §13)", () => {
  it.each([["Enter"], [" "], ["ArrowDown"]])(
    "%j on a trigger opens its panel, focus staying on it",
    async (key) => {
      const user = userEvent.setup();
      render(bar());
      const opener = trigger("en", WOMEN);
      opener.focus();
      expect(panel()).toBeNull();
      await user.keyboard(key === " " ? " " : `{${key}}`);
      await waitFor(() => expect(panel()).not.toBeNull());
      expect(opener.getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(opener);
      expect(opener.getAttribute("aria-controls")).toBe(positioner()?.querySelector("[id]")?.id);
    },
  );

  it("opens a dropdown the same way", async () => {
    const { opener } = await openWithEnter("en", ACCESSORIES);
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    expect(panelLinks().length).toBeGreaterThan(0);
  });

  it("Enter again closes it", async () => {
    const { user, opener } = await openWithEnter("en", WOMEN);
    // Base UI keeps a just-opened panel open for 500 ms against a click that is an accident.
    await sleep(600);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(panel()).toBeNull());
    expect(opener.getAttribute("aria-expanded")).toBe("false");
  });

  it("Tab goes from the trigger into the panel, and Shift+Tab from its first link back", async () => {
    const { user, opener } = await openWithEnter("en", WOMEN);
    await user.tab();
    const first = panelLinks()[0];
    await waitFor(() => expect(document.activeElement).toBe(first));
    await user.tab({ shift: true });
    await waitFor(() => expect(document.activeElement).toBe(opener));
    expect(panel()).not.toBeNull();
  });

  it("Tab visits every link of the panel in order, and no other control", async () => {
    const { user } = await openWithEnter("en", WOMEN);
    const links = panelLinks();
    expect(links.length).toBeGreaterThan(10);
    for (const link of links) {
      await user.tab();
      await waitFor(() => expect(document.activeElement).toBe(link));
    }
  });

  it("Tab past the panel's last link closes it, and focus lands on the next item", async () => {
    const { user } = await openWithEnter("en", WOMEN);
    const stops = panelLinks().length;
    // The trigger, then one press for each link, then one past the last.
    for (let press = 0; press <= stops; press += 1) await user.tab();
    await waitFor(() => expect(panel()).toBeNull());
    expect(document.activeElement).toBe(trigger("en", MEN));
    expect(trigger("en", WOMEN).getAttribute("aria-expanded")).toBe("false");
  });

  it("closes when the arrow keys move focus to another item of the bar", async () => {
    const { user } = await openWithEnter("en", WOMEN);
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(document.activeElement).toBe(trigger("en", MEN)));
    await waitFor(() => expect(panel()).toBeNull());
  });

  it("closes when Shift+Tab moves focus to the item before it", async () => {
    const { user } = await openWithEnter("en", WOMEN);
    await user.tab({ shift: true });
    await waitFor(() => expect(panel()).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole("link", { name: label("en", NEW_IN) }));
  });

  it("closes when Tab leaves the whole bar from its last item, and focus goes on to the page", async () => {
    // The dropdown is the last item here, so the next stop after its links is outside the bar.
    const { user } = await openWithEnter("en", ACCESSORIES, {
      items: navigation("en").slice(0, ACCESSORIES + 1),
    });
    const count = panelLinks().length;
    for (let press = 0; press < count; press += 1) await user.tab();
    expect(panelLinks().at(-1)).toBe(document.activeElement);
    await user.tab();
    await waitFor(() => expect(panel()).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
  });

  it("Escape closes the panel with focus on the trigger, from the trigger and from inside", async () => {
    const { user, opener } = await openWithEnter("en", WOMEN);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(panel()).toBeNull());
    expect(document.activeElement).toBe(opener);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(panel()).not.toBeNull());
    await user.tab();
    await user.tab();
    expect(panel()?.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(panel()).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("opens again with Enter after Escape", async () => {
    const { user } = await openWithEnter("en", WOMEN);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(panel()).toBeNull());
    await user.keyboard("{Enter}");
    await waitFor(() => expect(panel()).not.toBeNull());
  });

  it("closes a panel when the page is pressed outside it", async () => {
    const user = userEvent.setup();
    await openWithEnter("en", WOMEN);
    await user.click(screen.getByRole("button", { name: "After" }));
    await waitFor(() => expect(panel()).toBeNull());
  });
});

describe("MegaMenu: the pointer (SPEC §13)", () => {
  it("opens on hover, and a hover on another trigger switches the panel", async () => {
    const user = userEvent.setup();
    render(bar());
    await user.hover(trigger("en", WOMEN));
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(panelLinks()[0]?.textContent).toBe("Shop all Women");
    await user.hover(trigger("en", MEN));
    await waitFor(() => expect(panelLinks()[0]?.textContent).toBe("Shop all Men"));
    expect(document.querySelectorAll('[data-slot="mega-menu-panel"]')).toHaveLength(1);
  });

  it("stays open while the pointer is over the trigger or over the panel", async () => {
    const user = userEvent.setup();
    render(bar());
    const opener = trigger("en", WOMEN);
    await user.hover(opener);
    await waitFor(() => expect(panel()).not.toBeNull());
    // From the trigger to the panel: past the close delay, still open.
    await user.hover(panelLinks()[2] as HTMLElement);
    await sleep(600);
    expect(panel()).not.toBeNull();
    // And back to the trigger.
    await user.hover(opener);
    await sleep(600);
    expect(panel()).not.toBeNull();
  });

  it("closes when the pointer leaves both, after a delay that forgives a small gap", async () => {
    const user = userEvent.setup();
    render(bar());
    const opener = trigger("en", WOMEN);
    await user.hover(opener);
    await waitFor(() => expect(panel()).not.toBeNull());
    await user.unhover(opener);
    // Not at once: 200 ms is the grace a pointer crossing a gap gets.
    expect(panel()).not.toBeNull();
    await waitFor(() => expect(panel()).toBeNull(), { timeout: 2000 });
  });

  it("opens an item on a click, and a click on another trigger opens that one", async () => {
    const user = userEvent.setup();
    render(bar());
    await user.click(trigger("en", WOMEN));
    await waitFor(() => expect(panelLinks()[0]?.textContent).toBe("Shop all Women"));
    // A click with no pointer travel before it (a touch, a screen reader's activation) switches the
    // panel. With a mouse, the pointer's arrival on the trigger had already switched it, and Base UI
    // then reads the click as a second press on an open item and closes it.
    fireEvent.click(trigger("en", MEN));
    await waitFor(() => expect(panelLinks()[0]?.textContent).toBe("Shop all Men"));
    await waitFor(() =>
      expect(document.querySelectorAll('[data-slot="mega-menu-panel"]')).toHaveLength(1),
    );
  });

  it("closes the panel when a link in it is pressed (the bar outlives the page it leads to)", async () => {
    await openWithEnter("en", WOMEN);
    const link = panelLinks()[3] as HTMLAnchorElement;
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    await waitFor(() => expect(panel()).toBeNull());
  });
});

describe("MegaMenu: drawn open at first render (the design system's states)", () => {
  it("draws the chosen item's panel with no focus taken", async () => {
    render(bar("en", { defaultOpenItem: WOMEN }));
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(trigger("en", WOMEN).getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(document.body);
    expect(positioner()?.className).toContain("w-(--anchor-width)");
  });

  it("draws a dropdown open the same way, narrow", async () => {
    render(bar("en", { defaultOpenItem: ACCESSORIES }));
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(positioner()?.className).toContain("w-(--positioner-width)");
  });

  it("draws nothing open for a link or an index that is not an item", () => {
    for (const defaultOpenItem of [NEW_IN, 99]) {
      const { unmount } = render(bar("en", { defaultOpenItem }));
      expect(panel()).toBeNull();
      unmount();
    }
  });

  it("lands in the container an overlay box names (D45)", async () => {
    const { PortalContainerProvider } = await import("../primitives/portal-container");
    const { useState } = await import("react");
    function Boxed() {
      const [box, setBox] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setBox} data-testid="box">
          <PortalContainerProvider container={box}>
            <MegaMenu
              items={navigation("en")}
              copy={catalogs.en.organisms.megaMenu}
              label="Main"
              locale="en-US"
              prefetch={false}
              defaultOpenItem={WOMEN}
            />
          </PortalContainerProvider>
        </div>
      );
    }
    render(<Boxed />);
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(screen.getByTestId("box").contains(panel())).toBe(true);
  });
});

describe("MegaMenu: sizes, wrapping and motion", () => {
  it("has 44 px triggers, links and panel links, with the ring at full strength (D32, D35)", async () => {
    render(bar("en", { defaultOpenItem: WOMEN }));
    await waitFor(() => expect(panel()).not.toBeNull());
    const controls = [
      ...screen.getByRole("navigation").querySelectorAll<HTMLElement>("a[href], button"),
      ...panelLinks(),
    ];
    expect(controls.length).toBeGreaterThan(15);
    for (const control of controls) {
      expect(control.className, plain(control.textContent)).toMatch(
        /(?:^|\s)(?:min-h-11|size-11)(?:\s|$)/,
      );
      expect(control.className).not.toMatch(/ring-ring\//);
    }
  });

  it.each(longLabels)(
    "wraps a long %s label in the bar and in the panel, and cuts nothing",
    async (locale) => {
      const item = commerceFixtures[locale].long.navItem;
      expect(item.label.length).toBeGreaterThan(30);
      render(bar(locale, { items: [item], defaultOpenItem: 0 }));
      await waitFor(() => expect(panel()).not.toBeNull());
      const opener = screen.getByRole("button", { name: item.label });
      expect(opener.className).toContain("wrap-anywhere");
      expect(opener.className).toContain("max-w-full");
      const everything = [
        ...classesIn(screen.getByRole("navigation")),
        ...classesIn(panel() as HTMLElement),
      ];
      for (const classes of everything) expect(classes).not.toMatch(CLIPPING_CLASSES);
      if (item.kind !== "megaMenu") throw new Error("the long item is a mega menu");
      for (const column of item.columns) {
        const group = within(panel() as HTMLElement).getByRole("group", { name: column.title });
        expect(group.querySelector("p")?.className).toContain("wrap-anywhere");
        for (const link of column.links) {
          const found = within(group).getByRole("link", { name: link.label });
          expect(found.className).toContain("wrap-anywhere");
        }
      }
      expect(
        within(panel() as HTMLElement).getByRole("link", { name: item.featured[0]?.title }),
      ).toBeTruthy();
    },
  );

  it("moves nothing under prefers-reduced-motion: no transition on the positioner, popup or panel", async () => {
    render(bar("en", { defaultOpenItem: WOMEN }));
    await waitFor(() => expect(panel()).not.toBeNull());
    const popup = positioner()?.firstElementChild as HTMLElement;
    for (const element of [positioner(), popup, panel()]) {
      expect(element?.className).toContain("motion-reduce:transition-none");
    }
  });
});

describe("MegaMenu: props", () => {
  it("draws the same links with `prefetch` as it is given: false for the design system, unset for a shop", async () => {
    drawnLinks.length = 0;
    const { unmount } = render(bar("en", { defaultOpenItem: WOMEN }));
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(drawnLinks.length).toBeGreaterThan(15);
    expect(new Set(drawnLinks.map((link) => link.prefetch))).toEqual(new Set([false]));
    unmount();
    drawnLinks.length = 0;
    render(bar("en", { prefetch: undefined, defaultOpenItem: WOMEN }));
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(new Set(drawnLinks.map((link) => link.prefetch))).toEqual(new Set([undefined]));
  });

  it("puts `panelClassName` on every panel's content, after the panel's own (the design system's cap)", async () => {
    const { unmount } = render(bar("en", { defaultOpenItem: WOMEN, panelClassName: "max-h-96" }));
    await waitFor(() => expect(panel()).not.toBeNull());
    // tailwind-merge drops the panel's own max-height for the caller's.
    expect(panel()?.className).toContain("max-h-96");
    expect(panel()?.className).not.toContain("max-h-(--available-height)");
    expect(panel()?.className).toContain("overflow-y-auto");
    unmount();
    render(bar("en", { defaultOpenItem: ACCESSORIES, panelClassName: "max-h-96" }));
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(panel()?.className).toContain("max-h-96");
    expect(panel()?.className).toContain("p-2");
  });

  it("caps a mega menu's panel at the room the window leaves, and scrolls inside it, by default", async () => {
    render(bar("en", { defaultOpenItem: WOMEN }));
    await waitFor(() => expect(panel()).not.toBeNull());
    expect(panel()?.className).toContain("max-h-(--available-height)");
    expect(panel()?.className).toContain("overflow-y-auto");
  });

  it.each(LOCALES)("formats 'Shop all' for the page's locale, in %s", async (locale) => {
    render(bar(locale, { defaultOpenItem: WOMEN }));
    await waitFor(() => expect(panel()).not.toBeNull());
    const women = megaMenus(locale)[0];
    expect(plain(panelLinks()[0]?.textContent)).toBe(
      plain(
        formatMessage(
          catalogs[locale].organisms.megaMenu.shopAll,
          { label: women?.label ?? "" },
          htmlLang[locale],
        ),
      ),
    );
  });
});

describe("MegaMenu: the console", () => {
  it.each(LOCALES)(
    "logs no error and no warning through open, Escape, hover and Tab, in %s",
    async (locale) => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      try {
        const { user, opener } = await openWithEnter(locale, WOMEN);
        await user.keyboard("{Escape}");
        await waitFor(() => expect(panel()).toBeNull());
        expect(document.activeElement).toBe(opener);
        await user.hover(trigger(locale, ACCESSORIES));
        await waitFor(() => expect(panel()).not.toBeNull());
        await user.tab();
        await user.tab();
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

  it("keeps the client part free of formatters, catalogs and contracts: it takes the words made", () => {
    const source = read("mega-menu-client.tsx");
    expect(source).toMatch(/^"use client";?$/m);
    expect(
      specifiers(source).filter((each) => /@shopblok\/(?:i18n|registry|fixtures)/.test(each)),
    ).toEqual([]);
  });

  it("makes the words on the server, from @shopblok/i18n/format, and is no client component", () => {
    const source = read("mega-menu.tsx");
    expect(source).not.toMatch(/^"use client"/m);
    expect(specifiers(source)).toContain("@shopblok/i18n/format");
    expect(specifiers(source)).toContain("./mega-menu-client");
  });
});
