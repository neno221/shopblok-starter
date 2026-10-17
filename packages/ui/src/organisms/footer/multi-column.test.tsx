// Ours (T36, SETUP.md "Footers and site organisms (T36)"; SPEC §9.4). FooterMultiColumn's tests, in
// Testing Library and happy-dom: the checks all five footers share (`describeFooter`) and what the
// multi-column footer alone does. It stacks the logo, then a row of the columns and the newsletter
// (the newsletter as the last column from lg), then the bottom row under a rule.
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { before, describeFooter, footer, footerProps, slot } from "../../test-support/footer-suite";
import { FooterMultiColumn } from "./multi-column";

vi.mock("next/link", async () =>
  (await import("../../test-support/next-link-stand-in")).nextLinkStandIn(),
);

describeFooter({
  name: "FooterMultiColumn",
  variant: "multi-column",
  Footer: FooterMultiColumn,
  columns: true,
  newsletter: true,
  payments: true,
  logo: true,
  socialHeading: "visible",
});

describe("FooterMultiColumn: where the pieces sit", () => {
  it("puts the logo first, then the columns and the newsletter, then the bottom row", () => {
    render(<FooterMultiColumn {...footerProps()} />);
    const bottom = slot("footer-bottom") as HTMLElement;
    expect(before(slot("footer-logo") as Element, slot("footer-columns") as Element)).toBe(true);
    expect(before(slot("footer-columns") as Element, slot("footer-newsletter") as Element)).toBe(
      true,
    );
    expect(before(slot("footer-newsletter") as Element, bottom)).toBe(true);
    expect(bottom.className).toContain("border-t");
    for (const name of [
      "footer-social",
      "market-switcher",
      "footer-legal",
      "footer-payments",
      "footer-copyright",
    ]) {
      expect(bottom.contains(slot(name)), name).toBe(true);
    }
  });

  it("puts the newsletter beside the columns from lg, as the last column of the row", () => {
    render(<FooterMultiColumn {...footerProps()} />);
    const row = (slot("footer-columns") as HTMLElement).parentElement as HTMLElement;
    expect(row.contains(slot("footer-newsletter"))).toBe(true);
    expect(row.className).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]");
    expect(row.className).toContain("grid");
  });

  it("gives the newsletter a column of its own, at a measure, when the shop has no columns", () => {
    render(<FooterMultiColumn {...footerProps("en", { columns: [] })} />);
    const box = slot("footer-newsletter") as HTMLElement;
    expect(box.className).toContain("max-w-xl");
    expect((box.parentElement as HTMLElement).className).not.toContain("lg:grid-cols");
  });

  it("lets the columns take the whole row when the shop has no newsletter", () => {
    render(<FooterMultiColumn {...footerProps("en", { newsletter: undefined })} />);
    const row = (slot("footer-columns") as HTMLElement).parentElement as HTMLElement;
    expect(row.className).not.toContain("lg:grid-cols");
    expect(slot("footer-newsletter")).toBeNull();
  });

  it("goes from the logo to the bottom row when the shop has neither columns nor newsletter", () => {
    render(<FooterMultiColumn {...footerProps("en", { columns: [], newsletter: undefined })} />);
    const kids = [...(footer().firstElementChild as HTMLElement).children];
    expect(kids.map((kid) => kid.getAttribute("data-slot"))).toEqual([
      "footer-logo",
      "footer-bottom",
    ]);
  });

  it("keeps its width to the page's: a container with the gutters of the headers", () => {
    render(<FooterMultiColumn {...footerProps()} />);
    const inner = footer().firstElementChild as HTMLElement;
    expect(inner.className).toContain("max-w-page");
    expect(inner.className).toContain("px-4");
    expect(inner.className).toContain("lg:px-8");
  });
});
