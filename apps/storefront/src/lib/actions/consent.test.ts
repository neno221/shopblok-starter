import { beforeEach, describe, expect, it, vi } from "vitest";
import { seeded } from "../markets/test-maps";

// M7 D145 (T109): the consent actions' own parts; the record is `consent/record.test.ts`.
const keepConsent = vi.hoisted(() =>
  vi.fn(async (_market: unknown, _choice: unknown, _options: unknown) => ({
    kept: true as const,
    id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    kind: "given" as const,
  })),
);
const syncCart = vi.hoisted(() => vi.fn(async () => true));
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`redirect ${url}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("../consent/record", () => ({ keepConsent }));
vi.mock("../medusa/cart", () => ({ syncCartConsent: syncCart }));
vi.mock("../markets/cached-market-map", () => ({ getRenderMarketMap: async () => seeded }));

const { saveCookieSettings, syncCartConsent } = await import("./consent");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe("the consent actions (D145)", () => {
  beforeEach(() => {
    keepConsent.mockClear();
    syncCart.mockClear();
    redirect.mockClear();
  });

  it("records the island's choice as passed, writes no cookie, answers the id, and tells the cart", async () => {
    expect(await syncCartConsent("fr-ch", { analytics: false, marketing: true })).toBe(
      "0f8fad5b-d9cb-469f-a165-70867728950e",
    );
    expect(keepConsent).toHaveBeenCalledWith(
      expect.objectContaining({ key: "fr-ch" }),
      { analytics: false, marketing: true },
      { setCookie: false },
    );
    expect(syncCart).toHaveBeenCalledTimes(1);
  });

  it("records without the cart when told to (a yes the PostHog gate sends)", async () => {
    expect(await syncCartConsent("fr-ch", { analytics: true, marketing: false }, false)).toBe(
      "0f8fad5b-d9cb-469f-a165-70867728950e",
    );
    expect(syncCart).not.toHaveBeenCalled();
  });

  it("only tells the cart without a choice (the gate's call), or for a market or a choice that is not one", async () => {
    expect(await syncCartConsent()).toBeNull();
    expect(await syncCartConsent("fr-cy", { analytics: true, marketing: true })).toBeNull();
    expect(await syncCartConsent("fr-ch", { analytics: "yes", marketing: true })).toBeNull();
    expect(await syncCartConsent("fr-ch", null)).toBeNull();
    expect(keepConsent).not.toHaveBeenCalled();
    expect(syncCart).toHaveBeenCalledTimes(4);
  });

  it("is no error when Medusa is out of reach", async () => {
    syncCart.mockRejectedValueOnce(new Error("unreachable"));
    expect(await syncCartConsent()).toBeNull();
  });

  it("saves the no-script form's boxes, writing the cookie, and says so at the form", async () => {
    await expect(saveCookieSettings("fr-ch", form({ analytics: "on" }))).rejects.toThrow(
      /^redirect .*#cookie-settings-saved$/,
    );
    expect(keepConsent).toHaveBeenCalledWith(
      expect.objectContaining({ key: "fr-ch" }),
      { analytics: true, marketing: false },
      { setCookie: true },
    );
    expect(syncCart).toHaveBeenCalledTimes(1);
  });

  it("does not say saved when the form's market no longer resolves (PR 156 review)", async () => {
    await expect(saveCookieSettings("fr-cy", form({ analytics: "on" }))).rejects.toThrow(
      /^redirect [^#]*#cookie-settings$/,
    );
    expect(keepConsent).not.toHaveBeenCalled();
    expect(syncCart).not.toHaveBeenCalled();
  });
});
