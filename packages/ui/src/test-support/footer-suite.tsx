// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4 and §13). What the five footers'
// tests share: one suite that every variant's test file runs (`describeFooter`), so the five keep the
// same promises, and the props a footer takes built from the fixtures and the catalogs. A variant's
// own file adds what only it does (where its pieces sit). Like the headers' suite it runs in Testing
// Library and happy-dom, which apply no CSS, so a width is read from the classes the markup carries
// (`hidden`, `md:hidden`, `md:grid`); the browser checks of the design system see the pixels. A test
// file mocks `next/link` with `nextLinkStandIn` before it imports a footer, so that `data-prefetch`
// says what every link got.
import { commerceFixtures, designSystemFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { SocialNetwork } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { paymentMarks } from "../atoms/payment-marks";
import type { FooterProps } from "../organisms/footer/parts";
import { socialMarks } from "../organisms/footer/social-marks";
import { before, classesIn, htmlLang, plain } from "./header-suite";
import { CLIPPING_CLASSES, longLabels } from "./long-labels";

export { before, classesIn, htmlLang, plain };

export const copyOf = (locale: Locale) => catalogs[locale].organisms.footer;
export const fixturesOf = (locale: Locale) => commerceFixtures[locale];

/** The footer the fixtures give every variant, with the catalogs' words, as a page would pass it. */
export function footerProps(locale: Locale = "en", over: Partial<FooterProps> = {}): FooterProps {
  return {
    ...fixturesOf(locale).footer.content,
    copy: catalogs[locale].organisms.footer,
    newsletterCopy: catalogs[locale].molecules.newsletterForm,
    marketSwitcherCopy: catalogs[locale].molecules.marketSwitcher,
    locale: htmlLang[locale],
    prefetch: false,
    ...over,
  };
}

/** The least a shop can have, whole: the fixtures' `bare` footer, with the same words around it. */
export function bareProps(locale: Locale = "en", over: Partial<FooterProps> = {}): FooterProps {
  return {
    ...fixturesOf(locale).footer.bare,
    copy: catalogs[locale].organisms.footer,
    newsletterCopy: catalogs[locale].molecules.newsletterForm,
    marketSwitcherCopy: catalogs[locale].molecules.marketSwitcher,
    locale: htmlLang[locale],
    prefetch: false,
    ...over,
  };
}

/** A profile on each of the eight networks, in the contract's order. */
export const allNetworks: FooterProps["social"] = SocialNetwork.options.map((network) => ({
  network,
  href: `https://example.com/${network}`,
}));

export const footer = () =>
  document.querySelector<HTMLElement>('footer[data-slot="footer"]') as HTMLElement;
export const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
export const slots = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
/** Every anchor the footer draws. */
export const links = () => [...document.querySelectorAll<HTMLAnchorElement>("a[href]")];

const hasClass = (element: Element, token: string) => element.classList.contains(token);

/** Whether the element, or a box around it up to the footer, is `display: none` at the base width. */
export const hiddenAtBase = (element: Element) => {
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    if (hasClass(node, "hidden")) return true;
    if (node.tagName === "FOOTER") break;
  }
  return false;
};

/** Whether a box around the element, up to the footer, is hidden from `md` up (`md:hidden`). */
export const hiddenFromMd = (element: Element) => {
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    if (hasClass(node, "md:hidden")) return true;
    if (node.tagName === "FOOTER") break;
  }
  return false;
};

export type FooterUnderTest = {
  /** The component's name, for the suite's title. */
  name: string;
  /** `data-variant`. */
  variant: string;
  Footer: (props: FooterProps) => ReactElement;
  /** The footer draws the columns of links. `false`: none, whatever the shop has. */
  columns: boolean;
  /** The footer draws the newsletter form. */
  newsletter: boolean;
  /** The footer draws the payment marks. */
  payments: boolean;
  /** The footer draws the logo, a link home. */
  logo: boolean;
  /** The social heading is on the screen, or only for a screen reader. */
  socialHeading: "visible" | "hidden";
};

function columnLabels(locale: Locale): string[] {
  return fixturesOf(locale).footer.content.columns.flatMap((column) =>
    column.links.map((link) => link.label),
  );
}

