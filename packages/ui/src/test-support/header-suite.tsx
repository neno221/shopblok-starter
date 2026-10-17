// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13). What the six headers'
// tests share: one suite that every variant's test file runs (`describeHeader`), so the six keep the
// same promises, and the props a header takes built from the fixtures and the catalogs. A variant's
// own file adds what only it does (where its pieces sit, its extra props). The suite runs in
// Testing Library and happy-dom, which apply no CSS, so a width is read from the classes the markup
// carries (`hidden`, `lg:flex`, `lg:hidden`), as the organisms' tests read theirs; the browser
// checks of the design system are what see the pixels. A test file mocks `next/link` with
// `nextLinkStandIn` before it imports a header, so that `data-prefetch` says what every link got.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { NavItem } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { CartButton } from "../organisms/header/cart-button";
import type { HeaderProps } from "../organisms/header/parts";
import { CLIPPING_CLASSES, longLabels } from "./long-labels";

export const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
export const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

export const copyOf = (locale: Locale) => catalogs[locale].organisms;
export const fixturesOf = (locale: Locale) => commerceFixtures[locale];

/** The header the fixtures give every variant, with the catalogs' words, as a page would pass it. */
export function headerProps(locale: Locale = "en", over: Partial<HeaderProps> = {}): HeaderProps {
  return {
    ...fixturesOf(locale).header.content,
    copy: catalogs[locale].organisms,
    marketSwitcherCopy: catalogs[locale].molecules.marketSwitcher,
    locale: htmlLang[locale],
    prefetch: false,
    ...over,
  };
}

/** What a shop with nothing but a logo and a cart has: no navigation, no utilities, no bar. */
export const BARE: Partial<HeaderProps> = {
  navigation: [],
  utilities: { marketSwitcher: false },
  market: undefined,
  announcement: undefined,
};

export const header = () =>
  document.querySelector<HTMLElement>('header[data-slot="header"]') as HTMLElement;
export const skipLink = () =>
  document.querySelector<HTMLAnchorElement>('[data-slot="skip-link"]') as HTMLAnchorElement;
export const announcementBar = () =>
  document.querySelector<HTMLElement>('[data-slot="announcement-bar"]');
export const menuButton = () =>
  document.querySelector<HTMLButtonElement>('[data-slot="mobile-nav-trigger"]');
export const navigationLandmark = () => document.querySelector<HTMLElement>("nav");
export const carts = () => [...document.querySelectorAll<HTMLElement>('[data-slot="cart-button"]')];
export const logos = () => [...document.querySelectorAll<HTMLElement>('[data-slot="header-logo"]')];
export const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
/** The anchors a header draws, but the skip link, which is a plain in-page anchor. */
export const links = () =>
  [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].filter(
    (anchor) => anchor.getAttribute("data-slot") !== "skip-link",
  );

/** The elements from `element` up to `root` (not including it), the nearest first. */
function ancestors(element: Element, root: Element | null = header()): Element[] {
  const found: Element[] = [];
  for (
    let node: Element | null = element;
    node !== null && node !== root;
    node = node.parentElement
  )
    found.push(node);
  return found;
}
const hasClass = (element: Element, token: string) => element.classList.contains(token);

/** Whether the element, or a box around it, is `display: none` at the base width (`hidden`). */
export const hiddenBelowLg = (element: Element) =>
  ancestors(element).some((box) => hasClass(box, "hidden"));

/** The box that hides it below `lg` shows it again from `lg` (`lg:flex`, `lg:block`, `lg:inline-flex`). */
export const shownFromLg = (element: Element) => {
  const box = ancestors(element).find((candidate) => hasClass(candidate, "hidden"));
  return (
    box !== undefined && /(?:^|\s)lg:(?:flex|block|inline-flex|grid)(?:\s|$)/.test(box.className)
  );
};

/** Whether `a` comes before `b` in the document, which is the order a Tab follows. */
export const before = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

/** Every class of every element in `root` (SVG elements have no string `className`). */
export const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((element) => element.getAttribute("class") ?? "");

