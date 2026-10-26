import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieJar } from "../test-support/cookie-jar";

const jar = createCookieJar();
vi.mock("next/headers", () => ({ cookies: jar.cookies }));

const { leaveFlash, readFlash } = await import("./flash");

beforeEach(() => jar.reset());

describe("leaveFlash and readFlash (T52's post-redirect-get)", () => {
  it("reads the flash back under its key, for its path", async () => {
    const key = await leaveFlash("/checkout", {
      form: "rejected",
      errors: { email: "invalid" },
      values: { email: "a@" },
    });
    expect(key).toMatch(/^[\w-]{8}$/);
    expect(await readFlash("/checkout", key)).toEqual({
      form: "rejected",
      errors: { email: "invalid" },
      values: { email: "a@" },
    });
    // A reload shows the same answer: reading does not consume it.
    expect(await readFlash("/checkout", key)).not.toBeNull();
  });

  it("gives a different key each time", async () => {
    const keys = new Set([
      await leaveFlash("/checkout", {}),
      await leaveFlash("/checkout", {}),
      await leaveFlash("/checkout", {}),
    ]);
    expect(keys.size).toBe(3);
  });

  it("reads nothing for another key, another path, or no key", async () => {
    const key = await leaveFlash("/checkout", { errors: { email: "invalid" } });
    expect(await readFlash("/checkout", "other")).toBeNull();
    expect(await readFlash("/checkout/delivery", key)).toBeNull();
    expect(await readFlash("/checkout", undefined)).toBeNull();
    expect(await readFlash("/checkout", "")).toBeNull();
  });

  it("reads nothing when no flash was left", async () => {
    expect(await readFlash("/checkout", "k")).toBeNull();
  });

  it("cuts each typed value to 200 characters", async () => {
    const key = await leaveFlash("/checkout", { values: { note: "x".repeat(500), city: "Bonn" } });
    const flash = await readFlash("/checkout", key);
    expect(flash?.values?.note).toHaveLength(200);
    expect(flash?.values?.city).toBe("Bonn");
  });

  it("drops what was typed, and keeps the errors, when the whole passes 3000 characters", async () => {
    // Twenty values of 200 characters each are 4000 characters once cut.
    const values = Object.fromEntries(
      Array.from({ length: 20 }, (_, at) => [`f${at}`, "y".repeat(500)]),
    );
    const key = await leaveFlash("/checkout", {
      form: "rejected",
      errors: { f0: "invalid" },
      values,
    });
    expect(jar.writes[0]!.value.length).toBeLessThanOrEqual(3000);
    expect(await readFlash("/checkout", key)).toEqual({
      form: "rejected",
      errors: { f0: "invalid" },
      values: {},
    });
  });

  it("keeps a flash just under the cap whole", async () => {
    const values = Object.fromEntries(
      Array.from({ length: 10 }, (_, at) => [`f${at}`, "y".repeat(200)]),
    );
    const key = await leaveFlash("/checkout", { values });
    expect(Object.keys((await readFlash("/checkout", key))?.values ?? {})).toHaveLength(10);
  });

  it("reads null for a cookie that is not JSON, not an object, or holds other types", async () => {
    for (const raw of ["not json", "null", '"text"', "[1]"]) {
      jar.reset({ _shopblok_flash: raw });
      expect(await readFlash("/checkout", "k")).toBeNull();
    }
    jar.reset({
      _shopblok_flash: JSON.stringify({
        key: "k",
        path: "/checkout",
        form: 7,
        errors: { a: "required", b: 3 },
        values: "text",
      }),
    });
    expect(await readFlash("/checkout", "k")).toEqual({ errors: { a: "required" }, values: {} });
  });
});