export function describeFooter(variant: FooterUnderTest) {
  const { Footer, name } = variant;
  const view = (locale: Locale = "en", over: Partial<FooterProps> = {}) =>
    render(<Footer {...footerProps(locale, over)} />);
  const viewBare = (locale: Locale = "en", over: Partial<FooterProps> = {}) =>
    render(<Footer {...bareProps(locale, over)} />);

  describe(`${name}: the page's landmarks`, () => {
    it("is one contentinfo, tagged with its variant, and nothing else in the page is a footer", () => {
      view();
      expect(document.querySelectorAll("footer")).toHaveLength(1);
      expect(footer().getAttribute("data-variant")).toBe(variant.variant);
      expect(screen.getByRole("contentinfo")).toBe(footer());
    });

    it.each(LOCALES)("names its navigations apart, in %s", (locale) => {
      view(locale);
      const words = copyOf(locale);
      const navs = [...document.querySelectorAll("nav")].map((nav) =>
        nav.getAttribute("aria-label"),
      );
      expect(navs).toEqual(variant.columns ? [words.navigation, words.legal] : [words.legal]);
      expect(screen.getByRole("navigation", { name: words.legal })).toBeTruthy();
      if (variant.columns) {
        expect(screen.getByRole("navigation", { name: words.navigation })).toBe(
          slot("footer-columns"),
        );
      }
    });

    it("has no landmark with nothing in it: a shop with no columns has no columns' navigation", () => {
      view("en", { columns: [] });
      expect(slot("footer-columns")).toBeNull();
      expect(screen.queryByRole("navigation", { name: copyOf("en").navigation })).toBeNull();
      expect(screen.getByRole("navigation", { name: copyOf("en").legal })).toBeTruthy();
    });

    it("has no legal navigation when the shop has no legal links", () => {
      view("en", { legalLinks: [] });
      expect(slot("footer-legal")).toBeNull();
      expect(screen.queryByRole("navigation", { name: copyOf("en").legal })).toBeNull();
    });

    it("takes the page's classes on the footer, and sits on the muted ground with a rule on top", () => {
      view("en", { className: "shadow-sm" });
      expect(footer().className).toContain("shadow-sm");
      expect(footer().className).toContain("bg-muted");
      expect(footer().className).toContain("border-t");
      expect(footer().className).toContain("text-foreground");
    });

    it("is a server component: no client directive, and no flag or simple-icons import", async () => {
      const { readFileSync } = await import("node:fs");
      const { default: path } = await import("node:path");
      const dir = path.join(import.meta.dirname, "../organisms/footer");
      for (const file of ["parts.tsx", `${variant.variant}.tsx`]) {
        const source = readFileSync(path.join(dir, file), "utf8");
        expect(source, file).not.toMatch(/^\s*["']use client["']/m);
        expect(source, file).not.toMatch(/atoms\/flag|country-flag-icons|simple-icons/);
      }
    });
  });

  describe(`${name}: the logo`, () => {
    if (variant.logo) {
      it.each(LOCALES)("is a link home named for the store, in %s", (locale) => {
        view(locale);
        const { storeName, homeHref } = fixturesOf(locale).footer.content;
        const label = formatMessage(copyOf(locale).home, { store: storeName }, locale);
        const logo = slot("footer-logo") as HTMLElement;
        expect(logo.tagName).toBe("A");
        expect(logo.getAttribute("href")).toBe(homeHref);
        expect(logo.getAttribute("aria-label")).toBe(label);
        expect(plain(logo.textContent)).toBe(storeName);
        expect(logo.className).toContain("min-h-11");
        expect(logo.className).toContain("focus-visible:ring-ring");
        expect(screen.getAllByRole("link", { name: label })).toHaveLength(1);
        expect(screen.getByRole("link", { name: label })).toBe(logo);
      });

      it("draws the shop's own SVG when it gives one, and still names the link", () => {
        view("en", { logo: <svg data-testid="own-logo" viewBox="0 0 10 10" aria-hidden="true" /> });
        expect(screen.getAllByTestId("own-logo")).toHaveLength(1);
        expect(slot("footer-logo")?.getAttribute("aria-label")).toBe("Shopblok, home");
      });

      it("keeps the logo to its own size in a column that would stretch it", () => {
        view();
        const logo = slot("footer-logo") as HTMLElement;
        expect(logo.className).toContain("w-fit");
        expect(logo.className).toContain("self-start");
      });
    } else {
      it("has no logo link: the copyright line names the store", () => {
        view();
        expect(slot("footer-logo")).toBeNull();
        expect(screen.queryByRole("link", { name: "Shopblok, home" })).toBeNull();
      });
    }
  });

  describe(`${name}: the columns`, () => {
    if (variant.columns) {
      it("draws the columns twice and shows one: an accordion below md, side by side from md", () => {
        view();
        const nav = slot("footer-columns") as HTMLElement;
        const accordion = slot("footer-accordion") as HTMLElement;
        const grid = slot("footer-column-grid") as HTMLElement;
        expect(nav.contains(accordion)).toBe(true);
        expect(nav.contains(grid)).toBe(true);
        expect(accordion.className).toContain("md:hidden");
        expect(hiddenAtBase(accordion)).toBe(false);
        expect(grid.className).toMatch(/(?:^|\s)hidden(?:\s|$)/);
        expect(grid.className).toContain("md:grid");
        expect(grid.className).toContain("md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]");
      });

      it.each(LOCALES)(
        "holds every link of every column in both, collapsed in the accordion, in %s",
        (locale) => {
          view(locale);
          const accordion = slot("footer-accordion") as HTMLElement;
          const grid = slot("footer-column-grid") as HTMLElement;
          const { columns } = fixturesOf(locale).footer.content;
          expect(columns.length).toBeGreaterThan(1);
          for (const column of columns) {
            for (const link of column.links) {
              for (const root of [accordion, grid]) {
                const anchor = [...root.querySelectorAll("a")].find(
                  (candidate) => candidate.getAttribute("href") === link.href,
                );
                expect(anchor, `${link.label} in ${root.dataset["slot"]}`).toBeTruthy();
                expect(plain(anchor?.textContent)).toContain(link.label);
              }
            }
          }
          // The accordion's panels are in the page and closed: `keepMounted` writes `hidden`.
          const panels = slots("accordion-content", accordion);
          expect(panels).toHaveLength(columns.length);
          for (const panel of panels) {
            expect(panel.hasAttribute("hidden")).toBe(true);
            expect(panel.querySelectorAll("a").length).toBeGreaterThan(0);
          }
        },
      );

      it.each(LOCALES)("gives each column a heading at level 2, in %s", (locale) => {
        view(locale);
        const { columns } = fixturesOf(locale).footer.content;
        const grid = slot("footer-column-grid") as HTMLElement;
        const accordion = slot("footer-accordion") as HTMLElement;
        for (const column of columns) {
          const heading = within(grid).getByRole("heading", { name: column.title, level: 2 });
          expect(heading.closest('[data-slot="footer-column"]')).not.toBeNull();
          // In the accordion the heading holds the trigger, which is named by the title.
          const trigger = within(accordion).getByRole("button", { name: column.title });
          expect(trigger.closest("h2")).not.toBeNull();
          expect(trigger.getAttribute("aria-expanded")).toBe("false");
        }
      });

      it("takes the heading level from the page, for the columns, the newsletter and the profiles", () => {
        view("en", { headingLevel: 3 });
        const grid = slot("footer-column-grid") as HTMLElement;
        expect(within(grid).getAllByRole("heading", { level: 3 }).length).toBe(3);
        expect(within(grid).queryAllByRole("heading", { level: 2 })).toHaveLength(0);
        expect(
          within(slot("footer-accordion") as HTMLElement)
            .getAllByRole("button")[0]
            ?.closest("h3"),
        ).not.toBeNull();
        expect(footer().querySelectorAll("h2")).toHaveLength(0);
        expect(footer().querySelector("h3")).not.toBeNull();
      });

      it("opens a column on its trigger with the pointer and with the keyboard", async () => {
        view();
        const user = userEvent.setup();
        const accordion = slot("footer-accordion") as HTMLElement;
        const first = within(accordion).getByRole("button", { name: "Shop" });
        expect(first.getAttribute("aria-expanded")).toBe("false");
        await user.click(first);
        expect(first.getAttribute("aria-expanded")).toBe("true");
        const second = within(accordion).getByRole("button", { name: "Help" });
        second.focus();
        await user.keyboard("{Enter}");
        expect(second.getAttribute("aria-expanded")).toBe("true");
        // Several columns may be open at once, as a reader of a footer would expect.
        expect(first.getAttribute("aria-expanded")).toBe("true");
        await user.keyboard("{Enter}");
        expect(second.getAttribute("aria-expanded")).toBe("false");
        const panel = accordion.querySelector('[data-slot="accordion-content"]') as HTMLElement;
        expect(panel.hasAttribute("hidden")).toBe(false);
      });

      it("draws one column open at first render when the design system asks, and no other", () => {
        view("en", { drawn: { column: 1 } });
        const triggers = within(slot("footer-accordion") as HTMLElement).getAllByRole("button");
        expect(triggers.map((trigger) => trigger.getAttribute("aria-expanded"))).toEqual([
          "false",
          "true",
          "false",
        ]);
        const panels = slots("accordion-content", slot("footer-accordion") as HTMLElement);
        expect(panels.map((panel) => panel.hasAttribute("hidden"))).toEqual([true, false, true]);
      });

      it("draws every column closed when the one to open is not a column", () => {
        view("en", { drawn: { column: 7 } });
        const triggers = within(slot("footer-accordion") as HTMLElement).getAllByRole("button");
        for (const trigger of triggers) expect(trigger.getAttribute("aria-expanded")).toBe("false");
      });

      it.each(LOCALES)(
        "opens the link that leaves the store in a new tab and says so, in %s",
        (locale) => {
          view(locale);
          const grid = slot("footer-column-grid") as HTMLElement;
          const external = grid.querySelector<HTMLAnchorElement>(
            'a[href="https://careers.example.com"]',
          ) as HTMLAnchorElement;
          expect(external.getAttribute("target")).toBe("_blank");
          expect(external.getAttribute("rel")).toBe("noopener noreferrer");
          expect(plain(external.textContent)).toContain(copyOf(locale).newTab);
          expect(external.querySelector(".sr-only")?.textContent).toContain(copyOf(locale).newTab);
          const others = [...grid.querySelectorAll("a")].filter((anchor) => anchor !== external);
          expect(others.length).toBeGreaterThan(5);
          for (const anchor of others) {
            expect(anchor.getAttribute("target")).toBeNull();
            expect(plain(anchor.textContent)).not.toContain(copyOf(locale).newTab);
          }
        },
      );

      it("gives every column link a 44 px row and breaks a word that is longer than its box", () => {
        view();
        for (const anchor of slots("footer-link", slot("footer-columns") as HTMLElement)) {
          expect(anchor.className).toContain("min-h-11");
          expect(anchor.className).toContain("min-w-11");
          expect(anchor.className).toContain("wrap-anywhere");
          expect(anchor.className).toContain("focus-visible:ring-ring");
        }
      });

      it("leaves the accordion and the grid out with no columns, and the shop's words stay", () => {
        view("en", { columns: [] });
        expect(slot("footer-accordion")).toBeNull();
        expect(slot("footer-column-grid")).toBeNull();
        expect(slot("footer-copyright")).not.toBeNull();
      });

      it("draws five columns, the most the contract takes", () => {
        const base = fixturesOf("en").footer.content.columns;
        view("en", {
          columns: [
            ...base,
            fixturesOf("en").long.footerColumn,
            { title: "Fifth", links: [{ label: "Only link", href: "/us/pages/only" }] },
          ],
        });
        expect(
          within(slot("footer-column-grid") as HTMLElement).getAllByRole("heading"),
        ).toHaveLength(5);
        expect(within(slot("footer-accordion") as HTMLElement).getAllByRole("button")).toHaveLength(
          5,
        );
      });
    } else {
      it("draws no columns, whatever the shop has: a single row has no room for a list of links", () => {
        view();
        expect(slot("footer-columns")).toBeNull();
        expect(slot("footer-accordion")).toBeNull();
        expect(slot("footer-column-grid")).toBeNull();
        for (const label of columnLabels("en")) expect(screen.queryByText(label)).toBeNull();
      });
    }
  });

  describe(`${name}: the newsletter`, () => {
    if (variant.newsletter) {
      it.each(LOCALES)("is NewsletterForm at heading level 2, in %s", (locale) => {
        view(locale);
        const words = catalogs[locale].molecules.newsletterForm;
        const form = slot("newsletter-form") as HTMLElement;
        expect(slots("newsletter-form")).toHaveLength(1);
        expect(screen.getByRole("heading", { name: words.title, level: 2 })).toBeTruthy();
        expect(form.getAttribute("aria-labelledby")).toBe(
          screen.getByRole("heading", { name: words.title }).id,
        );
        const email = within(form).getByLabelText(words.emailLabel) as HTMLInputElement;
        expect(email.type).toBe("email");
        expect(within(form).getByRole("button", { name: words.submit })).toBeTruthy();
        // The consent sentence links to the privacy page the contract names.
        expect(
          within(form).getByRole("link", { name: words.privacyLink }).getAttribute("href"),
        ).toBe(fixturesOf(locale).footer.content.newsletter?.privacyHref);
      });

      it("gives the form a box of its own, which may shrink: its layout is a container query", () => {
        view();
        const box = slot("footer-newsletter") as HTMLElement;
        expect(box.className).toContain("min-w-0");
        expect(box.contains(slot("newsletter-form"))).toBe(true);
        expect((slot("newsletter-form") as HTMLElement).className).toContain("@container");
      });

      it("hands the form the page's action, and its privacy link the page's prefetch", () => {
        view("en", { newsletterAction: "/us/newsletter", prefetch: false });
        const form = slot("newsletter-form") as HTMLFormElement;
        expect(form.getAttribute("action")).toBe("/us/newsletter");
        expect(form.getAttribute("method")).toBe("post");
        expect(
          within(form).getByRole("link", { name: "privacy policy" }).getAttribute("data-prefetch"),
        ).toBe("false");
      });

      it("keeps the address the shop gives, and submits to its own page with no action", () => {
        view("en", { newsletter: { email: "ada@example.com", privacyHref: "/us/pages/privacy" } });
        const form = slot("newsletter-form") as HTMLFormElement;
        expect(form.getAttribute("action")).toBeNull();
        expect((within(form).getByLabelText("Email address") as HTMLInputElement).value).toBe(
          "ada@example.com",
        );
      });

      it("leaves the form out when the shop has none", () => {
        view("en", { newsletter: undefined });
        expect(slot("footer-newsletter")).toBeNull();
        expect(slot("newsletter-form")).toBeNull();
        expect(screen.queryByRole("heading", { name: "Join our newsletter" })).toBeNull();
      });
    } else {
      it("draws no newsletter, whatever the shop has: a single row has no room for a form", () => {
        view();
        expect(slot("footer-newsletter")).toBeNull();
        expect(slot("newsletter-form")).toBeNull();
        expect(document.querySelector("form")).toBeNull();
      });
    }
  });

  describe(`${name}: the social links`, () => {
    it.each(LOCALES)("names each link for the store and the network, in %s", (locale) => {
      view(locale);
      const { storeName, social } = fixturesOf(locale).footer.content;
      const items = slots("footer-social-link");
      expect(items).toHaveLength(social.length);
      for (const [index, profile] of social.entries()) {
        const mark = socialMarks[profile.network];
        const label = formatMessage(
          copyOf(locale).socialLink,
          { store: storeName, network: mark.title },
          locale,
        );
        const link = items[index] as HTMLElement;
        expect(link.getAttribute("aria-label")).toBe(label);
        expect(link.getAttribute("href")).toBe(profile.href);
        expect(link.getAttribute("data-network")).toBe(profile.network);
        expect(screen.getByRole("link", { name: label })).toBe(link);
      }
    });

    it("draws each mark in the current colour, hidden from assistive technology, in a 44 px link", () => {
      view();
      for (const link of slots("footer-social-link")) {
        expect(link.className).toContain("size-11");
        expect(link.className).toContain("focus-visible:ring-ring");
        expect(link.textContent).toBe("");
        const svg = link.querySelector("svg") as SVGElement;
        expect(svg.getAttribute("aria-hidden")).toBe("true");
        expect(svg.getAttribute("class")).toContain("fill-current");
        expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
        const network = link.getAttribute("data-network") as keyof typeof socialMarks;
        expect(svg.querySelector("path")?.getAttribute("d")).toBe(socialMarks[network].path);
        expect(svg.getAttribute("fill")).toBeNull();
      }
    });

    it("draws all eight networks the footer has a mark for, each with its own drawing", () => {
      view("en", { social: allNetworks });
      const links = slots("footer-social-link");
      expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
        "Shopblok on Instagram",
        "Shopblok on Facebook",
        "Shopblok on TikTok",
        "Shopblok on YouTube",
        "Shopblok on Pinterest",
        "Shopblok on X",
        "Shopblok on Threads",
        "Shopblok on Bluesky",
      ]);
      const paths = links.map((link) => link.querySelector("path")?.getAttribute("d"));
      expect(new Set(paths).size).toBe(8);
    });

    if (variant.socialHeading === "visible") {
      it.each(LOCALES)("has a heading over the list, in %s", (locale) => {
        view(locale);
        const heading = screen.getByRole("heading", { name: copyOf(locale).social, level: 2 });
        expect(heading.className).not.toContain("sr-only");
        const box = slot("footer-social") as HTMLElement;
        expect(box.contains(heading)).toBe(true);
        expect(before(heading, box.querySelector("ul") as Element)).toBe(true);
      });
    } else {
      it("keeps the heading for a screen reader and leaves it off the screen", () => {
        view();
        const heading = screen.getByRole("heading", { name: "Follow us", level: 2 });
        expect(heading.className).toMatch(/(?:^|\s)sr-only(?:\s|$)/);
      });
    }

    it("draws nothing, not even the heading, for a shop with no profiles", () => {
      view("en", { social: [] });
      expect(slot("footer-social")).toBeNull();
      expect(screen.queryByRole("heading", { name: "Follow us" })).toBeNull();
    });
  });

  describe(`${name}: the legal links`, () => {
    it.each(LOCALES)("are a list in a navigation named for them, in %s", (locale) => {
      view(locale);
      const { legalLinks } = fixturesOf(locale).footer.content;
      const nav = screen.getByRole("navigation", { name: copyOf(locale).legal });
      expect(nav).toBe(slot("footer-legal"));
      const items = within(nav).getAllByRole("listitem");
      expect(items).toHaveLength(legalLinks.length);
      for (const [index, link] of legalLinks.entries()) {
        const anchor = within(items[index] as HTMLElement).getByRole("link", { name: link.label });
        expect(anchor.getAttribute("href")).toBe(link.href);
      }
    });

    it("gives each a 44 px row, and the list wraps onto more rows when the room is short", () => {
      view();
      const nav = slot("footer-legal") as HTMLElement;
      for (const anchor of slots("footer-link", nav)) {
        expect(anchor.className).toContain("min-h-11");
        expect(anchor.className).toContain("min-w-11");
      }
      expect((nav.querySelector("ul") as HTMLElement).className).toContain("flex-wrap");
    });

    it("is outside the columns' navigation: the two landmarks do not nest", () => {
      view();
      const legal = slot("footer-legal") as HTMLElement;
      expect(legal.closest('[data-slot="footer-columns"]')).toBeNull();
      expect(footer().contains(legal)).toBe(true);
    });
  });

  describe(`${name}: the payment marks`, () => {
    if (variant.payments) {
      it.each(LOCALES)(
        "are a list named for them, each mark labelled with its brand, in %s",
        (locale) => {
          view(locale);
          const { paymentIcons } = fixturesOf(locale).footer.content;
          const list = screen.getByRole("list", { name: copyOf(locale).payment });
          expect(list).toBe(slot("footer-payments"));
          const images = within(list).getAllByRole("img");
          expect(images.map((image) => image.getAttribute("aria-label"))).toEqual(
            paymentIcons.map((brand) => paymentMarks[brand].title),
          );
          expect(images).toHaveLength(8);
          for (const image of images) {
            expect(image.getAttribute("class")).toContain("fill-current");
            expect(image.closest("a, button")).toBeNull();
          }
        },
      );

      it("draws only the marks the shop lists, in its order", () => {
        view("en", { paymentIcons: ["paypal", "visa"] });
        const images = within(slot("footer-payments") as HTMLElement).getAllByRole("img");
        expect(images.map((image) => image.getAttribute("aria-label"))).toEqual(["PayPal", "Visa"]);
      });

      it("draws no list for a shop that lists none", () => {
        view("en", { paymentIcons: [] });
        expect(slot("footer-payments")).toBeNull();
        expect(screen.queryByRole("list", { name: "Ways to pay" })).toBeNull();
      });
    } else {
      it("draws no payment marks, whatever the shop lists: they would be the row's widest part", () => {
        view();
        expect(slot("footer-payments")).toBeNull();
        expect(document.querySelector('[data-slot="payment-icon"]')).toBeNull();
      });
    }
  });

  describe(`${name}: the market switcher`, () => {
    it("is MarketSwitcher in its auto form: a popover trigger from md and a sheet trigger below", () => {
      view();
      expect(slots("market-switcher")).toHaveLength(1);
      const triggers = slots("market-switcher-trigger");
      expect(triggers).toHaveLength(2);
      expect(triggers.map((trigger) => hasClass(trigger, "max-md:hidden"))).toEqual([true, false]);
      expect(triggers.map((trigger) => hasClass(trigger, "md:hidden"))).toEqual([false, true]);
      for (const trigger of triggers) {
        expect(trigger.getAttribute("aria-label")).toContain("United States");
        expect(trigger.className).toContain("min-h-11");
      }
    });

    it.each(LOCALES)("takes the market switcher's wording from the page, in %s", (locale) => {
      view(locale);
      const words = catalogs[locale].molecules.marketSwitcher;
      const { markets } = fixturesOf(locale).footer.content.market ?? { markets: [] };
      expect(markets.length).toBeGreaterThan(1);
      const trigger = slots("market-switcher-trigger")[0] as HTMLElement;
      // The trigger says what the control is, whatever the language: "Country and language: …".
      expect(trigger.getAttribute("aria-label")).toContain(
        formatMessage(words.trigger, { country: "", language: "", currency: "" }, locale).split(
          ":",
        )[0] ?? "",
      );
    });

    it("is drawn in the page's own width: no box around it hides it at any width", () => {
      view();
      const box = slot("market-switcher") as HTMLElement;
      expect(hiddenAtBase(box)).toBe(false);
      expect(hiddenFromMd(box)).toBe(false);
      for (const trigger of slots("market-switcher-trigger")) {
        // The two triggers hide each other, and nothing above them hides either.
        expect(hiddenAtBase(trigger.parentElement as Element)).toBe(false);
      }
    });

    it("is left out when the shop turns it off, whatever markets it has", () => {
      view("en", { marketSwitcher: false });
      expect(slot("market-switcher")).toBeNull();
    });

    it("is left out when there are no markets to list", () => {
      view("en", { market: undefined });
      expect(slot("market-switcher")).toBeNull();
    });

    it.each(["popover", "drawer"] as const)(
      "draws its %s open for the design system",
      async (form) => {
        view("en", { drawn: { switcher: form } });
        await waitFor(() => expect(slot("market-switcher-popup")).not.toBeNull());
        if (form === "drawer") {
          expect(slot("market-switcher-popup")?.className).toContain("duration-0");
          expect(slot("market-switcher-popup")?.className).toContain("[--bleed:0px]");
        }
        // Not a modal: the page behind stays reachable, so that several states fit on one page.
        expect(slots("market-switcher-trigger")).toHaveLength(1);
        expect(slot("market-switcher-trigger")?.getAttribute("aria-expanded")).toBe("true");
      },
    );

    it("opens a popup with the markets from its trigger, with the keyboard", async () => {
      view();
      const user = userEvent.setup();
      const trigger = slots("market-switcher-trigger")[0] as HTMLElement;
      trigger.focus();
      await user.keyboard("{Enter}");
      const popup = await waitFor(() => {
        const found = slot("market-switcher-popup");
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      expect(within(popup).getAllByRole("link").length).toBeGreaterThan(5);
    });
  });

  describe(`${name}: the copyright`, () => {
    it.each(LOCALES)("is the shop's last line as small, muted text, in %s", (locale) => {
      view(locale);
      const line = slot("footer-copyright") as HTMLElement;
      expect(line.tagName).toBe("P");
      expect(plain(line.textContent)).toBe(plain(fixturesOf(locale).footer.content.copyright));
      expect(line.className).toContain("text-sm");
      expect(line.className).toContain("text-muted-foreground");
      expect(line.className).toContain("wrap-anywhere");
    });

    it("is there even for a shop with nothing else", () => {
      viewBare();
      expect(plain(slot("footer-copyright")?.textContent)).toContain("© 2026 Shopblok");
    });
  });

  describe(`${name}: the bare footer`, () => {
    it("draws the copyright and the legal links, and nothing the shop has not got", () => {
      viewBare();
      expect(screen.getByRole("contentinfo")).toBe(footer());
      expect(slot("footer-columns")).toBeNull();
      expect(slot("footer-newsletter")).toBeNull();
      expect(slot("footer-social")).toBeNull();
      expect(slot("footer-payments")).toBeNull();
      expect(slot("market-switcher")).toBeNull();
      expect(document.querySelector("form")).toBeNull();
      expect(document.querySelector("h2")?.textContent ?? "").not.toContain("Follow");
      const legal = within(screen.getByRole("navigation", { name: "Legal" }));
      expect(legal.getAllByRole("link")).toHaveLength(2);
      expect(slot("footer-copyright")).not.toBeNull();
    });

    it("keeps a link on every link it does draw", () => {
      viewBare();
      expect(links().length).toBeGreaterThanOrEqual(2);
      for (const anchor of links()) expect(anchor.getAttribute("href")).toMatch(/^\//);
    });
  });

  describe(`${name}: links and long labels`, () => {
    it("draws every link with the `prefetch` the page gives, false for the design system", () => {
      view("en", { prefetch: false });
      expect(links().length).toBeGreaterThan(8);
      for (const anchor of links()) expect(anchor.getAttribute("data-prefetch")).toBe("false");
    });

    it("leaves `prefetch` to Next when the page says nothing", () => {
      view("en", { prefetch: undefined });
      for (const anchor of links()) expect(anchor.getAttribute("data-prefetch")).toBe("undefined");
    });

    it.each(longLabels)(
      "wraps the longest store name, column, legal link and copyright and cuts none (%s)",
      (locale, strings) => {
        const fx = fixturesOf(locale);
        view(locale, {
          storeName: strings.storeName,
          columns: [fx.long.footerColumn, ...fx.footer.content.columns.slice(0, 2)],
          legalLinks: [
            { label: strings.linkLabel, href: "/long" },
            ...fx.footer.content.legalLinks.slice(0, 1),
          ],
          copyright: `© 2026 ${strings.storeName}. ${strings.helpText}`,
        });
        const label = formatMessage(copyOf(locale).home, { store: strings.storeName }, locale);
        if (variant.logo) {
          expect(slot("footer-logo")?.getAttribute("aria-label")).toBe(label);
          expect(plain(slot("footer-logo")?.textContent)).toBe(strings.storeName);
        }
        if (variant.columns) {
          const grid = slot("footer-column-grid") as HTMLElement;
          expect(
            within(grid).getByRole("heading", { name: fx.long.footerColumn.title }),
          ).toBeTruthy();
          for (const link of fx.long.footerColumn.links) {
            expect(within(grid).getByRole("link", { name: link.label })).toBeTruthy();
          }
          expect(
            within(slot("footer-accordion") as HTMLElement).getByRole("button", {
              name: fx.long.footerColumn.title,
            }),
          ).toBeTruthy();
        }
        expect(
          within(slot("footer-legal") as HTMLElement).getByRole("link", {
            name: strings.linkLabel,
          }),
        ).toBeTruthy();
        expect(plain(slot("footer-copyright")?.textContent)).toContain(strings.storeName);
        for (const classes of classesIn(document.body)) {
          expect(classes).not.toMatch(CLIPPING_CLASSES);
        }
      },
    );

    it("takes the German and the Greek words of the fixtures as they are", () => {
      for (const locale of ["de", "el"] as const) {
        const { long } = designSystemFixtures[locale];
        expect(long.linkLabel.length).toBeGreaterThan(40);
      }
    });

    it("never draws a class that would cut a label, and every box that holds text may shrink", () => {
      view("en", { social: allNetworks });
      for (const classes of classesIn(footer())) expect(classes).not.toMatch(CLIPPING_CLASSES);
      for (const box of slots("footer-link")) expect(box.className).toContain("max-w-full");
    });

    it("gives every control at least 44 px: the text links, the social links, the logo and the triggers", () => {
      view();
      for (const anchor of slots("footer-link")) expect(anchor.className).toContain("min-h-11");
      for (const anchor of slots("footer-social-link")) {
        expect(anchor.className).toMatch(/(?:^|\s)size-11(?:\s|$)/);
      }
      if (variant.logo) expect(slot("footer-logo")?.className).toContain("min-h-11");
      if (variant.columns) {
        for (const trigger of slots("accordion-trigger")) {
          expect(trigger.className).toContain("min-h-11");
        }
      }
    });
  });
}