export type HeaderUnderTest = {
  /** The component's name, for the suite's title. */
  name: string;
  /** `data-variant`. */
  variant: string;
  Header: (props: HeaderProps) => ReactElement;
  /** The navigation is in the header from `lg`. `false`: the drawer alone holds it, at every width. */
  navigation: boolean;
  /**
   * What the header itself draws of the shop's utilities: the search, the account and the wishlist
   * (`all`), or the search alone (`search`), the account links being in the drawer's foot.
   */
  utilities: "all" | "search";
  /**
   * Where the market switcher is when the shop has one: in the row or the bar from `lg` and in the
   * drawer below it (`row`), in a bar at every width (`bar`), or only in the drawer's foot (`drawer`).
   */
  switcher: "row" | "bar" | "drawer";
};

function navLabels(locale: Locale): string[] {
  return fixturesOf(locale).navigation.map((item: NavItem) => item.label);
}

export function describeHeader(variant: HeaderUnderTest) {
  const { Header, name } = variant;
  const view = (locale: Locale = "en", over: Partial<HeaderProps> = {}) =>
    render(<Header {...headerProps(locale, over)} />);

  describe(`${name}: the page's landmarks and the skip link`, () => {
    it("is one banner, tagged with its variant, and nothing else in the page is a header", () => {
      view();
      expect(document.querySelectorAll("header")).toHaveLength(1);
      expect(header().getAttribute("data-variant")).toBe(variant.variant);
      expect(screen.getByRole("banner")).toBe(header());
    });

    it("has a skip link that is the first control a keyboard reaches, before the bar and the header", () => {
      view();
      expect(skipLink().tagName).toBe("A");
      expect(skipLink().getAttribute("href")).toBe("#main");
      expect(plain(skipLink().textContent)).toBe("Skip to content");
      expect(document.querySelector("a[href], button, input, select, textarea, [tabindex]")).toBe(
        skipLink(),
      );
      const bar = announcementBar();
      expect(bar).not.toBeNull();
      expect(before(skipLink(), bar as Element)).toBe(true);
      expect(before(bar as Element, header())).toBe(true);
      // The bar is not inside the header: a sticky header sticks alone and the bar scrolls away.
      expect(header().contains(bar)).toBe(false);
    });

    it("points the skip link at the page's `mainId`", () => {
      view("en", { mainId: "content" });
      expect(skipLink().getAttribute("href")).toBe("#content");
    });

    it("hides the skip link until it has focus, and gives it 44 px and a ring when it does", () => {
      view();
      expect(skipLink().className).toMatch(/(?:^|\s)sr-only(?:\s|$)/);
      expect(skipLink().className).toContain("focus:not-sr-only");
      expect(skipLink().className).toContain("focus:min-h-11");
      expect(skipLink().className).toContain("focus-visible:ring-ring");
    });

    it("names its landmarks apart: one banner, the navigation (when it has one) and the announcements", () => {
      view();
      const regions = [...document.querySelectorAll<HTMLElement>("section[aria-label]")];
      expect(regions.map((region) => region.getAttribute("aria-label"))).toEqual(["Announcements"]);
      const navs = [...document.querySelectorAll("nav")];
      expect(navs).toHaveLength(variant.navigation ? 1 : 0);
      for (const nav of navs) expect(nav.getAttribute("aria-label")).toBe("Main");
      expect(screen.getAllByRole("banner")).toHaveLength(1);
    });
  });

  describe(`${name}: the logo`, () => {
    it.each(LOCALES)("is a link home named for the store, in %s", (locale) => {
      view(locale);
      const { storeName, homeHref } = fixturesOf(locale).header.content;
      const label = formatMessage(copyOf(locale).header.home, { store: storeName }, locale);
      expect(logos().length).toBeGreaterThan(0);
      for (const logo of logos()) {
        expect(logo.tagName).toBe("A");
        expect(logo.getAttribute("href")).toBe(homeHref);
        expect(logo.getAttribute("aria-label")).toBe(label);
        expect(plain(logo.textContent)).toBe(storeName);
        expect(logo.className).toContain("min-h-11");
        expect(logo.className).toContain("focus-visible:ring-ring");
      }
      expect(screen.getAllByRole("link", { name: label }).length).toBe(logos().length);
    });

    it("draws the shop's own SVG when it gives one, and still names the link", () => {
      view("en", { logo: <svg data-testid="own-logo" viewBox="0 0 10 10" aria-hidden="true" /> });
      expect(screen.getAllByTestId("own-logo").length).toBe(logos().length);
      expect(logos()[0]?.getAttribute("aria-label")).toBe("Shopblok, home");
    });
  });

  describe(`${name}: the navigation`, () => {
    if (variant.navigation) {
      it.each(LOCALES)("is the main navigation from lg and hidden below it, in %s", (locale) => {
        view(locale);
        const nav = screen.getByRole("navigation", { name: copyOf(locale).header.navigation });
        expect(nav).toBe(navigationLandmark());
        expect(hiddenBelowLg(nav)).toBe(true);
        expect(shownFromLg(nav)).toBe(true);
        for (const label of navLabels(locale)) {
          expect(within(nav).getAllByText(label).length).toBeGreaterThan(0);
        }
      });

      it("is left out when the shop has no navigation, with no empty landmark", () => {
        view("en", { navigation: [] });
        expect(navigationLandmark()).toBeNull();
        expect(header()).toBeTruthy();
      });
    } else {
      it("has no navigation in the header at any width, whatever items the shop has", () => {
        view();
        expect(navigationLandmark()).toBeNull();
        expect(screen.queryByRole("navigation")).toBeNull();
        expect(within(header()).queryByText(navLabels("en")[1] ?? "")).toBeNull();
      });
    }

    it.each(LOCALES)("has a menu button named for its job, in %s", (locale) => {
      view(locale);
      const button = menuButton() as HTMLButtonElement;
      expect(button).not.toBeNull();
      expect(screen.getByRole("button", { name: copyOf(locale).mobileNavDrawer.open })).toBe(
        button,
      );
      expect(button.className).toContain("size-11");
      expect(header().contains(button)).toBe(true);
      if (variant.navigation) expect(button.className).toContain("lg:hidden");
      else expect(button.className).not.toContain("lg:hidden");
    });

    it("has no menu button when there is nothing for the drawer to hold", () => {
      view("en", BARE);
      expect(menuButton()).toBeNull();
      expect(document.querySelector('[data-slot="mobile-nav-trigger"]')).toBeNull();
    });

    it("has a menu button for the account links alone, which the drawer holds below lg", () => {
      view("en", { ...BARE, utilities: { account: "/us/account", marketSwitcher: false } });
      expect(menuButton()).not.toBeNull();
    });

    it("opens a sheet with the navigation, the account links and the switcher in its foot", async () => {
      view();
      const user = userEvent.setup();
      await user.click(menuButton() as HTMLButtonElement);
      const sheet = await waitFor(() => {
        const found = document.querySelector<HTMLElement>('[data-slot="mobile-nav-drawer"]');
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      for (const label of navLabels("en")) {
        expect(within(sheet).getAllByText(label).length).toBeGreaterThan(0);
      }
      const foot = sheet.querySelector<HTMLElement>('[data-slot="mobile-nav-foot"]') as HTMLElement;
      expect(within(foot).getByRole("link", { name: "Account" }).getAttribute("href")).toBe(
        "/us/account",
      );
      expect(within(foot).getByRole("link", { name: "Wishlist" })).toBeTruthy();
      expect(foot.querySelector('[data-slot="market-switcher"]')).not.toBeNull();
    });

    it("leaves the switcher out of the sheet's foot when the shop has none", async () => {
      view("en", {
        utilities: { ...fixturesOf("en").header.content.utilities, marketSwitcher: false },
      });
      const user = userEvent.setup();
      await user.click(menuButton() as HTMLButtonElement);
      const sheet = await waitFor(() => {
        const found = document.querySelector<HTMLElement>('[data-slot="mobile-nav-drawer"]');
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      expect(sheet.querySelector('[data-slot="market-switcher"]')).toBeNull();
    });
  });

  describe(`${name}: the utilities`, () => {
    it.each(LOCALES)(
      "links search, and the account and wishlist where it has them, in %s",
      (locale) => {
        view(locale);
        const { utilities } = fixturesOf(locale).header.content;
        const words = copyOf(locale).header;
        const search = screen.getByRole("link", { name: words.search });
        expect(search.getAttribute("href")).toBe(utilities.search);
        expect(search.getAttribute("data-slot")).toBe("header-search");
        if (variant.utilities === "all") {
          expect(screen.getByRole("link", { name: words.account }).getAttribute("href")).toBe(
            utilities.account,
          );
          expect(screen.getByRole("link", { name: words.wishlist }).getAttribute("href")).toBe(
            utilities.wishlist,
          );
        } else {
          // The drawer's foot holds them, and nothing else in the row would name them.
          expect(screen.queryByRole("link", { name: words.account })).toBeNull();
          expect(screen.queryByRole("link", { name: words.wishlist })).toBeNull();
        }
      },
    );

    it("keeps the search link at every width, and the account and wishlist for lg and up", () => {
      view();
      expect(hiddenBelowLg(slot("header-search") as HTMLElement)).toBe(false);
      for (const name of ["header-account", "header-wishlist"]) {
        const link = slot(name);
        if (variant.utilities === "search") {
          expect(link).toBeNull();
          continue;
        }
        // Below lg the drawer holds them.
        expect(hiddenBelowLg(link as HTMLElement)).toBe(true);
        expect(shownFromLg(link as HTMLElement)).toBe(true);
      }
    });

    it("draws each link only when the shop has it", () => {
      view("en", { utilities: { search: "/us/search", marketSwitcher: false }, market: undefined });
      expect(slot("header-search")).not.toBeNull();
      expect(slot("header-account")).toBeNull();
      expect(slot("header-wishlist")).toBeNull();
    });

    it("draws no utility of any kind for a shop with none", () => {
      view("en", BARE);
      expect(slot("header-search")).toBeNull();
      expect(slot("header-account")).toBeNull();
      expect(slot("header-wishlist")).toBeNull();
      expect(slot("market-switcher")).toBeNull();
      expect(slot("header-logo")).not.toBeNull();
      expect(carts()).toHaveLength(1);
    });

    if (variant.switcher === "drawer") {
      it("keeps the market switcher out of the row at every width: the drawer's foot is its place", () => {
        view();
        expect(header().querySelector('[data-slot="market-switcher"]')).toBeNull();
      });
    } else {
      it("draws the market switcher once, only when the shop has one", () => {
        const { unmount } = view();
        expect(document.querySelectorAll('[data-slot="market-switcher"]')).toHaveLength(1);
        expect(header().querySelector('[data-slot="market-switcher"]')).not.toBeNull();
        unmount();
        view("en", {
          utilities: { ...fixturesOf("en").header.content.utilities, marketSwitcher: false },
        });
        expect(slot("market-switcher")).toBeNull();
      });

      it("shows the switcher from lg only, or at every width in a bar", () => {
        view();
        const box = slot("market-switcher") as HTMLElement;
        if (variant.switcher === "row") {
          expect(hiddenBelowLg(box)).toBe(true);
          expect(shownFromLg(box)).toBe(true);
        } else {
          expect(hiddenBelowLg(box)).toBe(false);
          expect(box.closest('[data-slot="header-bar"]')).not.toBeNull();
        }
      });
    }

    it("does not draw the switcher when the shop turns it off, whatever markets it has", () => {
      view("en", {
        utilities: { ...fixturesOf("en").header.content.utilities, marketSwitcher: false },
      });
      expect(slot("market-switcher")).toBeNull();
    });
  });

  describe(`${name}: the announcement bar and the sticky header`, () => {
    it("draws the bar above the header when the shop has one, and not when it has none", () => {
      const { unmount } = view();
      expect(announcementBar()?.getAttribute("aria-label")).toBe("Announcements");
      expect(before(announcementBar() as Element, header())).toBe(true);
      unmount();
      view("en", { announcement: undefined });
      expect(announcementBar()).toBeNull();
      expect(document.querySelector("section[aria-label]")).toBeNull();
    });

    it("passes the bar its messages and the locale's words", () => {
      view("de");
      expect(announcementBar()?.getAttribute("aria-label")).toBe(
        copyOf("de").announcementBar.region,
      );
      expect(plain(announcementBar()?.textContent)).toContain(
        fixturesOf("de").header.content.announcement?.messages[0]?.message ?? "missing",
      );
    });

    it("sticks to the top of the window when `sticky`, and scrolls away when it is not", () => {
      const { unmount } = view("en", { sticky: true });
      expect(header().className).toMatch(/(?:^|\s)sticky(?:\s|$)/);
      expect(header().className).toMatch(/(?:^|\s)top-0(?:\s|$)/);
      expect(header().className).toContain("z-(--z-header)");
      unmount();
      view("en", { sticky: false });
      expect(header().className).not.toMatch(/(?:^|\s)sticky(?:\s|$)/);
      expect(header().className).toMatch(/(?:^|\s)relative(?:\s|$)/);
      expect(header().className).toContain("z-(--z-header)");
    });

    it("takes the page's classes on the header", () => {
      view("en", { className: "shadow-sm" });
      expect(header().className).toContain("shadow-sm");
    });
  });

  describe(`${name}: the cart (D44)`, () => {
    it.each(LOCALES)(
      "is the placeholder on the server's markup: one cart, no count, in %s",
      (locale) => {
        view(locale);
        expect(carts()).toHaveLength(1);
        const cart = carts()[0] as HTMLElement;
        expect(cart.getAttribute("href")).toBe(fixturesOf(locale).header.content.cartHref);
        expect(plain(cart.textContent)).toBe(copyOf(locale).header.cart);
        expect(cart.querySelector('[data-slot="cart-badge"]')).toBeNull();
        expect(header().contains(cart)).toBe(true);
      },
    );

    it("is visible at every width, and the last control a reader meets below lg", () => {
      view();
      const cart = carts()[0] as HTMLElement;
      expect(hiddenBelowLg(cart)).toBe(false);
      const controls = [...header().querySelectorAll("a[href], button")].filter(
        (control) => !hiddenBelowLg(control),
      );
      expect(controls.at(-1)).toBe(cart);
    });

    it("takes the page's island in its place, and draws no second cart", () => {
      view("en", {
        cart: (
          <CartButton
            href="/us/cart"
            count={3}
            copy={copyOf("en").header}
            locale="en-US"
            prefetch={false}
          />
        ),
      });
      expect(carts()).toHaveLength(1);
      expect(carts()[0]?.querySelector('[data-slot="cart-badge"]')?.textContent).toBe("3");
      expect(screen.getByRole("link", { name: "Cart 3 items" })).toBe(carts()[0]);
    });

    it("draws whatever the page puts in the slot, and no CartButton of its own", () => {
      view("en", { cart: <span data-testid="island">3</span> });
      expect(screen.getByTestId("island")).toBeTruthy();
      expect(carts()).toHaveLength(0);
    });

    it("writes more than 99 items as 99+ with the real number in the name", () => {
      view("de", {
        cart: (
          <CartButton
            href="/de/cart"
            count={120}
            copy={copyOf("de").header}
            locale="de-DE"
            prefetch={false}
          />
        ),
      });
      expect(screen.getByRole("link", { name: "Warenkorb 120 Artikel" })).toBe(carts()[0]);
      expect(carts()[0]?.querySelector('[data-slot="cart-badge"]')?.textContent).toBe("99+");
    });
  });

  describe(`${name}: links and long labels`, () => {
    it("draws every link with the `prefetch` the page gives, false for the design system", () => {
      view("en", { prefetch: false });
      expect(links().length).toBeGreaterThan(5);
      for (const anchor of links()) expect(anchor.getAttribute("data-prefetch")).toBe("false");
    });

    it("leaves `prefetch` to Next when the page says nothing", () => {
      view("en", { prefetch: undefined });
      for (const anchor of links()) expect(anchor.getAttribute("data-prefetch")).toBe("undefined");
    });

    it.each(longLabels)(
      "wraps the longest store name, navigation label and announcement and cuts none (%s)",
      (locale, strings) => {
        view(locale, {
          storeName: strings.storeName,
          navigation: [fixturesOf(locale).long.navItem, ...fixturesOf(locale).navigation.slice(1)],
          announcement: fixturesOf(locale).header.announcements.long,
        });
        for (const logo of logos()) {
          expect(plain(logo.textContent)).toBe(strings.storeName);
          expect(logo.getAttribute("aria-label")).toBe(
            formatMessage(copyOf(locale).header.home, { store: strings.storeName }, locale),
          );
        }
        if (variant.navigation) {
          expect(
            within(navigationLandmark() as HTMLElement).getAllByText(
              fixturesOf(locale).long.navItem.label,
            ).length,
          ).toBeGreaterThan(0);
        }
        for (const classes of classesIn(document.body))
          expect(classes).not.toMatch(CLIPPING_CLASSES);
      },
    );

    it("gives every control at least 44 px: the icon links and the cart are `size-11`", () => {
      view();
      for (const name of ["header-search", "header-account", "header-wishlist"]) {
        const link = slot(name);
        if (link === null) continue;
        expect(link.className).toMatch(/(?:^|\s)(?:size-11|min-h-11|h-11)(?:\s|$)/);
      }
      expect(carts()[0]?.className).toMatch(/(?:^|\s)size-11(?:\s|$)/);
    });
  });

  describe(`${name}: what the design system draws open`, () => {
    it("draws the drawer open at its first level, or at the level of an item", async () => {
      const { unmount } = view("en", { drawn: { drawer: {} } });
      await waitFor(() => expect(slot("mobile-nav-drawer")).not.toBeNull());
      expect(slot("mobile-nav-drawer")?.className).toContain("duration-0");
      // The page behind it stays reachable: not a modal, so the trigger is not inert.
      expect(menuButton()?.getAttribute("aria-expanded")).toBe("true");
      unmount();
      view("en", { drawn: { drawer: { level: 1 } } });
      await waitFor(() => expect(slot("mobile-nav-level")).not.toBeNull());
    });

    if (variant.navigation) {
      it("draws the panel of a navigation item open, capped for a box", async () => {
        view("en", { drawn: { panel: 1 } });
        await waitFor(() => expect(slot("mega-menu-panel")).not.toBeNull());
        expect(slot("mega-menu-panel")?.className).toContain("max-h-[30rem]");
        expect(slot("mega-menu-panel")?.className).not.toContain("max-h-(--available-height)");
      });

      it("takes the cap of the panel from the state that draws it", async () => {
        view("en", { drawn: { panel: 1, panelClassName: "max-h-96" } });
        await waitFor(() => expect(slot("mega-menu-panel")).not.toBeNull());
        expect(slot("mega-menu-panel")?.className).toContain("max-h-96");
        expect(slot("mega-menu-panel")?.className).not.toContain("max-h-[30rem]");
      });

      it("caps nothing when no panel is drawn open", () => {
        view("en");
        expect(slot("mega-menu-panel")).toBeNull();
      });
    }

    if (variant.switcher !== "drawer") {
      it.each(["popover", "drawer"] as const)("draws the switcher's %s open", async (form) => {
        view("en", { drawn: { switcher: form } });
        await waitFor(() => expect(slot("market-switcher-popup")).not.toBeNull());
        if (form === "drawer") {
          expect(slot("market-switcher-popup")?.className).toContain("duration-0");
          expect(slot("market-switcher-popup")?.className).toContain("[--bleed:0px]");
        }
      });
    }
  });
}
