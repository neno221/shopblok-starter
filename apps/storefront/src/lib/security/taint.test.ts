import { afterEach, describe, expect, it, vi } from "vitest";

// React's experimental server build, as Next loads it with `experimental.taint`: a stand-in that
// records each call, so the test sees what is tainted and with which message.
const calls = vi.hoisted(() => ({
  values: [] as { message: string; lifetime: object; value: string }[],
  objects: [] as { message: string; object: object }[],
}));
vi.mock("react", () => ({
  experimental_taintUniqueValue: (message: string, lifetime: object, value: string) =>
    calls.values.push({ message, lifetime, value }),
  experimental_taintObjectReference: (message: string, object: object) =>
    calls.objects.push({ message, object }),
}));

const {
  MIN_SECRET_LENGTH,
  SERVER_SECRETS,
  taintAvailable,
  taintObject,
  taintSecret,
  taintServerSecrets,
} = await import("./taint");

afterEach(() => {
  calls.values.length = 0;
  calls.objects.length = 0;
});

describe("taint (T109, SPEC §11.1)", () => {
  it("uses React's API when it is there", () => {
    expect(taintAvailable()).toBe(true);
  });

  it("taints each server secret's value once, for the process, naming the secret and not its value", () => {
    const env = {
      PAYLOAD_SECRET: "p".repeat(32),
      STOREFRONT_SIGNING_SECRET: "s".repeat(32),
      REVALIDATE_SECRET: "r".repeat(32),
      CRON_SECRET: "c".repeat(32),
      PREVIEW_SECRET: "v".repeat(32),
      TURNSTILE_SECRET_KEY: "t".repeat(32),
      RESEND_API_KEY: "re_".padEnd(32, "x"),
      S3_SECRET_ACCESS_KEY: "k".repeat(40),
      NEXT_PUBLIC_STRIPE_KEY: "pk_test_".padEnd(32, "x"),
    };
    taintServerSecrets(env);
    taintServerSecrets(env);
    expect(calls.values.map((call) => call.value).sort()).toEqual(
      Object.entries(env)
        .filter(([name]) => (SERVER_SECRETS as readonly string[]).includes(name))
        .map(([, value]) => value)
        .sort(),
    );
    for (const call of calls.values) {
      expect(call.lifetime).toBe(globalThis);
      expect(call.message).not.toContain(call.value);
    }
    expect(calls.values.find((call) => call.value === env.PAYLOAD_SECRET)?.message).toContain(
      "PAYLOAD_SECRET",
    );
  });

  it("leaves blank and short values alone, and returns every value unchanged", () => {
    expect(taintSecret("CRON_SECRET", undefined)).toBeUndefined();
    expect(taintSecret("CRON_SECRET", "")).toBe("");
    const short = "x".repeat(MIN_SECRET_LENGTH - 1);
    expect(taintSecret("CRON_SECRET", short)).toBe(short);
    expect(calls.values).toEqual([]);
    const long = "y".repeat(MIN_SECRET_LENGTH);
    expect(taintSecret("CRON_SECRET", long)).toBe(long);
    expect(calls.values.map((call) => call.value)).toEqual([long]);
  });

  it("taints an object by reference and returns the same object", () => {
    const customer = { id: "cus_1", email: "a@example.com" };
    expect(taintObject("stays on the server", customer)).toBe(customer);
    expect(calls.objects).toEqual([{ message: "stays on the server", object: customer }]);
  });
});
