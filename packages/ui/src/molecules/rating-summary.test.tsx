import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { RatingSummary } from "./rating-summary";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s/g, " ");

type Summary = Parameters<typeof RatingSummary>[0]["summary"];

function renderSummary(locale: Locale, summary: Summary = commerceFixtures[locale].ratingSummary) {
  return render(
    <RatingSummary
      summary={summary}
      copy={catalogs[locale].molecules.ratingSummary}
      locale={htmlLang[locale]}
    />,
  );
}

/** A summary whose five rows are `counts`, 5 stars first. */
function summaryOf(counts: [number, number, number, number, number]): Summary {
  const count = counts.reduce((sum, each) => sum + each, 0);
  const points = counts.reduce((sum, each, index) => sum + each * (5 - index), 0);
  return {
    average: count === 0 ? 0 : points / count,
    count,
    distribution: counts.map((each, index) => ({ stars: 5 - index, count: each })),
  };
}

describe("RatingSummary", () => {
  it("shows the average with the Rating atom, named by the copy", () => {
    renderSummary("en");
    expect(screen.getByRole("img", { name: "4.6 out of 5" })).toBeTruthy();
    // The large number is the same value, hidden so it is not read twice.
    const average = document.querySelector("[data-slot=rating-summary-average]");
    expect(average?.textContent).toBe("4.6");
    expect(average?.getAttribute("aria-hidden")).toBe("true");
  });

  it("writes the average in the market's number format", () => {
    renderSummary("de");
    expect(screen.getByRole("img", { name: "4,6 von 5" })).toBeTruthy();
    expect(document.querySelector("[data-slot=rating-summary-average]")?.textContent).toBe("4,6");
  });

  it.each([
    ["en", "Based on 128 reviews"],
    ["el", "Βάσει 128 κριτικών"],
    ["de", "Basierend auf 128 Bewertungen"],
    ["fr", "Basé sur 128 avis"],
  ] as const)("says the count in %s", (locale, text) => {
    renderSummary(locale);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it.each([
    ["en", 1, "Based on 1 review"],
    ["en", 2, "Based on 2 reviews"],
    ["el", 1, "Βάσει 1 κριτικής"],
    ["el", 2, "Βάσει 2 κριτικών"],
    ["de", 1, "Basierend auf 1 Bewertung"],
    ["de", 2, "Basierend auf 2 Bewertungen"],
    ["fr", 1, "Basé sur 1 avis"],
    ["fr", 2, "Basé sur 2 avis"],
  ] as const)("picks the plural in %s for %i", (locale, count, text) => {
    renderSummary(locale, summaryOf([count, 0, 0, 0, 0]));
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("groups a large count the way the market does", () => {
    renderSummary("en", summaryOf([1000, 200, 50, 20, 14]));
    expect(screen.getByText("Based on 1,284 reviews")).toBeTruthy();
    expect(screen.getByText("1,000")).toBeTruthy();
  });

  it("lists one row for each star from 5 to 1, each reading its stars and its reviews", () => {
    renderSummary("en");
    const list = screen.getByRole("list", { name: "Ratings by number of stars" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    // The fixture's 128 ratings: 94 + 22 + 8 + 2 + 2.
    const spoken = rows.map((row) => row.querySelector(".sr-only")?.textContent);
    expect(spoken).toEqual([
      "5 stars, 94 reviews",
      "4 stars, 22 reviews",
      "3 stars, 8 reviews",
      "2 stars, 2 reviews",
      "1 star, 2 reviews",
    ]);
  });

  it("carries each number as text, not only as a bar (WCAG 1.4.1)", () => {
    renderSummary("en");
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    const drawn = rows.map((row) =>
      [...row.querySelectorAll("[aria-hidden=true]")]
        .map((part) => part.textContent)
        .filter(Boolean),
    );
    expect(drawn).toEqual([
      ["5", "94"],
      ["4", "22"],
      ["3", "8"],
      ["2", "2"],
      ["1", "2"],
    ]);
  });

  it("hides what the sentence already says from assistive technology", () => {
    renderSummary("en");
    for (const row of within(screen.getByRole("list")).getAllByRole("listitem")) {
      const visible = [...row.children].filter((part) => !part.classList.contains("sr-only"));
      expect(visible).toHaveLength(3);
      for (const part of visible) expect(part.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("sizes each bar by its share of all the reviews", () => {
    const { container } = renderSummary("en", summaryOf([60, 20, 10, 5, 5]));
    const widths = [
      ...container.querySelectorAll<HTMLElement>("[data-slot=rating-summary-bar]"),
    ].map((bar) => bar.style.width);
    expect(widths).toEqual(["60%", "20%", "10%", "5%", "5%"]);
  });

  it("rounds a share to a tenth of a percent, and draws an empty row as no bar", () => {
    const { container } = renderSummary("en", summaryOf([94, 22, 8, 2, 0]));
    const widths = [
      ...container.querySelectorAll<HTMLElement>("[data-slot=rating-summary-bar]"),
    ].map((bar) => bar.style.width);
    expect(widths).toEqual(["74.6%", "17.5%", "6.3%", "1.6%", "0%"]);
  });

  it.each(LOCALES)("shows the message alone for no reviews, in %s", (locale) => {
    const { container } = renderSummary(locale, summaryOf([0, 0, 0, 0, 0]));
    const message = catalogs[locale].molecules.ratingSummary.count.match(/=0 \{([^}]*)\}/)?.[1];
    expect(message).toBeTruthy();
    expect(container.textContent).toBe(message);
    // Not zero stars, and no empty bars (SBP product-reviews.md).
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("says 'No reviews yet' in English", () => {
    renderSummary("en", summaryOf([0, 0, 0, 0, 0]));
    expect(screen.getByText("No reviews yet")).toBeTruthy();
  });

  it.each(LOCALES)("reads every row in %s", (locale) => {
    renderSummary(locale);
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    const first = plain(rows[0]?.querySelector(".sr-only")?.textContent);
    const last = plain(rows[4]?.querySelector(".sr-only")?.textContent);
    expect(first).toMatch(/^5 \S+, 94 \S+$/);
    expect(last).toMatch(/^1 \S+, 2 \S+$/);
    expect(first).not.toBe(last);
  });

  it("uses the singular for one star and one review", () => {
    renderSummary("en", summaryOf([0, 0, 0, 0, 1]));
    expect(screen.getByText("1 star, 1 review")).toBeTruthy();
    renderSummary("de", summaryOf([0, 0, 0, 0, 1]));
    expect(screen.getByText("1 Stern, 1 Bewertung")).toBeTruthy();
  });

  it.each(["de", "el"] as const)("lets the longest copy, in %s, wrap", (locale) => {
    const { container } = renderSummary(locale);
    for (const element of container.querySelectorAll("*")) {
      expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
    }
    // The bars take the width that is left, whatever the labels take.
    expect(container.querySelector("ul")?.className).toContain("grid-cols-[auto_1fr_auto]");
  });

  it("passes the container's own props on, and merges the class", () => {
    const { container } = render(
      <RatingSummary
        summary={commerceFixtures.en.ratingSummary}
        copy={catalogs.en.molecules.ratingSummary}
        locale="en-US"
        id="reviews-summary"
        className="max-w-sm"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.id).toBe("reviews-summary");
    expect(root.className).toContain("max-w-sm");
  });
});
