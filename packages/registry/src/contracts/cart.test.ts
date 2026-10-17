import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CartLine, FreeShipping, PromoCodeEntry } from "./index";

// The cart molecules' contracts (T34): CartLine's own cases (its stock states and optional parts),
// FreeShipping for FreeShippingProgress and PromoCodeEntry for PromoCodeField. `contracts.test.ts`
// holds the Cart's sums; this file holds what the three components show and what each schema
// refuses so that they never draw it wrong.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const eur = (amount: number) => ({ amount, currencyCode: "EUR" });

const line = {
  id: "line_1",
  productId: "prod_1",
  variantId: "var_1",
  title: "Heritage Hoodie",
  href: "/us/products/heritage-hoodie",
  image: { src: "/media/hoodie.jpg", alt: "A hoodie", width: 600, height: 800 },
  options: [
    { option: "Colour", value: "Oat" },
    { option: "Size", value: "M" },
  ],
  quantity: 2,
  maxQuantity: 5,
  unitPrice: eur(59),
  compareAtUnitPrice: eur(69),
  total: eur(118),
  stock: { status: "in-stock" },
};

describe("CartLine (CartLineItem)", () => {
  it("takes a line with every part, and one with only what it must have", () => {
    expect(issues(CartLine, line)).toEqual([]);
    const { image: _image, maxQuantity: _max, compareAtUnitPrice: _was, ...bare } = line;
    expect(issues(CartLine, { ...bare, options: [] })).toEqual([]);
  });

  it("takes each stock state, a low one with its count", () => {
    expect(issues(CartLine, { ...line, stock: { status: "low", quantity: 3 } })).toEqual([]);
    expect(issues(CartLine, { ...line, stock: { status: "low" } })).toEqual([]);
    expect(issues(CartLine, { ...line, stock: { status: "out" } })).toEqual([]);
    expect(issues(CartLine, { ...line, stock: { status: "plenty" } })).not.toEqual([]);
  });

  it("wants a whole, positive quantity and a positive limit", () => {
    for (const quantity of [0, -1, 1.5])
      expect(issues(CartLine, { ...line, quantity })).not.toEqual([]);
    for (const maxQuantity of [0, -2, 2.5])
      expect(issues(CartLine, { ...line, maxQuantity })).not.toEqual([]);
  });

  it("wants a link to a path or an http(s) URL, and an option with both its parts", () => {
    expect(issues(CartLine, { ...line, href: "//evil.example" })).not.toEqual([]);
    expect(issues(CartLine, { ...line, href: "javascript:alert(1)" })).not.toEqual([]);
    expect(issues(CartLine, { ...line, options: [{ option: "Colour", value: "" }] })).not.toEqual(
      [],
    );
  });
});

describe("FreeShipping (FreeShippingProgress)", () => {
  it("takes a cart part of the way, one with nothing in it and one that has reached it", () => {
    expect(issues(FreeShipping, { threshold: eur(150), remaining: eur(37.5) })).toEqual([]);
    expect(issues(FreeShipping, { threshold: eur(150), remaining: eur(150) })).toEqual([]);
    expect(issues(FreeShipping, { threshold: eur(150), remaining: eur(0) })).toEqual([]);
  });

  it("refuses what is left above the threshold, or below nothing", () => {
    const message = "remaining is below 0 or above the threshold";
    expect(issues(FreeShipping, { threshold: eur(150), remaining: eur(150.01) })).toEqual([
      message,
    ]);
    expect(issues(FreeShipping, { threshold: eur(150), remaining: eur(-1) })).toEqual([message]);
  });

  it("refuses a threshold of nothing: the bar's share would divide by it", () => {
    expect(issues(FreeShipping, { threshold: eur(0), remaining: eur(0) })).toEqual([
      "the threshold is not above 0",
    ]);
    expect(issues(FreeShipping, { threshold: eur(-5), remaining: eur(0) })).toContain(
      "the threshold is not above 0",
    );
  });

  it("refuses an amount left in another currency than the threshold", () => {
    expect(
      issues(FreeShipping, {
        threshold: eur(150),
        remaining: { amount: 10, currencyCode: "USD" },
      }),
    ).toEqual(["USD in a EUR total"]);
  });

  it("wants both parts", () => {
    expect(issues(FreeShipping, { threshold: eur(150) })).not.toEqual([]);
    expect(issues(FreeShipping, { remaining: eur(10) })).not.toEqual([]);
  });
});

describe("PromoCodeEntry (PromoCodeField)", () => {
  const applied = [{ code: "WELCOME10", discount: eur(11.4) }];

  it("takes nothing applied and nothing typed, a code applied, and a code typed", () => {
    expect(issues(PromoCodeEntry, { applied: [], code: "" })).toEqual([]);
    expect(issues(PromoCodeEntry, { applied, code: "" })).toEqual([]);
    expect(issues(PromoCodeEntry, { applied: [], code: "SUMMER25" })).toEqual([]);
  });

  it("takes a code with no amount (free shipping takes nothing off the goods)", () => {
    expect(
      issues(PromoCodeEntry, { applied: [...applied, { code: "FREESHIP" }], code: "" }),
    ).toEqual([]);
  });

  it("keeps what was typed, whatever it is: it is the field's value, not a code", () => {
    expect(issues(PromoCodeEntry, { applied: [], code: "  not a code  " })).toEqual([]);
    expect(issues(PromoCodeEntry, { applied: [] })).not.toEqual([]);
  });

  it("refuses a code applied twice, in either case: the chips are keyed by it", () => {
    const message = "a code is applied twice";
    expect(
      issues(PromoCodeEntry, { applied: [...applied, { code: "WELCOME10" }], code: "" }),
    ).toEqual([message]);
    expect(
      issues(PromoCodeEntry, { applied: [...applied, { code: "welcome10" }], code: "" }),
    ).toEqual([message]);
  });

  it("refuses discounts in more than one currency, as a cart's totals are in one", () => {
    expect(
      issues(PromoCodeEntry, {
        applied: [...applied, { code: "OTHER", discount: { amount: 5, currencyCode: "USD" } }],
        code: "",
      }),
    ).toEqual(["the discounts are in more than one currency"]);
  });

  it("refuses an empty code in the list", () => {
    expect(issues(PromoCodeEntry, { applied: [{ code: "" }], code: "" })).not.toEqual([]);
  });
});

describe("the three schemas as the Props table draws them", () => {
  it.each([
    ["CartLine", CartLine],
    ["FreeShipping", FreeShipping],
    ["PromoCodeEntry", PromoCodeEntry],
  ])("%s has a JSON Schema", (_name, schema) => {
    const json = z.toJSONSchema(schema);
    expect(json.type).toBe("object");
    expect(Object.keys(json.properties ?? {}).length).toBeGreaterThan(0);
  });
});
