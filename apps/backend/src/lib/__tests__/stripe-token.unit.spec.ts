import { judgeToken, sanitizePreview } from "../stripe-token";

const now = 1_800_000_000;
const token = (extra: Record<string, unknown> = {}) => ({
  id: "ctoken_1",
  object: "confirmation_token",
  expires_at: now + 600,
  payment_intent: null,
  setup_intent: null,
  payment_method_preview: {
    type: "card",
    card: { brand: "visa", last4: "4242", wallet: null, number: "4242424242424242" },
  },
  ...extra,
});

describe("judgeToken (M6 D117)", () => {
  it("keeps only the type, brand, last four and wallet of an unused token", () => {
    expect(judgeToken(token(), now)).toEqual({
      ok: true,
      preview: { type: "card", brand: "visa", last4: "4242" },
    });
    expect(
      judgeToken(
        token({
          payment_method_preview: {
            type: "card",
            card: { brand: "visa", last4: "4242", wallet: { type: "apple_pay" } },
          },
        }),
        now,
      ),
    ).toEqual({
      ok: true,
      preview: { type: "card", brand: "visa", last4: "4242", wallet: "apple_pay" },
    });
    expect(judgeToken(token({ payment_method_preview: { type: "revolut_pay" } }), now)).toEqual({
      ok: true,
      preview: { type: "revolut_pay" },
    });
  });

  it("refuses a token another intent used, an expired one, and anything else", () => {
    expect(judgeToken(token({ payment_intent: "pi_1" }), now).ok).toBe(false);
    expect(judgeToken(token({ setup_intent: "seti_1" }), now).ok).toBe(false);
    expect(judgeToken(token({ expires_at: now }), now).ok).toBe(false);
    expect(judgeToken(token({ object: "payment_method" }), now).ok).toBe(false);
    expect(judgeToken(token({ payment_method_preview: null }), now).ok).toBe(false);
  });
});

describe("sanitizePreview", () => {
  it("keeps a preview's known fields and drops anything else", () => {
    expect(
      sanitizePreview({ type: "card", brand: "visa", last4: "4242", token: "ctoken_x", wallet: 3 }),
    ).toEqual({ type: "card", brand: "visa", last4: "4242" });
    expect(sanitizePreview({ type: "revolut_pay" })).toEqual({ type: "revolut_pay" });
  });

  it("is null for what is not one", () => {
    for (const value of [null, "card", { brand: "visa" }, { type: "<b>" }]) expect(sanitizePreview(value)).toBeNull();
    expect(sanitizePreview({ type: "card", last4: "42a2" })).toEqual({ type: "card" });
  });
});
