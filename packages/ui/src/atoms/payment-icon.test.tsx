import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { PaymentIcon, paymentBrands } from "./payment-icon";
import { paymentMarks } from "./payment-marks";

describe("PaymentIcon", () => {
  it("has the eight methods of D31", () => {
    expect([...paymentBrands].sort()).toEqual([
      "americanexpress",
      "applepay",
      "googlepay",
      "klarna",
      "mastercard",
      "paypal",
      "revolut",
      "visa",
    ]);
  });

  it.each(paymentBrands)("%s is an image named by its label, in one colour", (brand) => {
    const { container } = render(<PaymentIcon brand={brand} label={`Pay with ${brand}`} />);
    const image = screen.getByRole("img", { name: `Pay with ${brand}` });
    expect(image.tagName.toLowerCase()).toBe("svg");
    expect(image.getAttribute("class")).toContain("fill-current");
    const path = container.querySelector("path");
    expect(path?.getAttribute("d")?.length).toBeGreaterThan(50);
    // One path, no colour of its own: the mark follows the text's colour.
    expect(container.querySelectorAll("path")).toHaveLength(1);
    expect(path?.getAttribute("fill")).toBeNull();
  });

  it("draws each method differently", () => {
    const paths = paymentBrands.map((brand) => {
      const { container, unmount } = render(<PaymentIcon brand={brand} label={brand} />);
      const d = container.querySelector("path")?.getAttribute("d");
      unmount();
      return d;
    });
    expect(new Set(paths).size).toBe(paymentBrands.length);
  });

  it("requires the label and takes only the eight brands", () => {
    // @ts-expect-error -- `label` is required (D30).
    render(<PaymentIcon brand="visa" />);
    // @ts-expect-error -- only D31's methods.
    const other = <PaymentIcon brand="diners" label="Diners" />;
    expect(other).toBeTruthy();
  });

  it("imports nothing from simple-icons: the marks are our copy of eight paths", () => {
    // The package's root is a 5.25 MB module that Vitest and `next dev` parse on every cold start
    // (PR 43 review, item 14; SETUP.md, "Cart, checkout and account molecules (T34)").
    // `payment-marks.test.ts` is the one test that reads the package, to keep the copy honest.
    const source = readFileSync(path.join(import.meta.dirname, "payment-icon.tsx"), "utf8");
    expect(source).not.toMatch(/from\s+["']simple-icons/);
    expect(source).not.toMatch(/import\s*\(\s*["']simple-icons/);
    expect(source).toMatch(/from\s+["']\.\/payment-marks["']/);
  });

  it("draws the path of its own brand from the marks", () => {
    for (const brand of paymentBrands) {
      const { container, unmount } = render(<PaymentIcon brand={brand} label={brand} />);
      expect(container.querySelector("path")?.getAttribute("d")).toBe(paymentMarks[brand].path);
      unmount();
    }
  });

  it.each(longLabels)("takes a long %s label", (_locale, strings) => {
    render(<PaymentIcon brand="visa" label={strings.hint} />);
    expect(screen.getByRole("img", { name: strings.hint })).toBeTruthy();
  });
});
