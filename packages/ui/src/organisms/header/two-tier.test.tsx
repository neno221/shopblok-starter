// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). HeaderTwoTier's tests, in Testing
// Library and happy-dom: the checks all six headers share (`describeHeader`) and what the two-tier
// header alone does. Its top bar holds the market switcher at every width (a popover from md, a
// bottom sheet below) and, from lg, the account and wishlist links as words; under it is the
// classic row with the search and the cart.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  before,
  carts,
  describeHeader,
  fixturesOf,
  header,
  headerProps,
  hiddenBelowLg,
  logos,
  menuButton,
  navigationLandmark,
  plain,
  shownFromLg,
  slot,
} from "../../test-support/header-suite";
import { HeaderTwoTier } from "./two-tier";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeHeader({
  name: "HeaderTwoTier",
  variant: "two-tier",
  Header: HeaderTwoTier,
  navigation: true,
  utilities: "all",
  switcher: "bar",
});

const utilities = fixturesOf("en").header.content.utilities;

describe("HeaderTwoTier: the top bar", () => {
  it("is above the main row, with the switcher at its start and the account links at its end", () => {
    render(<HeaderTwoTier {...headerProps()} />);
    const bar = slot("header-bar") as HTMLElement;
    expect(bar.className).toContain("bg-secondary");
    expect(bar.className).toContain("border-b");
    expect(header().firstElementChild).toBe(bar);
    expect(bar.contains(slot("market-switcher"))).toBe(true);
    expect(bar.contains(slot("header-account"))).toBe(true);
    expect(bar.contains(slot("header-wishlist"))).toBe(true);
    expect(before(slot("market-switcher") as Element, slot("header-account") as Element)).toBe(
      true,
    );
    expect(before(bar, menuButton() as Element)).toBe(true);
  });

  it("writes the account links as words, from lg, and the switcher at every width", () => {
    render(<HeaderTwoTier {...headerProps()} />);
    for (const name of ["header-account", "header-wishlist"]) {
      const link = slot(name) as HTMLElement;
      expect(plain(link.textContent)).toBe(name === "header-account" ? "Account" : "Wishlist");
      expect(link.querySelector(".sr-only")).toBeNull();
      expect(hiddenBelowLg(link)).toBe(true);
      expect(shownFromLg(link)).toBe(true);
    }
    expect(hiddenBelowLg(slot("market-switcher") as Element)).toBe(false);
  });

  it("is a bar for lg and up only when it has account links and no switcher", () => {
    render(
      <HeaderTwoTier
        {...headerProps("en", { utilities: { ...utilities, marketSwitcher: false } })}
      />,
    );
    const bar = slot("header-bar") as HTMLElement;
    expect(bar.className).toContain("hidden");
    expect(bar.className).toContain("lg:block");
    expect(slot("market-switcher")).toBeNull();
    expect(bar.contains(slot("header-account"))).toBe(true);
  });

  it("is a bar for the switcher alone when the shop has no account or wishlist", () => {
    render(
      <HeaderTwoTier
        {...headerProps("en", { utilities: { search: utilities.search, marketSwitcher: true } })}
      />,
    );
    const bar = slot("header-bar") as HTMLElement;
    expect(bar.className).not.toContain("hidden");
    expect(bar.contains(slot("market-switcher"))).toBe(true);
    expect(slot("header-account")).toBeNull();
  });

  it("is left out when there is nothing for it to hold", () => {
    render(<HeaderTwoTier {...headerProps("en", { utilities: { marketSwitcher: false } })} />);
    expect(slot("header-bar")).toBeNull();
  });
});

describe("HeaderTwoTier: the main row", () => {
  it("has the menu button, the logo, the navigation, the search and the cart in reading order", () => {
    render(<HeaderTwoTier {...headerProps()} />);
    const order = [
      slot("header-bar"),
      menuButton(),
      logos()[0],
      navigationLandmark(),
      slot("header-search"),
      carts()[0],
    ];
    for (let index = 1; index < order.length; index++) {
      expect(before(order[index - 1] as Element, order[index] as Element), `part ${index}`).toBe(
        true,
      );
    }
  });

  it("has the search and the cart at the end and nothing between them", () => {
    render(<HeaderTwoTier {...headerProps()} />);
    expect(screen.getAllByRole("link", { name: "Search" })).toHaveLength(1);
    expect(slot("header-search")?.nextElementSibling).toBe(carts()[0]);
  });
});
