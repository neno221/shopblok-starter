// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). FooterTwoTier's tests, in
// Testing Library and happy-dom: the checks all five footers share (`describeFooter`) and what the
// two-tier footer alone does. Its main tier holds the logo, the social links, the columns and the
// newsletter; its bar, under a rule, holds the legal links, the payment marks, the market switcher
// and the copyright. The bar's switcher is on the screen at every width: the design system's
// interaction check opens the one visible trigger at 375 and at 1440 px.
import { render, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  before,
  describeFooter,
  footer,
  footerProps,
  hiddenAtBase,
  hiddenFromMd,
  slot,
  slots,
} from "../../test-support/footer-suite";
import { FooterTwoTier } from "./two-tier";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeFooter({
  name: "FooterTwoTier",
  variant: "two-tier",
  Footer: FooterTwoTier,
  columns: true,
  newsletter: true,
  payments: true,
  logo: true,
  socialHeading: "visible",
});

describe("FooterTwoTier: the two tiers", () => {
  it("has the main tier first and the bar last, under a rule", () => {
    render(<FooterTwoTier {...footerProps()} />);
    const [main, bar] = [...footer().children];
    expect(main).toBe(slot("footer-main"));
    expect(bar).toBe(slot("footer-bar"));
    expect(footer().children).toHaveLength(2);
    expect((bar as HTMLElement).className).toContain("border-t");
  });

  it("holds the logo, the profiles, the columns and the newsletter in the main tier", () => {
    render(<FooterTwoTier {...footerProps()} />);
    const main = slot("footer-main") as HTMLElement;
    for (const name of ["footer-logo", "footer-social", "footer-columns", "footer-newsletter"]) {
      expect(main.contains(slot(name)), name).toBe(true);
    }
    for (const name of ["footer-legal", "footer-payments", "market-switcher", "footer-copyright"]) {
      expect(main.contains(slot(name)), name).toBe(false);
    }
    expect(before(slot("footer-logo") as Element, slot("footer-columns") as Element)).toBe(true);
    expect(before(slot("footer-columns") as Element, slot("footer-newsletter") as Element)).toBe(
      true,
    );
  });

  it("holds the legal links, the payment marks, the switcher and the copyright in the bar, in order", () => {
    render(<FooterTwoTier {...footerProps()} />);
    const bar = slot("footer-bar") as HTMLElement;
    const order = ["footer-legal", "footer-payments", "market-switcher", "footer-copyright"].map(
      (name) => slot(name) as Element,
    );
    for (const element of order) expect(bar.contains(element)).toBe(true);
    for (let index = 1; index < order.length; index += 1) {
      expect(before(order[index - 1] as Element, order[index] as Element)).toBe(true);
    }
    expect(bar.contains(slot("footer-social"))).toBe(false);
  });

  it("gives the copyright a line of its own at the bar's end", () => {
    render(<FooterTwoTier {...footerProps()} />);
    expect((slot("footer-copyright") as HTMLElement).className).toContain("basis-full");
  });

  it("draws the bar for a shop with only the copyright, and the main tier with its logo", () => {
    render(
      <FooterTwoTier
        {...footerProps("en", {
          columns: [],
          newsletter: undefined,
          social: [],
          legalLinks: [],
          paymentIcons: [],
          marketSwitcher: false,
        })}
      />,
    );
    expect(slot("footer-bar")).not.toBeNull();
    expect(slot("footer-copyright")).not.toBeNull();
    expect(slot("footer-logo")).not.toBeNull();
    expect(slot("footer-legal")).toBeNull();
  });
});

describe("FooterTwoTier: the switcher in the bar", () => {
  it("is visible at every width: no box around it is hidden, at the base width or from md", () => {
    render(<FooterTwoTier {...footerProps()} />);
    const box = slot("market-switcher") as HTMLElement;
    expect((slot("footer-bar") as HTMLElement).contains(box)).toBe(true);
    expect(hiddenAtBase(box)).toBe(false);
    expect(hiddenFromMd(box)).toBe(false);
  });

  it("shows exactly one trigger at each width: the popover's from md, the sheet's below", () => {
    render(<FooterTwoTier {...footerProps()} />);
    const triggers = slots("market-switcher-trigger");
    expect(triggers).toHaveLength(2);
    const [popover, sheet] = triggers as [HTMLElement, HTMLElement];
    // Below md the sheet's trigger shows (the popover's has `max-md:hidden`) and from md the other.
    expect(popover.classList.contains("max-md:hidden")).toBe(true);
    expect(sheet.classList.contains("md:hidden")).toBe(true);
    expect(popover.classList.contains("md:hidden")).toBe(false);
    expect(sheet.classList.contains("max-md:hidden")).toBe(false);
    for (const trigger of triggers) {
      expect(hiddenAtBase(trigger)).toBe(false);
      expect(hiddenFromMd(trigger)).toBe(trigger === sheet);
    }
  });

  it("opens its popup, from either form, with the keyboard", async () => {
    render(<FooterTwoTier {...footerProps()} />);
    const user = userEvent.setup();
    const [popover] = slots("market-switcher-trigger") as [HTMLElement, HTMLElement];
    popover.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(slot("market-switcher-popup")).not.toBeNull());
    expect(popover.getAttribute("aria-expanded")).toBe("true");
    expect(
      within(slot("market-switcher-popup") as HTMLElement).getAllByRole("link").length,
    ).toBeGreaterThan(5);
  });
});
