import { checkSessionData, refusesSystemSession, sessionsToProcess } from "../guard";

const STRIPE = "pp_stripe_stripe";
const SYSTEM = "pp_system_default";

describe("refusesSystemSession (M6 D117)", () => {
  it("refuses Pay later on a total above zero while Stripe is on", () => {
    expect(refusesSystemSession(SYSTEM, 25, true)).toBe(true);
    expect(refusesSystemSession(SYSTEM, 0.01, true)).toBe(true);
  });

  it("takes Pay later for a zero total, and always without Stripe", () => {
    expect(refusesSystemSession(SYSTEM, 0, true)).toBe(false);
    expect(refusesSystemSession(SYSTEM, 25, false)).toBe(false);
    expect(refusesSystemSession(STRIPE, 25, true)).toBe(false);
  });
});

describe("checkSessionData (M6 D117, D119)", () => {
  const owner = { caller: "cus_1", owner: "cus_1", savedMethods: ["pm_1"] };

  it("takes no data, and empty data, from anyone", () => {
    expect(checkSessionData(STRIPE, undefined, {})).toEqual({ ok: true });
    expect(checkSessionData(STRIPE, {}, {})).toEqual({ ok: true });
    expect(checkSessionData(SYSTEM, {}, {})).toEqual({ ok: true });
  });

  it("refuses every key the shop never sends, whoever sends it", () => {
    for (const data of [
      { capture_method: "automatic" },
      { confirm: true },
      { off_session: true },
      { payment_method_options: {} },
      { automatic_payment_methods: { enabled: false } },
      { return_url: "https://example.com" },
    ])
      expect(checkSessionData(STRIPE, data, owner).ok).toBe(false);
  });

  it("refuses any data for the system provider, and data that is not an object", () => {
    expect(checkSessionData(SYSTEM, { setup_future_usage: "off_session" }, owner).ok).toBe(false);
    expect(checkSessionData(STRIPE, "x", owner).ok).toBe(false);
    expect(checkSessionData(STRIPE, ["x"], owner).ok).toBe(false);
  });

  it("saves a method only for the cart's signed-in customer, and only off_session", () => {
    expect(checkSessionData(STRIPE, { setup_future_usage: "off_session" }, owner)).toEqual({
      ok: true,
    });
    expect(checkSessionData(STRIPE, { setup_future_usage: "on_session" }, owner).ok).toBe(false);
    expect(checkSessionData(STRIPE, { setup_future_usage: "off_session" }, {}).ok).toBe(false);
    expect(
      checkSessionData(
        STRIPE,
        { setup_future_usage: "off_session" },
        { caller: "cus_2", owner: "cus_1" },
      ).ok,
    ).toBe(false);
    // A guest checkout Medusa attached to an account by its e-mail has an owner but no caller.
    expect(
      checkSessionData(STRIPE, { setup_future_usage: "off_session" }, { owner: "cus_1" }).ok,
    ).toBe(false);
  });

  it("uses a saved method only when it is the caller's own", () => {
    expect(checkSessionData(STRIPE, { payment_method: "pm_1" }, owner)).toEqual({ ok: true });
    expect(checkSessionData(STRIPE, { payment_method: "pm_2" }, owner).ok).toBe(false);
    expect(checkSessionData(STRIPE, { payment_method: "pm_1" }, { owner: "cus_1" }).ok).toBe(false);
    expect(checkSessionData(STRIPE, { payment_method: "" }, owner).ok).toBe(false);
  });
});

describe("sessionsToProcess (M6 D117, PR 140 review item 1)", () => {
  it("lists the providers of the sessions Medusa processes at completion, not canceled or errored ones", () => {
    expect(
      sessionsToProcess([
        { provider_id: SYSTEM, status: "pending" },
        { provider_id: "pp_stripe_stripe", status: "authorized" },
        { provider_id: SYSTEM, status: "canceled" },
        { provider_id: SYSTEM, status: "error" },
        null,
      ]),
    ).toEqual([SYSTEM, "pp_stripe_stripe"]);
  });
});
