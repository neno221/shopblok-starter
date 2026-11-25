// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stripe.js is a stand-in: these tests are about what the Element group is asked for (D119), not
// about Stripe. The Element's `change` handler is kept, to choose a tab as the shopper would.
let change: ((event: { value: { type: string } }) => void) | undefined;
const update = vi.fn();
const elementsOf = vi.fn();
const element = {
  on: vi.fn((name: string, handler: (event: { value: { type: string } }) => void) => {
    if (name === "change") change = handler;
  }),
  mount: vi.fn(),
  destroy: vi.fn(),
};
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(async () => ({
    elements: (options: unknown) => {
      elementsOf(options);
      return { create: () => element, update };
    },
  })),
}));

const { mountPaymentElement } = await import("./stripe-client");

const mount = (saving: boolean) =>
  mountPaymentElement({
    publishableKey: "pk_test_x",
    locale: "en-US",
    amount: 25,
    currency: "eur",
    host: document.createElement("div"),
    saving,
  });

/** What the last `elements.update` asked about saving (`undefined`: never asked). */
const lastSaving = () =>
  update.mock.calls
    .map(([options]) => options as { setupFutureUsage?: string | null })
    .filter((options) => "setupFutureUsage" in options)
    .at(-1)?.setupFutureUsage;

describe("mountPaymentElement's saving (M6 D119)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    change = undefined;
  });

  it("asks the group to save when the box is ticked, and not when it is not", async () => {
    const mounted = await mount(true);
    expect(elementsOf).toHaveBeenCalledWith(
      expect.objectContaining({ setupFutureUsage: "off_session" }),
    );
    mounted.setSaving(false);
    expect(lastSaving()).toBeNull();
    mounted.setSaving(true);
    expect(lastSaving()).toBe("off_session");
  });

  it("never saves an Apple Pay or Google Pay card, whatever the box says (PR 142 review, item 3)", async () => {
    const mounted = await mount(true);
    for (const wallet of ["apple_pay", "google_pay"]) {
      change?.({ value: { type: wallet } });
      expect(lastSaving()).toBeNull();
      mounted.setSaving(false);
      mounted.setSaving(true);
      expect(lastSaving()).toBeNull();
      // Back on the card's tab, the ticked box saves again.
      change?.({ value: { type: "card" } });
      expect(lastSaving()).toBe("off_session");
    }
    change?.({ value: { type: "revolut_pay" } });
    expect(lastSaving()).toBe("off_session");
  });

  it("asks nothing while a wallet is chosen with the box not ticked", async () => {
    await mount(false);
    change?.({ value: { type: "apple_pay" } });
    change?.({ value: { type: "card" } });
    expect(lastSaving()).toBeUndefined();
  });
});
