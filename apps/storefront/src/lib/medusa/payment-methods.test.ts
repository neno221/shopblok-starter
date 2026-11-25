import { describe, expect, it } from "vitest";
import { toSavedMethodDto } from "./payment-methods";

// M6 D119 (T101): only what the backend answers is read, and checked again.
describe("toSavedMethodDto", () => {
  it("reads a card and a Revolut Pay account", () => {
    expect(
      toSavedMethodDto({
        id: "pm_1",
        type: "card",
        brand: "visa",
        last4: "4242",
        exp_month: 12,
        exp_year: 2030,
        wallet: null,
      }),
    ).toEqual({
      id: "pm_1",
      type: "card",
      brand: "visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2030,
      wallet: null,
    });
    expect(toSavedMethodDto({ id: "pm_2", type: "revolut_pay" })).toEqual({
      id: "pm_2",
      type: "revolut_pay",
      brand: null,
      last4: null,
      expiryMonth: null,
      expiryYear: null,
      wallet: null,
    });
  });

  it("refuses another id or type, and drops fields that are not what Stripe sends", () => {
    expect(toSavedMethodDto(null)).toBeNull();
    expect(toSavedMethodDto({ id: "card_1", type: "card" })).toBeNull();
    expect(toSavedMethodDto({ id: "pm_1", type: "sepa_debit" })).toBeNull();
    expect(
      toSavedMethodDto({
        id: "pm_1",
        type: "card",
        brand: "<b>visa</b>",
        last4: "42424",
        exp_month: 13,
        exp_year: 1999,
      }),
    ).toMatchObject({ brand: null, last4: null, expiryMonth: null, expiryYear: null });
  });
});
