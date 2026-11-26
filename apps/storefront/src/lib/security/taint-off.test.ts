import { describe, expect, it } from "vitest";
import { taintAvailable, taintObject, taintSecret } from "./taint";

// Outside React's experimental server build (the browser, the proxy, `next.config.ts`, these tests)
// React has no taint API, and the helpers do nothing.
describe("taint without React's API", () => {
  it("does nothing and returns its input", () => {
    expect(taintAvailable()).toBe(false);
    const value = "z".repeat(40);
    expect(taintSecret("PAYLOAD_SECRET", value)).toBe(value);
    const object = { id: "cus_1" };
    expect(taintObject("message", object)).toBe(object);
  });
});
