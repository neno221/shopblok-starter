// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). HeaderMinimal's tests, in Testing
// Library and happy-dom: the checks all six headers share (`describeHeader`) and what the minimal
// header alone does. It has no navigation in the header at any width, so its menu button is
// there at every width and the drawer holds the navigation, the account links and the switcher.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  before,
  carts,
  describeHeader,
  header,
  headerProps,
  logos,
  menuButton,
  slot,
} from "../../test-support/header-suite";
import { HeaderMinimal } from "./minimal";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeHeader({
  name: "HeaderMinimal",
  variant: "minimal",
  Header: HeaderMinimal,
  navigation: false,
  utilities: "search",
  switcher: "drawer",
});

describe("HeaderMinimal: its row", () => {
  it("has the menu button, the logo, the search link and the cart, in that order, and nothing more", () => {
    render(<HeaderMinimal {...headerProps()} />);
    const controls = [...header().querySelectorAll("a[href], button")];
    expect(controls).toEqual([menuButton(), logos()[0], slot("header-search"), carts()[0]]);
    expect(before(menuButton() as Element, logos()[0] as Element)).toBe(true);
  });

  it("has the menu button at every width, since the drawer is the navigation", () => {
    render(<HeaderMinimal {...headerProps()} />);
    expect(menuButton()?.className).not.toMatch(/(?:^|\s)(?:lg:|md:|sm:)?hidden(?:\s|$)/);
    expect(menuButton()?.className).not.toContain("lg:hidden");
  });

  it("has a menu button even for a shop with one link in its navigation and no utilities", () => {
    render(
      <HeaderMinimal
        {...headerProps("en", {
          navigation: headerProps().navigation.slice(0, 1),
          utilities: { marketSwitcher: false },
          market: undefined,
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
  });

  it("draws one logo, centered at every width", () => {
    render(<HeaderMinimal {...headerProps()} />);
    expect(logos()).toHaveLength(1);
    expect(logos()[0]?.className).toContain("justify-self-center");
    expect(logos()[0]?.className).not.toContain("lg:col-start-1");
  });
});
