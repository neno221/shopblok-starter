import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { ReviewItem } from "./review-item";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

function renderReview(
  locale: Locale,
  review = commerceFixtures[locale].reviews[0]!,
  extra: { headingLevel?: 2 | 3 | 4 | 5 | 6 } = {},
) {
  return render(
    <ReviewItem
      review={review}
      copy={catalogs[locale].molecules.reviewItem}
      locale={htmlLang[locale]}
      {...extra}
    />,
  );
}

/** A catalog's `{value}` and `{max}` filled in, with Intl's spaces made plain. */
const rated = (locale: Locale, value: number) =>
  catalogs[locale].molecules.reviewItem.rating
    .replace("{value}", String(value))
    .replace("{max}", "5");

afterEach(() => {
  vi.useRealTimers();
});

describe("ReviewItem", () => {
  it.each(LOCALES)("is an article with the title as its heading, in %s", (locale) => {
    const review = commerceFixtures[locale].reviews[0]!;
    renderReview(locale);
    const article = screen.getByRole("article");
    expect(within(article).getByRole("heading", { level: 3, name: review.title })).toBeTruthy();
    expect(within(article).getByText(review.author)).toBeTruthy();
    expect(within(article).getByText(review.body)).toBeTruthy();
  });

  it.each([2, 3, 4, 5, 6] as const)("puts the heading at level %i when asked", (level) => {
    renderReview("en", undefined, { headingLevel: level });
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { level })).toBeTruthy();
  });

  it("makes the heading an h3 by default", () => {
    renderReview("en");
    expect(screen.getByRole("heading").tagName).toBe("H3");
  });

  it("uses the author as the heading when the review has no title, and says the name once", () => {
    const review = commerceFixtures.en.reviews.find((candidate) => candidate.title === undefined)!;
    renderReview("en", review);
    expect(screen.getByRole("heading", { name: review.author })).toBeTruthy();
    expect(screen.getAllByText(review.author)).toHaveLength(1);
  });

  it("names the rating in the language and the market's number format", () => {
    const review = commerceFixtures.en.reviews[1]!;
    expect(review.rating).toBe(4);
    for (const locale of LOCALES) {
      const { unmount } = renderReview(locale, { ...review });
      expect(screen.getByRole("img", { name: rated(locale, 4) })).toBeTruthy();
      unmount();
    }
    renderReview("en", review);
    expect(screen.getByRole("img", { name: "Rated 4 out of 5" })).toBeTruthy();
  });

  it("dates the review with the locale's own format, as a <time> with the exact moment", () => {
    const { reviews } = commerceFixtures.en;
    const review = { ...reviews[0]!, createdAt: "2026-09-12T14:20:00.000Z" };
    const texts = new Map<Locale, string>();
    for (const locale of LOCALES) {
      const { container, unmount } = renderReview(locale, review);
      const time = container.querySelector("time");
      expect(time?.getAttribute("datetime")).toBe(review.createdAt);
      const expected = new Intl.DateTimeFormat(htmlLang[locale], {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(review.createdAt));
      expect(time?.textContent).toBe(expected);
      texts.set(locale, time?.textContent ?? "");
      unmount();
    }
    expect(texts.get("en")).toContain("2026");
    expect(new Set(texts.values()).size).toBe(4);
  });

  it("dates a review by UTC, so late evening is not tomorrow in another zone", () => {
    const review = { ...commerceFixtures.en.reviews[0]!, createdAt: "2026-09-12T23:30:00.000Z" };
    const { container } = renderReview("en", review);
    expect(container.querySelector("time")?.textContent).toBe("Sep 12, 2026");
  });

  it("does not read the clock (D50): the same review, a year later, reads the same", () => {
    const { container, unmount } = renderReview("en");
    const first = container.innerHTML;
    unmount();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2027-10-01T09:00:00Z") });
    expect(renderReview("en").container.innerHTML).toBe(first);
  });

  it("says a verified purchase in words, with an icon that is hidden from assistive technology", () => {
    const { container } = renderReview("en");
    const mark = container.querySelector("[data-slot=review-verified]");
    expect(mark?.textContent).toBe("Verified purchase");
    expect(mark?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("Verified purchase")).toBeTruthy();
  });

  it.each(LOCALES)("says it in %s too", (locale) => {
    renderReview(locale);
    expect(screen.getByText(catalogs[locale].molecules.reviewItem.verified)).toBeTruthy();
  });

  it("shows no mark for a purchase that is not verified", () => {
    const review = commerceFixtures.en.reviews.find((candidate) => !candidate.verified)!;
    const { container } = renderReview("en", review);
    expect(container.querySelector("[data-slot=review-verified]")).toBeNull();
    expect(screen.queryByText("Verified purchase")).toBeNull();
  });

  it.each(LOCALES)("renders all six fixture reviews in %s", (locale) => {
    for (const review of commerceFixtures[locale].reviews) {
      const { container, unmount } = renderReview(locale, review);
      expect(container.textContent).toContain(review.body);
      expect(
        screen.getByRole("img", { name: rated(locale, review.rating) }),
        review.id,
      ).toBeTruthy();
      unmount();
    }
  });

  it("splits paragraphs on CRLF blank lines and blank lines with spaces, as a textarea sends them", () => {
    const { review } = commerceFixtures.en.long;
    const { container } = renderReview("en", {
      ...review,
      body: "Great fit.\r\n\r\nWashes well.\n  \nWarm too.\r\nSame paragraph.",
    });
    const paragraphs = [...container.querySelectorAll("[data-slot=review-body] p")];
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual([
      "Great fit.",
      "Washes well.",
      "Warm too.\r\nSame paragraph.",
    ]);
  });

  it.each(LOCALES)(
    "keeps a long review's paragraphs, and lets long words wrap, in %s",
    (locale) => {
      const { review } = commerceFixtures[locale].long;
      const { container } = renderReview(locale, review);
      const paragraphs = [...container.querySelectorAll("[data-slot=review-body] p")];
      expect(paragraphs).toHaveLength(review.body.split("\n\n").length);
      expect(paragraphs.length).toBeGreaterThan(1);
      expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual(
        review.body.split("\n\n"),
      );
      for (const element of container.querySelectorAll("h3, p, span")) {
        expect(element.className, element.outerHTML.slice(0, 80)).not.toMatch(CLIPPING_CLASSES);
      }
      expect(screen.getByRole("heading").className).toContain("wrap-anywhere");
      for (const paragraph of paragraphs) expect(paragraph.className).toContain("wrap-anywhere");
    },
  );

  it.each(longLabels)("takes a long %s name, title and body", (_locale, strings) => {
    const review = {
      ...commerceFixtures.en.reviews[0]!,
      author: strings.personName,
      title: strings.productName,
      body: strings.productDescription,
    };
    const { container } = renderReview("en", review);
    expect(screen.getByRole("heading", { name: strings.productName })).toBeTruthy();
    expect(container.textContent).toContain(strings.personName);
    expect(container.textContent).toContain(strings.productDescription);
  });

  it("passes the article's own props on, and merges the class", () => {
    render(
      <ReviewItem
        review={commerceFixtures.en.reviews[0]!}
        copy={catalogs.en.molecules.reviewItem}
        locale="en-US"
        id="review-1"
        className="border-b pb-6"
      />,
    );
    const article = screen.getByRole("article");
    expect(article.id).toBe("review-1");
    expect(article.className).toContain("pb-6");
  });
});
