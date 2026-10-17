// Ours (T35, SETUP.md "Navigation and headers (T35)"; SPEC §9.4). HeaderCentered's tests, in Testing
// Library and happy-dom: the checks all six headers share (`describeHeader`) and what the centered
// header alone does. From lg the logo sits in the middle of the navigation, which is split around
// it, and the utilities and the cart are in a row above. The logo is in the markup twice, once for
// each layout, and `lg:hidden` and `hidden` make a reader meet it once.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  before,
  carts,
  describeHeader,
  fixturesOf,
  hiddenBelowLg,
  header,
  headerProps,
  logos,
  navigationLandmark,
  slot,
} from "../../test-support/header-suite";
import { HeaderCentered } from "./centered";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeHeader({
  name: "HeaderCentered",
  variant: "centered",
  Header: HeaderCentered,
  navigation: true,
  utilities: "all",
  switcher: "row",
});

describe("HeaderCentered: the logo", () => {
  it("is drawn twice with a navigation: below lg in the row, from lg inside the navigation", () => {
    render(<HeaderCentered {...headerProps()} />);
    expect(logos()).toHaveLength(2);
    const [mobile, wide] = logos() as [HTMLElement, HTMLElement];
    expect(mobile.className).toContain("lg:hidden");
    expect(navigationLandmark()?.contains(mobile)).toBe(false);
    expect(navigationLandmark()?.contains(wide)).toBe(true);
    expect(hiddenBelowLg(wide)).toBe(true);
    expect(hiddenBelowLg(mobile)).toBe(false);
    expect(wide.getAttribute("aria-label")).toBe(mobile.getAttribute("aria-label"));
    expect(wide.getAttribute("href")).toBe(mobile.getAttribute("href"));
  });

  it("is drawn once, centered at every width, when the shop has no navigation", () => {
    render(<HeaderCentered {...headerProps("en", { navigation: [] })} />);
    expect(logos()).toHaveLength(1);
    expect(logos()[0]?.className).not.toContain("lg:hidden");
    expect(hiddenBelowLg(logos()[0] as HTMLElement)).toBe(false);
  });
});

describe("HeaderCentered: its two rows from lg", () => {
  it("splits the navigation around the logo, the first half on its start side", () => {
    render(<HeaderCentered {...headerProps()} />);
    const nav = navigationLandmark() as HTMLElement;
    const centerLogo = nav.querySelector('[data-slot="header-logo"]') as HTMLElement;
    const labels = fixturesOf("en").navigation.map((item) => item.label);
    const half = Math.ceil(labels.length / 2);
    labels.forEach((label, index) => {
      const item = within(nav).getAllByText(label)[0] as HTMLElement;
      expect(before(item, centerLogo), label).toBe(index < half);
    });
  });

  it("puts the utilities and the cart in a row above the navigation, in the markup and on the page", () => {
    render(<HeaderCentered {...headerProps()} />);
    const nav = navigationLandmark() as HTMLElement;
    for (const part of [slot("header-search"), slot("header-account"), carts()[0]]) {
      expect(before(part as Element, nav)).toBe(true);
    }
    const row = header().firstElementChild as HTMLElement;
    expect(row.className).toContain("lg:flex-col");
  });

  it("gives the navigation the whole row", () => {
    render(<HeaderCentered {...headerProps()} />);
    expect(navigationLandmark()?.className).toContain("lg:w-full");
    expect(navigationLandmark()?.className).toContain("lg:flex");
  });

  it("has one cart and one search link, whichever layout shows", () => {
    render(<HeaderCentered {...headerProps()} />);
    expect(carts()).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Search" })).toHaveLength(1);
  });
});
