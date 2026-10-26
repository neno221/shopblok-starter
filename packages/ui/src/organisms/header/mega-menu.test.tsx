// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4 and §13). HeaderMegaMenu's tests, in
// Testing Library and happy-dom: the checks all six headers share (`describeHeader`) and what the
// mega menu header alone does. From lg it has two rows: the logo, a wide search, the utilities and
// the cart; and under them the navigation, a row of its own as wide as the header's content.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  before,
  carts,
  describeHeader,
  header,
  headerProps,
  hiddenBelowLg,
  logos,
  navigationLandmark,
  shownFromLg,
  slot,
} from "../../test-support/header-suite";
import { HeaderMegaMenu } from "./mega-menu";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeHeader({
  name: "HeaderMegaMenu",
  variant: "mega-menu",
  Header: HeaderMegaMenu,
  navigation: true,
  utilities: "all",
  switcher: "row",
});

describe("HeaderMegaMenu: its two rows", () => {
  it("puts the navigation in a row of its own under the first, from lg, as wide as the content", () => {
    render(<HeaderMegaMenu {...headerProps()} />);
    const row = slot("header-nav-row") as HTMLElement;
    expect(row.className).toContain("hidden");
    expect(row.className).toContain("lg:block");
    expect(row.className).toContain("border-t");
    expect(row.contains(navigationLandmark())).toBe(true);
    expect(row.firstElementChild?.className).toContain("max-w-page");
    expect(navigationLandmark()?.className).toContain("w-full");
    expect(before(carts()[0] as Element, row)).toBe(true);
  });

  it("draws no second row for a shop with no navigation", () => {
    render(<HeaderMegaMenu {...headerProps("en", { navigation: [] })} />);
    expect(slot("header-nav-row")).toBeNull();
    expect(navigationLandmark()).toBeNull();
  });

  it("has the logo, the search, the account links, the switcher and the cart in reading order", () => {
    render(<HeaderMegaMenu {...headerProps()} />);
    const order = [
      logos()[0],
      slot("header-search"),
      slot("header-account"),
      slot("header-wishlist"),
      slot("market-switcher"),
      carts()[0],
    ];
    for (let index = 1; index < order.length; index++) {
      expect(before(order[index - 1] as Element, order[index] as Element), `part ${index}`).toBe(
        true,
      );
    }
  });
});

describe("HeaderMegaMenu: the wide search", () => {
  it("is one link at every width: an icon below lg, a field with the word from lg", () => {
    render(<HeaderMegaMenu {...headerProps()} />);
    const links = screen.getAllByRole("link", { name: "Search" });
    expect(links).toHaveLength(1);
    const search = links[0] as HTMLElement;
    expect(search.getAttribute("data-slot")).toBe("header-search");
    expect(search.className).toContain("size-11");
    expect(search.className).toContain("lg:w-full");
    expect(search.className).toContain("lg:min-h-11");
    expect(search.className).toContain("lg:border-input");
    expect(hiddenBelowLg(search)).toBe(false);
    // The word is the link's name at every width, so a reader who sees the word hears the word.
    const word = search.querySelector("span") as HTMLElement;
    expect(word.className).toContain("sr-only");
    expect(word.className).toContain("lg:not-sr-only");
  });

  it("leaves the search out when the shop has no search page", () => {
    render(
      <HeaderMegaMenu
        {...headerProps("en", { utilities: { marketSwitcher: true, account: "/us/account" } })}
      />,
    );
    expect(slot("header-search")).toBeNull();
  });
});

describe("HeaderMegaMenu: the end of the first row", () => {
  it("shows the account links and the switcher from lg, and the cart at every width", () => {
    render(<HeaderMegaMenu {...headerProps()} />);
    for (const part of [slot("header-account"), slot("header-wishlist"), slot("market-switcher")]) {
      expect(hiddenBelowLg(part as Element)).toBe(true);
      expect(shownFromLg(part as Element)).toBe(true);
    }
    expect(hiddenBelowLg(carts()[0] as Element)).toBe(false);
    expect(header().querySelectorAll('[data-slot="cart-button"]')).toHaveLength(1);
  });
});

// PR 75 review, item 1: the page's search slot keeps the wide field's place in the grid.
describe("HeaderMegaMenu: the search slot", () => {
  it("sits where the wide search field would, between the logo and the utilities", () => {
    render(
      <HeaderMegaMenu
        {...headerProps("en", { search: <button type="button" data-testid="search-island" /> })}
      />,
    );
    const box = slot("header-search-slot");
    expect(box?.contains(document.querySelector('[data-testid="search-island"]'))).toBe(true);
    expect(box?.className).toContain("lg:col-start-2");
    expect(box?.className).toContain("lg:row-start-1");
  });
});
