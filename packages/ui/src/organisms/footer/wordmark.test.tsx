// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). FooterWordmark's tests, in
// Testing Library and happy-dom: the checks all five footers share (`describeFooter`) and what the
// big wordmark footer alone does. Under the multi-column footer's pieces it sets the store's name
// very large across the width: hidden from assistive technology, in container query units on a
// wrapper that is the container, and small enough for a long name to wrap inside a phone's width.
import { designSystemFixtures } from "@shopblok/fixtures";
import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { before, describeFooter, footer, footerProps, slot } from "../../test-support/footer-suite";
import { FooterWordmark, wordmarkSize } from "./wordmark";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeFooter({
  name: "FooterWordmark",
  variant: "wordmark",
  Footer: FooterWordmark,
  columns: true,
  newsletter: true,
  payments: true,
  logo: true,
  socialHeading: "visible",
});

const text = (wordmark: Element) => wordmark.querySelector("p") as HTMLElement;
const longName = designSystemFixtures.en.long.storeName;

describe("FooterWordmark: the name set large", () => {
  it("is the last box of the footer, after the bottom row, and says the store's name", () => {
    render(<FooterWordmark {...footerProps()} />);
    const wordmark = slot("footer-wordmark") as HTMLElement;
    expect(footer().lastElementChild).toBe(wordmark);
    expect(before(slot("footer-bottom") as Element, wordmark)).toBe(true);
    expect(text(wordmark).textContent).toBe("Shopblok");
  });

  it("is hidden from assistive technology and takes no focus: the logo link already names the store", () => {
    render(<FooterWordmark {...footerProps()} />);
    const wordmark = slot("footer-wordmark") as HTMLElement;
    expect(wordmark.getAttribute("aria-hidden")).toBe("true");
    expect(wordmark.querySelectorAll("a, button, input, [tabindex]")).toHaveLength(0);
    // A screen reader meets the name once: in the logo link, not in the wordmark.
    const seen = screen.getAllByText("Shopblok", { ignore: "[aria-hidden='true'] *" });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.closest("a")).toBe(slot("footer-logo"));
    expect(within(wordmark).queryByText("Shopblok")).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "Shopblok" })).toBeNull();
  });

  it("is a paragraph, not a heading: the page's outline is the shop's words", () => {
    render(<FooterWordmark {...footerProps()} />);
    expect(text(slot("footer-wordmark") as Element).tagName).toBe("P");
    expect(footer().querySelector("h1")).toBeNull();
  });

  it("is sized in container query units, on a wrapper that is the container", () => {
    render(<FooterWordmark {...footerProps()} />);
    const wordmark = slot("footer-wordmark") as HTMLElement;
    // An element cannot query itself: the text is a child of the container, never the container.
    expect(wordmark.className).toContain("@container");
    expect(text(wordmark).className).not.toContain("@container");
  });

  it("writes the size in its server HTML: happy-dom's style parser does not know cqw, the markup does", () => {
    const html = renderToStaticMarkup(<FooterWordmark {...footerProps()} />);
    expect(html).toContain(`style="font-size:${wordmarkSize("Shopblok")}cqw"`);
    expect(html).toContain('aria-hidden="true" data-slot="footer-wordmark"');
  });

  it("wraps a long name and breaks a word that is longer than the box", () => {
    render(<FooterWordmark {...footerProps("en", { storeName: longName })} />);
    const paragraph = text(slot("footer-wordmark") as Element);
    expect(paragraph.textContent).toBe(longName);
    expect(paragraph.className).toContain("wrap-anywhere");
    expect(paragraph.className).not.toMatch(
      /whitespace-nowrap|truncate|line-clamp|overflow-hidden/,
    );
  });

  it("draws the wordmark for a bare footer too", () => {
    render(<FooterWordmark {...footerProps("en", { columns: [], newsletter: undefined })} />);
    expect(slot("footer-wordmark")).not.toBeNull();
    expect(slot("footer-bottom")).not.toBeNull();
  });
});

describe("wordmarkSize", () => {
  it("makes a short name very large and a long one smaller, between 8 and 22 cqw", () => {
    expect(wordmarkSize("Shop")).toBe(22);
    expect(wordmarkSize("Shopblok")).toBeLessThan(22);
    expect(wordmarkSize("Shopblok")).toBeGreaterThan(wordmarkSize("Shopblok Heritage"));
    expect(wordmarkSize(longName)).toBe(8);
    expect(wordmarkSize("")).toBe(22);
  });

  it("sets a capital wider than a small letter, as the type does", () => {
    expect(wordmarkSize("WWWWWWWW")).toBeLessThan(wordmarkSize("wwwwwwww"));
  });

  it("is a number the style can print, to one decimal place", () => {
    for (const name of ["A", "Shopblok", "Shopblok Heritage Outfitters", "Ωmega Δ"]) {
      const size = wordmarkSize(name);
      expect(Number.isFinite(size)).toBe(true);
      expect(size * 10).toBeCloseTo(Math.round(size * 10), 9);
    }
  });
});
