import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { longLabels } from "../test-support/long-labels";
import { PaymentIcon, paymentBrands } from "./payment-icon";

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

  it("imports the eight icons by name, never the whole set", () => {
    const source = readFileSync(path.join(import.meta.dirname, "payment-icon.tsx"), "utf8");
    expect(source).not.toMatch(/import\s+\*\s+as\s+\w+\s+from\s+["']simple-icons/);
    expect(source).not.toMatch(/from\s+["']simple-icons\/icons["']/);
    const imported = /import\s*\{([^}]+)\}\s*from\s*["']simple-icons["']/.exec(source)?.[1] ?? "";
    expect(imported.split(",").filter((name) => name.trim() !== "")).toHaveLength(8);
  });

  it.each(longLabels)("takes a long %s label", (_locale, strings) => {
    render(<PaymentIcon brand="visa" label={strings.hint} />);
    expect(screen.getByRole("img", { name: strings.hint })).toBeTruthy();
  });
});
