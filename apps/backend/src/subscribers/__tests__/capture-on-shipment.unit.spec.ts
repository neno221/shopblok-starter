import { staleUncaptured, UNCAPTURED_AFTER_MS } from "../../jobs/uncaptured-payments";
import { uncapturedStripePayments } from "../capture-on-shipment";

const STRIPE = "pp_stripe_stripe";

describe("capture on shipment (M6 D118)", () => {
  it("captures only Stripe payments not captured or canceled yet", () => {
    const payments = [
      { id: "pay_1", provider_id: STRIPE },
      { id: "pay_2", provider_id: STRIPE, captured_at: "2026-11-20T00:00:00Z" },
      { id: "pay_3", provider_id: STRIPE, canceled_at: "2026-11-20T00:00:00Z" },
      { id: "pay_4", provider_id: "pp_system_default" },
      null,
    ];
    expect(uncapturedStripePayments(payments).map((p) => p.id)).toEqual(["pay_1"]);
  });
});

describe("uncaptured payments after 6 days (M6 D118)", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  const at = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("names a Stripe payment waiting 6 days or more, and nothing younger", () => {
    const payments = [
      { id: "old", provider_id: STRIPE, created_at: at(UNCAPTURED_AFTER_MS) },
      { id: "young", provider_id: STRIPE, created_at: at(UNCAPTURED_AFTER_MS - 60_000) },
      {
        id: "done",
        provider_id: STRIPE,
        created_at: at(UNCAPTURED_AFTER_MS * 2),
        captured_at: at(0),
      },
      { id: "system", provider_id: "pp_system_default", created_at: at(UNCAPTURED_AFTER_MS * 2) },
    ];
    expect(staleUncaptured(payments, now).map((p) => p.id)).toEqual(["old"]);
  });
});
