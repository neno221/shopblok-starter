import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PRERENDER_PRODUCTS,
  PLACEHOLDER_HANDLE,
  prerenderCap,
  productHandlesToPrerender,
} from "./prerender";

const URL = "http://localhost:9000";

describe("prerender (D58)", () => {
  it("reads the cap, 500 when unset or blank", () => {
    expect(prerenderCap({})).toBe(DEFAULT_PRERENDER_PRODUCTS);
    expect(prerenderCap({ STOREFRONT_PRERENDER_PRODUCTS: " " })).toBe(500);
    expect(prerenderCap({ STOREFRONT_PRERENDER_PRODUCTS: "4" })).toBe(4);
    expect(prerenderCap({ STOREFRONT_PRERENDER_PRODUCTS: "0" })).toBe(0);
    for (const bad of ["-1", "2.5", "many"])
      expect(() => prerenderCap({ STOREFRONT_PRERENDER_PRODUCTS: bad })).toThrow(/whole number/);
  });

  it("renders the placeholder alone and asks nothing without MEDUSA_BACKEND_URL (D10)", async () => {
    const list = vi.fn();
    expect(await productHandlesToPrerender(list, {})).toEqual([PLACEHOLDER_HANDLE]);
    expect(await productHandlesToPrerender(list, { MEDUSA_BACKEND_URL: "  " })).toEqual([
      PLACEHOLDER_HANDLE,
    ]);
    expect(list).not.toHaveBeenCalled();
  });

  it("asks Medusa for the first `cap` handles", async () => {
    const list = vi.fn().mockResolvedValue(["a", "b", "c", "d"]);
    const source = {
      MEDUSA_BACKEND_URL: URL,
      STOREFRONT_PRERENDER_PRODUCTS: "4",
    };
    expect(await productHandlesToPrerender(list, source)).toEqual(["a", "b", "c", "d"]);
    expect(list).toHaveBeenCalledWith(4);
  });

  it("renders the placeholder for a cap of 0 or an empty catalog", async () => {
    const list = vi.fn().mockResolvedValue([]);
    expect(
      await productHandlesToPrerender(list, {
        MEDUSA_BACKEND_URL: URL,
        STOREFRONT_PRERENDER_PRODUCTS: "0",
      }),
    ).toEqual([PLACEHOLDER_HANDLE]);
    expect(list).not.toHaveBeenCalled();
    expect(await productHandlesToPrerender(list, { MEDUSA_BACKEND_URL: URL })).toEqual([
      PLACEHOLDER_HANDLE,
    ]);
  });

  it("fails the build, naming Medusa, when the URL is set and Medusa does not answer", async () => {
    const list = vi.fn().mockRejectedValue(new Error("fetch failed"));
    await expect(productHandlesToPrerender(list, { MEDUSA_BACKEND_URL: URL })).rejects.toThrow(
      /could not read Medusa at http:\/\/localhost:9000/,
    );
  });

  it("is a handle Medusa cannot have (a handle is lowercase letters, digits and dashes)", () => {
    expect(PLACEHOLDER_HANDLE).not.toMatch(/^[a-z0-9-]+$/);
  });
});
