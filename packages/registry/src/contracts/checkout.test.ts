import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ShippingEstimate, StepperState, SummaryLine, VerificationRequest } from "./checkout";

// The checkout molecules' own contracts (T34): OrderSummaryRow's line, Stepper's steps,
// ShippingEstimator's form and VerificationNotice's request. Each rule a schema adds beyond its
// fields is shown to reject what it is there for, and each schema is drawn with `z.toJSONSchema`,
// as the DS page's Props table does.

type Schema = { safeParse(value: unknown): { error?: { issues: { message: string }[] } } };

/** The messages of what a schema refuses; empty for a value it accepts. */
const issues = (schema: Schema, value: unknown) =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

const eur = (amount: number) => ({ amount, currencyCode: "EUR" });

describe("SummaryLine", () => {
  it("takes each kind of line with an amount, and a detail where one helps", () => {
    for (const kind of ["subtotal", "discount", "shipping", "tax", "total"])
      expect(issues(SummaryLine, { kind, amount: eur(12.5) }), kind).toEqual([]);
    expect(
      issues(SummaryLine, { kind: "discount", amount: eur(11.4), detail: "WELCOME10" }),
    ).toEqual([]);
  });

  it("takes a line with no amount yet: shipping before an option is chosen", () => {
    expect(issues(SummaryLine, { kind: "shipping" })).toEqual([]);
  });

  it("takes an amount of 0: free shipping, a total of nothing", () => {
    expect(issues(SummaryLine, { kind: "shipping", amount: eur(0) })).toEqual([]);
  });

  it("refuses a negative amount: a discount is the amount taken off, drawn with a minus", () => {
    expect(issues(SummaryLine, { kind: "discount", amount: eur(-5) })).toEqual([
      "an amount is not negative: a discount is the amount taken off",
    ]);
    expect(issues(SummaryLine, { kind: "total", amount: eur(-0.01) })).toHaveLength(1);
  });

  it("refuses a kind it has no label for, and an empty detail", () => {
    expect(issues(SummaryLine, { kind: "gift-wrap", amount: eur(1) })).not.toEqual([]);
    expect(issues(SummaryLine, { kind: "discount", amount: eur(1), detail: "" })).not.toEqual([]);
  });

  it("refuses an amount as a string, and a kind that is missing", () => {
    expect(
      issues(SummaryLine, { kind: "total", amount: { amount: "12", currencyCode: "EUR" } }),
    ).not.toEqual([]);
    expect(issues(SummaryLine, { amount: eur(1) })).not.toEqual([]);
  });
});

describe("StepperState", () => {
  const steps = [
    { id: "information", label: "Information", href: "/us/checkout?step=information" },
    { id: "delivery", label: "Delivery" },
    { id: "review", label: "Review" },
  ];

  it("takes a flow of steps and the one the reader is on", () => {
    for (const current of ["information", "delivery", "review"])
      expect(issues(StepperState, { steps, current }), current).toEqual([]);
  });

  it("takes steps with no link at all: a flow that cannot be gone back in", () => {
    expect(
      issues(StepperState, {
        steps: steps.map(({ id, label }) => ({ id, label })),
        current: "delivery",
      }),
    ).toEqual([]);
  });

  it("wants two steps at least: one step is not a flow", () => {
    expect(issues(StepperState, { steps: [steps[0]], current: "information" })).not.toEqual([]);
    expect(issues(StepperState, { steps: [], current: "information" })).not.toEqual([]);
  });

  it("refuses a current step that is not one of the steps", () => {
    expect(issues(StepperState, { steps, current: "payment" })).toEqual([
      "current is not one of the steps",
    ]);
  });

  it("refuses a step listed twice: the current step would be two", () => {
    const twice = [...steps, { id: "delivery", label: "Shipping" }];
    expect(issues(StepperState, { steps: twice, current: "delivery" })).toEqual([
      "a step is listed twice",
    ]);
  });

  it("refuses a step with no label, no id, or a link that goes nowhere real", () => {
    expect(
      issues(StepperState, { steps: [{ id: "a", label: "" }, steps[1]], current: "a" }),
    ).not.toEqual([]);
    expect(
      issues(StepperState, { steps: [{ label: "A" }, steps[1]], current: "delivery" }),
    ).not.toEqual([]);
    expect(
      issues(StepperState, {
        steps: [{ id: "a", label: "A", href: "//evil.example" }, steps[1]],
        current: "delivery",
      }),
    ).not.toEqual([]);
  });
});

