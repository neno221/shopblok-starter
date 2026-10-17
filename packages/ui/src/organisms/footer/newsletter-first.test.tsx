// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). FooterNewsletterFirst's tests,
// in Testing Library and happy-dom: the checks all five footers share (`describeFooter`) and what the
// newsletter-first footer alone does. Its signup is a band across the full width at the top, on the
// page's ground; the logo and the columns follow, then the bottom row.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { before, describeFooter, footer, footerProps, slot } from "../../test-support/footer-suite";
import { FooterNewsletterFirst } from "./newsletter-first";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeFooter({
  name: "FooterNewsletterFirst",
  variant: "newsletter-first",
  Footer: FooterNewsletterFirst,
  columns: true,
  newsletter: true,
  payments: true,
  logo: true,
  socialHeading: "visible",
});

describe("FooterNewsletterFirst: the band", () => {
  it("is the footer's first box, across its full width, on the page's own ground", () => {
    render(<FooterNewsletterFirst {...footerProps()} />);
    const band = slot("footer-band") as HTMLElement;
    expect(footer().firstElementChild).toBe(band);
    expect(band.className).toContain("bg-background");
    expect(band.className).toContain("border-b");
    expect(band.parentElement).toBe(footer());
    // The footer's own container holds the columns, so the band's edges are the footer's.
    expect(band.className).not.toContain("max-w");
  });

  it("holds the newsletter, centered in a measure wide enough for a field and a button on a row", () => {
    render(<FooterNewsletterFirst {...footerProps()} />);
    const box = slot("footer-newsletter") as HTMLElement;
    expect((slot("footer-band") as HTMLElement).contains(box)).toBe(true);
    expect(box.className).toContain("mx-auto");
    expect(box.className).toContain("max-w-2xl");
    expect(box.className).toContain("min-w-0");
  });

  it("has the newsletter's heading before the logo, the columns and the bottom row", () => {
    render(<FooterNewsletterFirst {...footerProps()} />);
    const heading = screen.getByRole("heading", { name: "Join our newsletter", level: 2 });
    expect(before(heading, slot("footer-logo") as Element)).toBe(true);
    expect(before(heading, slot("footer-columns") as Element)).toBe(true);
    expect(before(slot("footer-columns") as Element, slot("footer-bottom") as Element)).toBe(true);
  });

  it("leaves the band out when the shop has no newsletter, and nothing else moves", () => {
    render(<FooterNewsletterFirst {...footerProps("en", { newsletter: undefined })} />);
    expect(slot("footer-band")).toBeNull();
    expect(slot("newsletter-form")).toBeNull();
    expect(footer().firstElementChild?.getAttribute("data-slot")).not.toBe("footer-band");
    expect(slot("footer-columns")).not.toBeNull();
    expect(slot("footer-bottom")).not.toBeNull();
  });
});

describe("FooterNewsletterFirst: the logo and the columns", () => {
  it("puts the logo beside the columns from lg, in a grid whose tracks may shrink", () => {
    render(<FooterNewsletterFirst {...footerProps()} />);
    const row = (slot("footer-logo") as HTMLElement).parentElement as HTMLElement;
    expect(row.contains(slot("footer-columns"))).toBe(true);
    expect(row.className).toContain("lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]");
  });

  it("gives the logo the whole row when the shop has no columns", () => {
    render(<FooterNewsletterFirst {...footerProps("en", { columns: [] })} />);
    const row = (slot("footer-logo") as HTMLElement).parentElement as HTMLElement;
    expect(row.className).not.toContain("lg:grid-cols");
    expect(slot("footer-columns")).toBeNull();
  });

  it("has the bottom row last, under a rule, with the copyright in it", () => {
    render(<FooterNewsletterFirst {...footerProps()} />);
    const bottom = slot("footer-bottom") as HTMLElement;
    expect(bottom.className).toContain("border-t");
    expect(bottom.contains(slot("footer-copyright"))).toBe(true);
    expect(bottom.contains(slot("footer-social"))).toBe(true);
    expect(bottom.contains(slot("market-switcher"))).toBe(true);
    expect(bottom.contains(slot("footer-payments"))).toBe(true);
    expect(bottom.contains(slot("footer-legal"))).toBe(true);
  });
});
