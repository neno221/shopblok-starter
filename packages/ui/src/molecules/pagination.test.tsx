import { readFileSync } from "node:fs";
import path from "node:path";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { itemsOf, Pagination, windowOf, type PaginationProps } from "./pagination";

const source = readFileSync(path.join(import.meta.dirname, "pagination.tsx"), "utf8");

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const hrefFor = (page: number) =>
  page === 1 ? "/us/categories/hoodies" : `/us/categories/hoodies?page=${page}`;

function setup(
  page: number,
  pageCount: number,
  locale: Locale = "en",
  props: Partial<PaginationProps> = {},
) {
  return render(
    <Pagination
      page={page}
      pageCount={pageCount}
      hrefFor={hrefFor}
      copy={catalogs[locale].molecules.pagination}
      locale={htmlLang[locale]}
      {...props}
    />,
  );
}

/** The pager's items in reading order, each as the text a reader gets: a number or `…`. */
const slots = (nav: HTMLElement) =>
  within(nav)
    .getAllByRole("listitem")
    .map((item) => item.textContent?.trim() ?? "");

describe("windowOf", () => {
  it.each([
    // [page, pageCount, siblings, the slots]
    [1, 20, 1, [1, 2, 3, 4, 5, "end", 20]],
    [3, 20, 1, [1, 2, 3, 4, 5, "end", 20]],
    [4, 20, 1, [1, 2, 3, 4, 5, "end", 20]],
    [5, 20, 1, [1, "start", 4, 5, 6, "end", 20]],
    [10, 20, 1, [1, "start", 9, 10, 11, "end", 20]],
    [16, 20, 1, [1, "start", 15, 16, 17, "end", 20]],
    [17, 20, 1, [1, "start", 16, 17, 18, 19, 20]],
    [20, 20, 1, [1, "start", 16, 17, 18, 19, 20]],
    [1, 20, 0, [1, 2, 3, "end", 20]],
    [3, 20, 0, [1, 2, 3, "end", 20]],
    [4, 20, 0, [1, "start", 4, "end", 20]],
    [10, 20, 0, [1, "start", 10, "end", 20]],
    [18, 20, 0, [1, "start", 18, 19, 20]],
    [20, 20, 0, [1, "start", 18, 19, 20]],
  ] as const)("page %i of %i with %i on each side is %j", (page, count, siblings, expected) => {
    expect(windowOf(page, count, siblings)).toEqual(expected);
  });

  it("shows every page when they fit the slots, with no ellipsis", () => {
    expect(windowOf(1, 1, 1)).toEqual([1]);
    expect(windowOf(2, 3, 1)).toEqual([1, 2, 3]);
    expect(windowOf(4, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(windowOf(3, 5, 0)).toEqual([1, 2, 3, 4, 5]);
  });

  it("never hides a single page behind an ellipsis, and keeps the same number of slots", () => {
    for (const siblings of [0, 1, 2]) {
      for (let count = 2 * siblings + 6; count <= 40; count++) {
        for (let page = 1; page <= count; page++) {
          const window = windowOf(page, count, siblings);
          expect(window, `${page} of ${count}`).toHaveLength(2 * siblings + 5);
          expect(window).toContain(1);
          expect(window).toContain(count);
          expect(window).toContain(page);
          // Each ellipsis stands for at least two pages.
          const numbers = window.filter((slot): slot is number => typeof slot === "number");
          for (const [index, number] of numbers.entries()) {
            const next = numbers[index + 1];
            if (next !== undefined) expect(next - number).toBeGreaterThanOrEqual(1);
          }
          const start = window.indexOf("start");
          if (start !== -1) expect(window[start + 1]).toBeGreaterThanOrEqual(4);
          const end = window.indexOf("end");
          if (end !== -1) expect(window[end - 1]).toBeLessThanOrEqual(count - 3);
        }
      }
    }
  });
});

describe("itemsOf", () => {
  /** What one width shows: the page numbers and `start` / `end` for its ellipses, in order. */
  const shown = (page: number, count: number, width: "wide" | "narrow") =>
    itemsOf(page, count)
      .filter((item) => item[width])
      .map((item) => item.page ?? item.key);

  it("holds the seven-slot window for `sm` and up, and the five-slot window below it", () => {
    for (let count = 1; count <= 40; count++) {
      for (let page = 1; page <= count; page++) {
        expect(shown(page, count, "wide"), `wide ${page} of ${count}`).toEqual(
          windowOf(page, count, 1),
        );
        expect(shown(page, count, "narrow"), `narrow ${page} of ${count}`).toEqual(
          windowOf(page, count, 0),
        );
      }
    }
  });

  it("puts every item in at least one window", () => {
    for (let page = 1; page <= 30; page++) {
      for (const item of itemsOf(page, 30)) expect(item.wide || item.narrow).toBe(true);
    }
  });

  it("lists each page once, in order", () => {
    const numbers = itemsOf(10, 20)
      .map((item) => item.page)
      .filter((number): number is number => number !== undefined);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe("Pagination", () => {
  it("is a server component: no state and no events, so no 'use client'", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
  });

  it("is links only: no button anywhere, and every link has an href", () => {
    const { container } = setup(10, 20);
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(container.querySelector("button, [role=button]")).toBeNull();
    for (const link of container.querySelectorAll("a")) {
      expect(link.getAttribute("href")).toMatch(/^\/us\/categories\/hoodies/);
      expect(link.getAttribute("role")).toBeNull();
      expect(link.getAttribute("tabindex")).toBeNull();
    }
    // Nor does the source mention one.
    expect(source).not.toMatch(/Button|<button/);
  });

  it("is a navigation named by the copy, with a list of items", () => {
    setup(10, 20);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("list")).toBeTruthy();
  });

  it("marks the current page with aria-current, and only that one", () => {
    const { container } = setup(10, 20);
    const current = container.querySelectorAll("[aria-current]");
    expect(current).toHaveLength(1);
    expect(current[0]?.getAttribute("aria-current")).toBe("page");
    expect(current[0]?.textContent).toBe("10");
    expect(current[0]?.getAttribute("href")).toBe(hrefFor(10));
  });

  it("names a page 'Page 9', and the current page 'Page 10 of 20'", () => {
    setup(10, 20);
    expect(screen.getByRole("link", { name: "Page 9" }).getAttribute("href")).toBe(hrefFor(9));
    expect(screen.getByRole("link", { name: "Page 10 of 20" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "Page 1" }).getAttribute("href")).toBe(
      "/us/categories/hoodies",
    );
    expect(screen.getByRole("link", { name: "Page 20" })).toBeTruthy();
  });

  it("keeps each visible number inside its link's name (WCAG 2.5.3)", () => {
    const { container } = setup(10, 20);
    for (const link of container.querySelectorAll("a")) {
      const visible = link.textContent?.trim() ?? "";
      if (/^\d+$/.test(visible)) expect(link.getAttribute("aria-label")).toContain(visible);
    }
  });

  it("links to the previous and the next page, named by their visible text", () => {
    setup(10, 20);
    const previous = screen.getByRole("link", { name: "Previous" });
    const next = screen.getByRole("link", { name: "Next" });
    expect(previous.getAttribute("href")).toBe(hrefFor(9));
    expect(previous.getAttribute("rel")).toBe("prev");
    expect(next.getAttribute("href")).toBe(hrefFor(11));
    expect(next.getAttribute("rel")).toBe("next");
  });

  it("goes to the first page without a page parameter when the app's hrefFor does", () => {
    setup(2, 20);
    expect(screen.getByRole("link", { name: "Previous" }).getAttribute("href")).toBe(
      "/us/categories/hoodies",
    );
  });

  it("leaves Previous out on the first page, and Next out on the last", () => {
    const first = setup(1, 20);
    expect(screen.queryByRole("link", { name: "Previous" })).toBeNull();
    expect(screen.getByRole("link", { name: "Next" })).toBeTruthy();
    first.unmount();
    setup(20, 20);
    expect(screen.queryByRole("link", { name: "Next" })).toBeNull();
    expect(screen.getByRole("link", { name: "Previous" })).toBeTruthy();
  });

  it("draws nothing for a listing of one page", () => {
    const { container } = setup(1, 1);
    expect(container.innerHTML).toBe("");
  });

  it("shows two pages as two links with the right neighbour", () => {
    setup(1, 2);
    const nav = screen.getByRole("navigation");
    expect(slots(nav)).toEqual(["1", "2", "Next"]);
  });

  it("reads each ellipsis out ('More pages'), and its icon is decoration", () => {
    setup(10, 20);
    const ellipses = document.querySelectorAll("[data-slot=pagination-ellipsis]");
    expect(ellipses).toHaveLength(2);
    for (const ellipsis of ellipses) {
      expect(within(ellipsis as HTMLElement).getByText("More pages").className).toContain(
        "sr-only",
      );
      expect(ellipsis.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("shows the window the plan asks for: first, current and its neighbours, last", () => {
    setup(10, 20);
    const wide = itemsOf(10, 20)
      .filter((item) => item.wide)
      .map((item) => item.page ?? "…");
    expect(wide).toEqual([1, "…", 9, 10, 11, "…", 20]);
    const narrow = itemsOf(10, 20)
      .filter((item) => item.narrow)
      .map((item) => item.page ?? "…");
    expect(narrow).toEqual([1, "…", 10, "…", 20]);
  });

  it("fits 343 px with 20 pages: at most seven items below `sm`, each 44 px", () => {
    // Previous, Next and five slots at the middle of the listing; seven items of 44 px and six
    // gaps of 4 px are 332 px.
    for (const page of [1, 2, 3, 4, 10, 17, 18, 19, 20]) {
      const { container, unmount } = render(
        <Pagination
          page={page}
          pageCount={20}
          hrefFor={hrefFor}
          copy={catalogs.en.molecules.pagination}
          locale="en-US"
        />,
      );
      // What shows below `sm` is every item that is not hidden there.
      const items = [...container.querySelectorAll("li")].filter(
        (item) => !item.className.includes("max-sm:hidden"),
      );
      expect(items.length, `page ${page}`).toBeLessThanOrEqual(7);
      expect(items.length * 44 + (items.length - 1) * 4).toBeLessThanOrEqual(343);
      unmount();
    }
  });

  it("wraps its row instead of overflowing when the room is short", () => {
    setup(10, 20);
    expect(document.querySelector("[data-slot=pagination-content]")?.className).toContain(
      "flex-wrap",
    );
  });

  it("makes every link at least 44 × 44 px (D32)", () => {
    const { container } = setup(10, 20);
    for (const link of container.querySelectorAll("a")) {
      expect(link.className).toContain("min-h-11");
      expect(link.className).toContain("min-w-11");
    }
    for (const ellipsis of container.querySelectorAll("[data-slot=pagination-ellipsis]")) {
      expect(ellipsis.className).toContain("size-11");
    }
  });

  it("is reached with Tab, link by link, in reading order, with the ring at full strength", async () => {
    const user = userEvent.setup();
    const { container } = setup(10, 20);
    const links = [...container.querySelectorAll("a")];
    // The narrow window's pages are among the wide one's: the same seven links, not more.
    expect(links.map((link) => link.getAttribute("rel") ?? link.textContent)).toEqual([
      "prev",
      "1",
      "9",
      "10",
      "11",
      "20",
      "next",
    ]);
    for (const link of links) {
      await user.tab();
      expect(document.activeElement).toBe(link);
      expect(link.className).toContain("focus-visible:ring-ring");
    }
  });

  it("names the current page and the others in each locale's words", () => {
    for (const locale of LOCALES) {
      const copy = catalogs[locale].molecules.pagination;
      const { unmount } = setup(10, 20, locale);
      const plain = (text: string) => text.replace(/\s/g, " ");
      expect(screen.getByRole("navigation", { name: plain(copy.label) })).toBeTruthy();
      const current = formatMessage(copy.current, { page: 10, pageCount: 20 }, htmlLang[locale]);
      expect(screen.getByRole("link", { name: current }).getAttribute("aria-current")).toBe("page");
      const other = formatMessage(copy.page, { page: 9 }, htmlLang[locale]);
      expect(screen.getByRole("link", { name: other })).toBeTruthy();
      expect(screen.getByRole("link", { name: copy.previous })).toBeTruthy();
      expect(screen.getByRole("link", { name: copy.next })).toBeTruthy();
      unmount();
    }
  });

  it("says it in German and Greek, with no English left", () => {
    setup(10, 20, "de");
    expect(screen.getByRole("link", { name: "Seite 10 von 20" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Zurück" })).toBeTruthy();
    expect(screen.getAllByText("Weitere Seiten", { selector: ".sr-only" })).toHaveLength(2);
    expect(document.body.innerHTML).not.toMatch(/Previous|Next|More pages|of 20/);
    document.body.innerHTML = "";
    setup(10, 20, "el");
    expect(screen.getByRole("link", { name: "Σελίδα 10 από 20" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Προηγούμενη" })).toBeTruthy();
  });

  it("writes the numbers in the market's format", () => {
    setup(1500, 2000, "en");
    expect(screen.getByRole("link", { name: "Page 1,500 of 2,000" }).textContent).toBe("1,500");
    document.body.innerHTML = "";
    setup(1500, 2000, "de");
    expect(screen.getByRole("link", { name: "Seite 1.500 von 2.000" }).textContent).toBe("1.500");
  });

  it("lets a big page number widen its link instead of cutting it", () => {
    setup(1500, 2000);
    const link = screen.getByRole("link", { name: "Page 1,500 of 2,000" });
    expect(link.className).toContain("min-w-11");
    expect(link.className).not.toContain("size-11");
    expect(link.className).not.toMatch(CLIPPING_CLASSES);
  });

  it("points its chevrons along the reading direction", () => {
    setup(10, 20);
    for (const name of ["Previous", "Next"]) {
      expect(
        screen.getByRole("link", { name }).querySelector("svg")?.getAttribute("class"),
      ).toContain("rtl:rotate-180");
    }
  });

  it.each(longLabels)(
    "takes long %s labels for Previous, Next and the ellipsis without a clipping class",
    (_locale, strings) => {
      const copy = {
        ...catalogs.en.molecules.pagination,
        previous: strings.action,
        next: strings.linkLabel,
        more: strings.hint,
        label: strings.fieldLabel,
      };
      const { container } = setup(10, 20, "en", { copy });
      expect(screen.getByRole("navigation", { name: strings.fieldLabel })).toBeTruthy();
      for (const name of [strings.action, strings.linkLabel]) {
        const link = screen.getByRole("link", { name });
        expect(link.className).not.toMatch(CLIPPING_CLASSES);
        expect(within(link).getByText(name).className).not.toMatch(CLIPPING_CLASSES);
      }
      expect(screen.getAllByText(strings.hint)).toHaveLength(2);
      for (const element of container.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
    },
  );

  it("passes the nav's own props on and merges the class", () => {
    setup(10, 20, "en", { id: "pager", className: "mt-8" });
    const nav = screen.getByRole("navigation");
    expect(nav.id).toBe("pager");
    expect(nav.className).toContain("mt-8");
    expect(nav.className).toContain("justify-center");
  });

  it("draws no dark variant and no tinted ring", () => {
    setup(10, 20);
    const classes = [...document.querySelectorAll("[class]")]
      .map((element) => element.getAttribute("class"))
      .join(" ");
    expect(classes).not.toMatch(/(?:^|[\s:])dark:/);
    expect(classes).not.toMatch(/ring-[a-z-]+\/\d/);
  });
});
