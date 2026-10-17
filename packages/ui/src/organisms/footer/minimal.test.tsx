// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). FooterMinimal's tests, in
// Testing Library and happy-dom: the checks all five footers share (`describeFooter`) and what the
// minimal footer alone does. It is one row that wraps: the copyright line at the start, the legal
// links, the social links and the market switcher at the end. It leaves out the columns, the
// newsletter, the payment marks and the logo, which the tests below say in so many words.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { before, describeFooter, footer, footerProps, slot } from "../../test-support/footer-suite";
import { FooterMinimal } from "./minimal";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeFooter({
  name: "FooterMinimal",
  variant: "minimal",
  Footer: FooterMinimal,
  columns: false,
  newsletter: false,
  payments: false,
  logo: false,
  socialHeading: "hidden",
});

describe("FooterMinimal: the one row", () => {
  it("is a single wrapping row: the copyright at its start, then the legal links, the profiles, the switcher", () => {
    render(<FooterMinimal {...footerProps()} />);
    const row = footer().firstElementChild as HTMLElement;
    expect(row.className).toContain("flex-wrap");
    expect(row.className).toContain("justify-between");
    expect(row.firstElementChild).toBe(slot("footer-copyright"));
    const order = ["footer-copyright", "footer-legal", "footer-social", "market-switcher"].map(
      (name) => slot(name) as Element,
    );
    for (const element of order) expect(row.contains(element)).toBe(true);
    for (let index = 1; index < order.length; index += 1) {
      expect(before(order[index - 1] as Element, order[index] as Element)).toBe(true);
    }
  });

  it("is only that row: one box in the footer, with no bottom row, band or rule of its own", () => {
    render(<FooterMinimal {...footerProps()} />);
    expect(footer().children).toHaveLength(1);
    expect(slot("footer-bottom")).toBeNull();
    expect(slot("footer-band")).toBeNull();
    expect(slot("footer-main")).toBeNull();
  });

  it("keeps the end of the row together and wrapping, so that a narrow screen stacks it", () => {
    render(<FooterMinimal {...footerProps()} />);
    const end = (slot("footer-legal") as HTMLElement).parentElement as HTMLElement;
    expect(end.className).toContain("flex-wrap");
    expect(end.className).toContain("min-w-0");
    expect(end.contains(slot("footer-social"))).toBe(true);
    expect(end.contains(slot("market-switcher"))).toBe(true);
  });

  it("leaves out what the shop has and a single row has no room for, and says so by its absence", () => {
    render(<FooterMinimal {...footerProps()} />);
    expect(footer().querySelectorAll("form")).toHaveLength(0);
    expect(footer().querySelectorAll("h3, h4")).toHaveLength(0);
    expect(footer().querySelectorAll("img")).toHaveLength(0);
    expect(screen.queryByRole("heading", { name: "Join our newsletter" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Ways to pay" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Shop" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Shopblok, home" })).toBeNull();
  });

  it("keeps the profiles' heading for a screen reader only, and names every icon", () => {
    render(<FooterMinimal {...footerProps()} />);
    const heading = screen.getByRole("heading", { name: "Follow us" });
    expect(heading.className).toContain("sr-only");
    for (const link of document.querySelectorAll('[data-slot="footer-social-link"]')) {
      expect(link.getAttribute("aria-label")).toMatch(/^Shopblok on /);
    }
  });

  it("is a footer even for a shop with nothing but the two legal links and the copyright", () => {
    render(
      <FooterMinimal
        {...footerProps("en", {
          social: [],
          marketSwitcher: false,
          market: undefined,
          legalLinks: [{ label: "Terms", href: "/us/pages/terms" }],
        })}
      />,
    );
    expect(screen.getByRole("contentinfo")).toBe(footer());
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(slot("footer-copyright")).not.toBeNull();
  });
});
