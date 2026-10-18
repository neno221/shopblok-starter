// Ours (T38, SETUP.md "Product-page organisms (T38)"). The tests of ReviewsSection, in happy-dom
// with Testing Library: the section named by its heading in the four catalogs, the ratings, the
// write link, the list of reviews and its heading levels, the line that says which reviews these
// are (the first page, a middle one, the last, a stale one, a single review), the pager's links from
// `hrefFor`, the empty state (no stars, no list, no pager), a missing `writeHref`, `prefetch`, a long
// German and Greek review, and the files' rules. Pixels are not measurable here: the two columns
// from `lg`, the 44 px rule and axe are the design system's own checks, which are the lead's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { ReviewsSection as ReviewsSectionContent } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { ReviewsSection, type ReviewsSectionProps } from "./reviews-section";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);

const copyOf = (locale: Locale): ReviewsSectionProps["copy"] => ({
  reviewsSection: catalogs[locale].organisms.reviewsSection,
  ratingSummary: catalogs[locale].molecules.ratingSummary,
  reviewItem: catalogs[locale].molecules.reviewItem,
  pagination: catalogs[locale].molecules.pagination,
  rating: catalogs[locale].atoms.rating,
});
const words = (locale: Locale) => catalogs[locale].organisms.reviewsSection;
const sample = (locale: Locale, name: "first" | "none" = "first") =>
  commerceFixtures[locale].productPage.reviews[name];
const hrefFor = (page: number) => `/products/heritage-hoodie/reviews?page=${page}`;

