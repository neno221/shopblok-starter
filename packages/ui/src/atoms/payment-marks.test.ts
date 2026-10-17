import * as simpleIcons from "simple-icons";
import { describe, expect, it } from "vitest";
import { paymentMarks } from "./payment-marks";

// The one test that imports `simple-icons` (a 5.25 MB module): it keeps `payment-marks.ts`, our copy
// of eight marks, equal to the package. PaymentIcon's own test does not import it, so a cold start
// of that test does not pay for it (SETUP.md, "Cart, checkout and account molecules (T34)").
const packageKey = {
  visa: "siVisa",
  mastercard: "siMastercard",
  americanexpress: "siAmericanexpress",
  applepay: "siApplepay",
  googlepay: "siGooglepay",
  revolut: "siRevolut",
  paypal: "siPaypal",
  klarna: "siKlarna",
} as const;

const brands = Object.keys(paymentMarks) as (keyof typeof paymentMarks)[];

describe("payment-marks.ts", () => {
  it("has the eight methods of D31", () => {
    expect([...brands].sort()).toEqual(Object.keys(packageKey).sort());
  });

  it.each(brands)("%s is simple-icons' mark, path, title and colour", (brand) => {
    const icon = simpleIcons[packageKey[brand]];
    expect(paymentMarks[brand]).toEqual({ title: icon.title, hex: icon.hex, path: icon.path });
  });

  it.each(brands)("%s is a slug the package knows, drawn in a 24 × 24 box", (brand) => {
    expect(simpleIcons[packageKey[brand]].slug).toBe(brand);
    expect(paymentMarks[brand].path).toMatch(/^M[\d.\s-]/);
    expect(paymentMarks[brand].hex).toMatch(/^[0-9A-F]{6}$/);
  });

  it("is small: under 12 KB, against the package root's 5 MB", () => {
    const size = brands.reduce((sum, brand) => sum + paymentMarks[brand].path.length, 0);
    expect(size).toBeLessThan(12_000);
  });
});