describe("ShippingEstimate", () => {
  const option = {
    id: "so_standard",
    name: "Standard",
    price: eur(4.9),
    estimate: { minDays: 3, maxDays: 5 },
    available: true,
  };
  const estimate = {
    action: "/de/cart",
    countries: ["cy", "de", "fr"],
    countryCode: "de",
    postalCode: "10969",
  };

  it("takes the form as it is first drawn: no country chosen, nothing typed, no options", () => {
    expect(
      issues(ShippingEstimate, { action: "/de/cart", countries: ["de", "fr"], postalCode: "" }),
    ).toEqual([]);
  });

  it("takes the answer: a country, a postal code and the options", () => {
    expect(issues(ShippingEstimate, { ...estimate, options: [option] })).toEqual([]);
  });

  it("takes an answer of no options: nothing ships there", () => {
    expect(issues(ShippingEstimate, { ...estimate, options: [] })).toEqual([]);
  });

  it("wants a country in lower case, and the region to have one at least", () => {
    expect(
      issues(ShippingEstimate, { ...estimate, countries: ["DE"], countryCode: "DE" }),
    ).not.toEqual([]);
    expect(
      issues(ShippingEstimate, { ...estimate, countries: [], countryCode: undefined }),
    ).not.toEqual([]);
  });

  it("refuses a chosen country that is not one the region sells to", () => {
    expect(issues(ShippingEstimate, { ...estimate, countryCode: "us" })).toEqual([
      "the country is not one of the estimator's countries",
    ]);
  });

  it("refuses a country listed twice: the select would show it twice", () => {
    expect(issues(ShippingEstimate, { ...estimate, countries: ["cy", "de", "de"] })).toEqual([
      "a country is listed twice",
    ]);
  });

  it("refuses an option listed twice", () => {
    expect(issues(ShippingEstimate, { ...estimate, options: [option, option] })).toEqual([
      "an option is listed twice",
    ]);
  });

  it("wants each option to be a ShippingOption, and the form to go to a real page", () => {
    expect(
      issues(ShippingEstimate, { ...estimate, options: [{ ...option, price: 4.9 }] }),
    ).not.toEqual([]);
    expect(issues(ShippingEstimate, { ...estimate, action: "cart" })).not.toEqual([]);
    expect(issues(ShippingEstimate, { ...estimate, action: "javascript:alert(1)" })).not.toEqual(
      [],
    );
  });
});

describe("VerificationRequest", () => {
  it("takes an address and the seconds until a new link can be sent", () => {
    expect(issues(VerificationRequest, { email: "alex@example.com", resendInSeconds: 42 })).toEqual(
      [],
    );
    expect(issues(VerificationRequest, { email: "alex@example.com", resendInSeconds: 0 })).toEqual(
      [],
    );
  });

  it("refuses an address that is not one", () => {
    expect(issues(VerificationRequest, { email: "alex", resendInSeconds: 0 })).not.toEqual([]);
    expect(issues(VerificationRequest, { email: "", resendInSeconds: 0 })).not.toEqual([]);
  });

  it("refuses a wait that is negative, fractional or not a number", () => {
    for (const resendInSeconds of [-1, 1.5, Number.NaN, "30"])
      expect(
        issues(VerificationRequest, { email: "alex@example.com", resendInSeconds }),
        String(resendInSeconds),
      ).not.toEqual([]);
  });
});

describe("the checkout contracts as JSON Schema (the Props table)", () => {
  it.each([
    ["SummaryLine", SummaryLine],
    ["StepperState", StepperState],
    ["ShippingEstimate", ShippingEstimate],
    ["VerificationRequest", VerificationRequest],
  ] as const)("%s draws with its fields and their descriptions", (_name, schema) => {
    const drawn = z.toJSONSchema(schema, { io: "input" }) as {
      type: string;
      properties: Record<string, { description?: string }>;
    };
    expect(drawn.type).toBe("object");
    expect(Object.keys(drawn.properties).length).toBeGreaterThan(1);
  });

  it("says what the money is and what a discount's amount is", () => {
    const drawn = z.toJSONSchema(SummaryLine, { io: "input" }) as unknown as {
      properties: { amount: { description?: string } };
    };
    expect(drawn.properties.amount.description).toContain("a discount is the amount taken off");
  });
});
