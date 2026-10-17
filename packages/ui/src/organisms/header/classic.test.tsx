// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). HeaderClassic's tests, in Testing
// Library and happy-dom: the checks all six headers share (`describeHeader`) and what the classic
// header alone does. Its row is one grid, so the order of the pieces in the markup is the order a
// Tab visits them and the order the eye reads them at lg: the menu button, the logo, the
// navigation, then the utilities and the cart.
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  before,
  describeHeader,
  header,
  headerProps,
  menuButton,
  navigationLandmark,
  slot,
  carts,
  logos,
} from "../../test-support/header-suite";
import { HeaderClassic } from "./classic";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeHeader({
  name: "HeaderClassic",
  variant: "classic",
  Header: HeaderClassic,
  navigation: true,
  utilities: "all",
  switcher: "row",
});

describe("HeaderClassic: its row", () => {
  it("has the menu button, the logo, the navigation, the utilities and the cart in reading order", () => {
    render(<HeaderClassic {...headerProps()} />);
    const order = [
      menuButton(),
      logos()[0],
      navigationLandmark(),
      slot("header-search"),
      slot("header-account"),
      slot("header-wishlist"),
      slot("market-switcher"),
      carts()[0],
    ];
    for (const part of order) expect(part).not.toBeNull();
    for (let index = 1; index < order.length; index++) {
      expect(before(order[index - 1] as Element, order[index] as Element), `part ${index}`).toBe(
        true,
      );
    }
  });

  it("has one logo, centered below lg between the menu button and the end, and at the start from lg", () => {
    render(<HeaderClassic {...headerProps()} />);
    expect(logos()).toHaveLength(1);
    const logo = logos()[0] as HTMLElement;
    expect(logo.className).toContain("col-start-2");
    expect(logo.className).toContain("justify-self-center");
    expect(logo.className).toContain("lg:col-start-1");
    expect(logo.className).toContain("lg:justify-self-start");
    // A long store name takes at most a part of the row from lg, so the navigation keeps the rest.
    expect(logo.className).toContain("lg:max-w-64");
  });

  it("puts the row's grid under the header, so a menu, a logo and the cart share one baseline", () => {
    render(<HeaderClassic {...headerProps()} />);
    const row = header().firstElementChild as HTMLElement;
    expect(row.className).toContain("grid");
    expect(row.className).toContain("max-w-page");
    expect(row.className).toContain("lg:grid-cols-[auto_minmax(0,1fr)_auto]");
  });

  it("has a rule under it and the page's ground, and no scrim", () => {
    render(<HeaderClassic {...headerProps()} />);
    expect(header().className).toContain("border-b");
    expect(header().className).toContain("bg-background");
    expect(slot("header-scrim")).toBeNull();
  });
});