function element(
  locale: Locale = "en",
  name: "first" | "none" = "first",
  props: Partial<ReviewsSectionProps> = {},
) {
  return (
    <ReviewsSection
      {...sample(locale, name)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      hrefFor={hrefFor}
      prefetch={false}
      {...props}
    />
  );
}
const setup = (
  locale: Locale = "en",
  name: "first" | "none" = "first",
  props?: Partial<ReviewsSectionProps>,
) => render(element(locale, name, props));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const tokens = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
/** Intl may write a no-break space or a narrow one, and the catalogs a word joiner. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s⁠]+/g, " ").trim();
const showing = () => plain(slot("reviews-section-showing")?.textContent);
const saying = (locale: Locale, count: number, from: number, to: number) =>
  plain(formatMessage(words(locale).showing, { count, from, to }, htmlLang[locale]));
const pager = (locale: Locale = "en") =>
  screen.queryByRole("navigation", { name: catalogs[locale].molecules.pagination.label });

/** The first page's section moved to another page of the same 128 reviews. */
function onPage(
  page: number,
  count: number,
  locale: Locale = "en",
): Pick<ReviewsSectionContent, "reviews" | "page"> {
  const first = sample(locale).reviews;
  const pageCount = Math.ceil(128 / 6);
  return { reviews: first.slice(0, count), page: { page, pageCount } };
}

describe("ReviewsSection", () => {
  describe.each(LOCALES)("with reviews · %s", (locale) => {
    it("is one region named by its own heading, an h2, with the id the buy box links to", () => {
      setup(locale);
      const region = screen.getByRole("region", { name: words(locale).title });
      expect(region).toBe(slot("reviews-section"));
      expect(region.tagName).toBe("SECTION");
      expect(region.id).toBe("reviews");
      const heading = screen.getByRole("heading", { level: 2, name: words(locale).title });
      expect(heading).toBe(slot("reviews-section-title"));
      expect(heading.id).toBe("reviews-title");
      expect(region.getAttribute("aria-labelledby")).toBe(heading.id);
      expect(screen.getAllByRole("region")).toHaveLength(1);
    });

    it("shows the ratings: the average, the count and a bar for each star", () => {
      setup(locale);
      const summary = slot("rating-summary") as HTMLElement;
      expect(slot("reviews-section-summary")?.contains(summary)).toBe(true);
      expect(slot("rating-summary-average", summary)?.textContent).toMatch(/4[.,]6/);
      expect(within(summary).getAllByRole("listitem")).toHaveLength(5);
      expect(plain(slot("rating-summary-count", summary)?.textContent)).toMatch(/128/);
    });

    it("lists this page's reviews, each an article with a heading one level deeper", () => {
      setup(locale);
      const reviews = sample(locale).reviews;
      const list = screen.getByRole("list", { name: words(locale).list });
      expect(list.tagName).toBe("UL");
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(reviews.length);
      for (const [index, item] of items.entries()) {
        const review = reviews[index];
        expect(item.querySelectorAll("article[data-slot=review-item]")).toHaveLength(1);
        expect(
          within(item).getByRole("heading", { level: 3, name: review?.title ?? review?.author }),
        ).toBeTruthy();
      }
    });

    it("says which reviews these are, from the page and the count", () => {
      setup(locale);
      expect(showing()).toBe(saying(locale, 128, 1, 6));
      expect(showing()).toMatch(/1\D+6\D+128/);
    });

    it("has the pager after the list, named by the catalog, to the pages hrefFor gives", () => {
      setup(locale);
      const nav = pager(locale) as HTMLElement;
      expect(nav).toBeTruthy();
      expect(slot("reviews-section-reviews")?.contains(nav)).toBe(true);
      const current = within(nav).getByRole("link", { current: "page" });
      expect(current.getAttribute("href")).toBe(hrefFor(1));
      const next = within(nav).getByRole("link", {
        name: catalogs[locale].molecules.pagination.next,
      });
      expect(next.getAttribute("href")).toBe(hrefFor(2));
      // No button anywhere: a page of reviews is a link, so a crawler can follow it.
      expect(within(nav).queryAllByRole("button")).toEqual([]);
    });

    it("has a link that writes a review, named by the catalog, to writeHref", () => {
      setup(locale);
      const write = screen.getByRole("link", { name: words(locale).write });
      expect(write).toBe(slot("reviews-section-write"));
      expect(write.getAttribute("href")).toBe(sample(locale).writeHref);
      expect(slot("reviews-section-summary")?.contains(write)).toBe(true);
      expect(screen.getAllByRole("link", { name: words(locale).write })).toHaveLength(1);
    });
  });

  describe("in English the line reads as a sentence", () => {
    it("on the first page", () => {
      setup("en");
      expect(showing()).toBe("Showing 1 to 6 of 128 reviews");
    });

    it("on a middle page: the page's first review follows the pages before it", () => {
      setup("en", "first", onPage(3, 6));
      expect(showing()).toBe("Showing 13 to 18 of 128 reviews");
    });

    it("on the last page: it ends at the count, whatever the page holds", () => {
      setup("en", "first", onPage(22, 2));
      expect(showing()).toBe("Showing 127 to 128 of 128 reviews");
    });

    it("on a page that is the last and full", () => {
      const first = sample("en");
      setup("en", "first", {
        summary: {
          ...first.summary,
          count: 12,
          distribution: first.summary.distribution.map((row, index) => ({
            ...row,
            count: index === 0 ? 12 : 0,
          })),
        },
        reviews: first.reviews,
        page: { page: 2, pageCount: 2 },
      });
      expect(showing()).toBe("Showing 7 to 12 of 12 reviews");
    });

    it("for a single review: the count alone, with no pager", () => {
      const first = sample("en");
      setup("en", "first", {
        summary: {
          ...first.summary,
          count: 1,
          distribution: first.summary.distribution.map((row, index) => ({
            ...row,
            count: index === 0 ? 1 : 0,
          })),
        },
        reviews: first.reviews.slice(0, 1),
        page: { page: 1, pageCount: 1 },
      });
      expect(showing()).toBe("Showing 1 review");
      expect(pager()).toBeNull();
    });

    it("draws no list and no line for a page with no reviews on it, only the pager", () => {
      setup("en", "first", { reviews: [], page: { page: 22, pageCount: 22 } });
      expect(screen.queryByRole("list", { name: "Reviews" })).toBeNull();
      expect(slot("reviews-section-showing")).toBeNull();
      expect(pager()).toBeTruthy();
      expect(
        within(pager() as HTMLElement)
          .getByRole("link", { current: "page" })
          .getAttribute("href"),
      ).toBe(hrefFor(22));
      // The ratings and the write link are the product's, whatever the page.
      expect(slot("rating-summary")).not.toBeNull();
      expect(slot("reviews-section-write")).not.toBeNull();
    });

    it("follows the pager: the current page's link is marked, and Previous leads back", () => {
      setup("en", "first", onPage(3, 6));
      const nav = pager() as HTMLElement;
      expect(within(nav).getByRole("link", { current: "page" }).getAttribute("href")).toBe(
        hrefFor(3),
      );
      expect(within(nav).getByRole("link", { name: "Previous" }).getAttribute("href")).toBe(
        hrefFor(2),
      );
      expect(within(nav).getByRole("link", { name: "Next" }).getAttribute("href")).toBe(hrefFor(4));
    });
  });

  describe("with none", () => {
    it.each(LOCALES)("says so, with a hint and the write link, and no stars · %s", (locale) => {
      setup(locale, "none");
      expect(screen.getByRole("heading", { level: 2, name: words(locale).title })).toBeTruthy();
      const empty = slot("reviews-section-empty") as HTMLElement;
      expect(within(empty).getByText(words(locale).empty)).toBeTruthy();
      expect(within(empty).getByText(words(locale).emptyHint)).toBeTruthy();
      const write = within(empty).getByRole("link", { name: words(locale).write });
      expect(write.getAttribute("href")).toBe(sample(locale, "none").writeHref);
      // A row of empty stars is a rating of none: no summary, no list, no line, no pager.
      expect(slot("rating-summary")).toBeNull();
      expect(slot("reviews-section-summary")).toBeNull();
      expect(slot("reviews-section-reviews")).toBeNull();
      expect(screen.queryByRole("list")).toBeNull();
      expect(slot("reviews-section-showing")).toBeNull();
      expect(pager(locale)).toBeNull();
      expect(screen.queryByRole("img")).toBeNull();
      expect(document.querySelectorAll("svg")).toHaveLength(0);
    });

    it("is the region named by its heading, all the same", () => {
      setup("en", "none");
      expect(screen.getByRole("region", { name: "Reviews" })).toBe(slot("reviews-section"));
    });

    it("draws no link when there is nowhere to write one", () => {
      setup("en", "none", { writeHref: undefined });
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("No reviews yet")).toBeTruthy();
    });

    it("is in the server's markup the same way", () => {
      const html = renderToString(element("en", "none"));
      expect(html).toContain("No reviews yet");
      expect(html).not.toContain("rating-summary");
    });
  });

  describe("the write link", () => {
    it("is drawn only when the page has an address for it", () => {
      setup("en", "first", { writeHref: undefined });
      expect(screen.queryByRole("link", { name: "Write a review" })).toBeNull();
      expect(slot("reviews-section-write")).toBeNull();
      expect(slot("reviews-section-summary")).not.toBeNull();
    });

    it("is a link with the button's classes, at least 44 px tall, and not a button", () => {
      setup("en");
      const write = slot("reviews-section-write") as HTMLElement;
      expect(write.tagName).toBe("A");
      expect(write.getAttribute("role")).toBeNull();
      expect(tokens(write)).toEqual(
        expect.arrayContaining(["min-h-11", "border", "bg-background"]),
      );
      expect(tokens(write)).toEqual(
        expect.arrayContaining(["w-fit", "max-w-full", "wrap-anywhere"]),
      );
    });
  });

  describe("the heading", () => {
    it("is an h2 with the reviews' headings one level deeper, and takes another level", () => {
      const view = setup("en");
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
      view.unmount();
      const third = setup("en", "first", { headingLevel: 3 });
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
      expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(6);
      expect(screen.queryAllByRole("heading", { level: 2 })).toEqual([]);
      third.unmount();
      setup("en", "first", { headingLevel: 4 });
      expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(1);
      expect(screen.getAllByRole("heading", { level: 5 })).toHaveLength(6);
      expect(screen.queryAllByRole("heading", { level: 3 })).toEqual([]);
    });

    it("takes the id the page gives, for the section, its name and the link to it", () => {
      setup("en", "first", { id: "customer-reviews" });
      const region = slot("reviews-section") as HTMLElement;
      expect(region.id).toBe("customer-reviews");
      expect(slot("reviews-section-title")?.id).toBe("customer-reviews-title");
      expect(region.getAttribute("aria-labelledby")).toBe("customer-reviews-title");
      expect(screen.getByRole("region", { name: "Reviews" })).toBe(region);
    });

    it("wraps anywhere and can shrink, so that no word is cut or pushes the page wide", () => {
      setup("en");
      expect(tokens(slot("reviews-section-title"))).toContain("wrap-anywhere");
      expect(tokens(slot("reviews-section"))).toContain("min-w-0");
    });
  });

  describe("the layout", () => {
    it("is one column, and from lg the ratings are a column of 20 rem at the start", () => {
      setup("en");
      const grid = slot("reviews-section-summary")?.parentElement as HTMLElement;
      expect(tokens(grid)).toEqual(
        expect.arrayContaining(["grid", "min-w-0", "lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"]),
      );
      // The markup order is the reading order, the tab order and the order the eye takes.
      expect([...grid.children].map((child) => child.getAttribute("data-slot"))).toEqual([
        "reviews-section-summary",
        "reviews-section-reviews",
      ]);
      const summary = slot("reviews-section-summary") as HTMLElement;
      expect([...summary.children].map((child) => child.getAttribute("data-slot"))).toEqual([
        "rating-summary",
        "reviews-section-write",
      ]);
      const reviews = slot("reviews-section-reviews") as HTMLElement;
      expect([...reviews.children].map((child) => child.tagName)).toEqual(["UL", "P", "NAV"]);
    });

    it("separates the reviews by a line, with none above the first or under the last", () => {
      setup("en");
      const items = screen.getAllByRole("listitem").filter((item) => item.querySelector("article"));
      expect(items).toHaveLength(6);
      for (const item of items) {
        expect(tokens(item)).toEqual(expect.arrayContaining(["border-b", "py-6"]));
      }
      expect(tokens(items[0] ?? null)).toContain("first:pt-0");
      expect(tokens(items[5] ?? null)).toContain("last:border-b-0");
    });
  });

  describe("prefetch (every story passes false: the pages answer 404 until M3)", () => {
    const prefetchOf = () =>
      screen.getAllByRole("link").map((link) => link.getAttribute("data-prefetch"));

    it("reaches the write link", () => {
      setup("en", "first", { prefetch: false });
      expect(slot("reviews-section-write")?.getAttribute("data-prefetch")).toBe("false");
    });

    it("is left to Next when it is not given", () => {
      setup("en", "first", { prefetch: undefined });
      expect(slot("reviews-section-write")?.getAttribute("data-prefetch")).toBe("undefined");
      expect(prefetchOf().length).toBeGreaterThan(1);
    });
  });

  describe.each(["de", "el"] as const)("a long %s review", (locale) => {
    it("is shown in full inside its item, and nothing in the section cuts it", () => {
      const long = commerceFixtures[locale].long.review;
      const first = sample(locale);
      const { container } = setup(locale, "first", {
        reviews: [long, ...first.reviews.slice(1)],
      });
      const items = screen.getAllByRole("listitem").filter((item) => item.querySelector("article"));
      expect(within(items[0] as HTMLElement).getByRole("heading", { level: 3 }).textContent).toBe(
        long.title ?? long.author,
      );
      for (const paragraph of long.body.split(/\n{2,}/)) {
        expect(plain(items[0]?.textContent)).toContain(plain(paragraph));
      }
      for (const part of [
        slot("reviews-section"),
        slot("reviews-section-title"),
        slot("reviews-section-summary"),
        slot("reviews-section-reviews"),
        slot("reviews-section-showing"),
        slot("reviews-section-write"),
        ...items,
      ]) {
        expect(part?.className).not.toMatch(CLIPPING_CLASSES);
      }
      // The columns shrink to let a long word wrap: `minmax(0, …)` and `min-w-0` all the way down.
      for (const part of [
        slot("reviews-section-summary"),
        slot("reviews-section-reviews"),
        slot("reviews-section"),
      ]) {
        expect(tokens(part)).toContain("min-w-0");
      }
      expect(container.querySelectorAll("[data-truncate]")).toHaveLength(0);
    });
  });

  describe("the file", () => {
    const text = source("reviews-section.tsx");

    it("keeps the class rules: tokens, logical properties, light only", () => {
      expect(findViolations(text)).toEqual([]);
    });

    it("opens with the T38 header, uses no em dash and cuts nothing", () => {
      expect(text.startsWith('// Ours (T38, SETUP.md "Product-page organisms (T38)"')).toBe(true);
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toMatch(CLIPPING_CLASSES);
    });

    it("is a server component: no directive and no hook, so the reviews are in the HTML", () => {
      expect(text).not.toMatch(/^"use client";?$/m);
      expect(text).not.toMatch(/\buse(?:State|Effect|Ref|Reducer|Memo|Callback)\b/);
    });
  });
});
