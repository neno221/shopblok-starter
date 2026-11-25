import { previewOf, toSavedMethod } from "../saved-methods";

describe("toSavedMethod (M6 D119)", () => {
  it("keeps a card's brand, last four, expiry and wallet, and nothing else of Stripe's object", () => {
    const card = toSavedMethod("pm_1Abc", {
      id: "pm_1Abc",
      type: "card",
      billing_details: { name: "Ada Lovelace", email: "ada@example.com" },
      card: {
        brand: "visa",
        last4: "4242",
        exp_month: 8,
        exp_year: 2031,
        fingerprint: "abc",
        wallet: null,
      },
    });
    expect(card).toEqual({
      id: "pm_1Abc",
      type: "card",
      brand: "visa",
      last4: "4242",
      exp_month: 8,
      exp_year: 2031,
    });
    expect(
      toSavedMethod("pm_2", {
        type: "card",
        card: { brand: "visa", wallet: { type: "apple_pay" } },
      }),
    ).toEqual({ id: "pm_2", type: "card", brand: "visa", wallet: "apple_pay" });
  });

  it("keeps Revolut Pay by its type, and drops the types the shop does not save", () => {
    expect(toSavedMethod("pm_3", { type: "revolut_pay", revolut_pay: {} })).toEqual({
      id: "pm_3",
      type: "revolut_pay",
    });
    expect(toSavedMethod("pm_4", { type: "link" })).toBeNull();
    expect(toSavedMethod("pm_5", { type: "sepa_debit" })).toBeNull();
    expect(toSavedMethod("pm_6", null)).toBeNull();
  });

  it("refuses an id that is not a PaymentMethod's, and values out of shape", () => {
    expect(toSavedMethod("src_1", { type: "card" })).toBeNull();
    expect(
      toSavedMethod("pm_7", {
        type: "card",
        card: { brand: "<b>", last4: "42", exp_month: 13, exp_year: 1999 },
      }),
    ).toEqual({ id: "pm_7", type: "card" });
  });

  it("answers the review's preview of a saved method", () => {
    expect(
      previewOf({
        id: "pm_1",
        type: "card",
        brand: "visa",
        last4: "4242",
        exp_month: 1,
        exp_year: 2030,
      }),
    ).toEqual({ type: "card", brand: "visa", last4: "4242" });
    expect(previewOf({ id: "pm_2", type: "revolut_pay" })).toEqual({ type: "revolut_pay" });
  });
});
