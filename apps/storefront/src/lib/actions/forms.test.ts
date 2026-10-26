import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect ${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));
const leaveFlash = vi.fn(async () => "key");
vi.mock("../flash", () => ({ leaveFlash }));
vi.mock("../market-context", () => ({
  getMarketContext: vi.fn(async () => ({ url: (path: string) => `/us${path}` })),
}));
const refused = { ok: false, form: "unavailable", errors: {} };
vi.mock("./cart-handlers", () => ({
  applyPromoAction: vi.fn(async () => refused),
  removePromoAction: vi.fn(async () => refused),
  removeLineAction: vi.fn(async () => refused),
  updateLineAction: vi.fn(async () => refused),
}));
vi.mock("./checkout-handlers", () => ({}));

const { applyPromoForm, removePromoForm } = await import("./forms");

const code = (value: string) => {
  const data = new FormData();
  data.set("code", value);
  return data;
};

beforeEach(() => {
  leaveFlash.mockClear();
});

// The cart page reads a flash's `code` as a refused apply, beside the promotion field (PR 80
// review, item 1), so only the apply form types it back.
describe("the cart page's promotion forms", () => {
  it("types a refused code back in", async () => {
    await expect(applyPromoForm("en-us", code("SUMMER10"))).rejects.toThrow(
      "redirect /us/cart?f=key",
    );
    expect(leaveFlash).toHaveBeenCalledWith("/us/cart", {
      form: "unavailable",
      errors: {},
      values: { code: "SUMMER10" },
    });
  });

  it("does not type back a code it failed to take off", async () => {
    await expect(removePromoForm("en-us", code("SUMMER10"))).rejects.toThrow(
      "redirect /us/cart?f=key",
    );
    expect(leaveFlash).toHaveBeenCalledWith("/us/cart", { form: "unavailable", errors: {} });
  });
});
