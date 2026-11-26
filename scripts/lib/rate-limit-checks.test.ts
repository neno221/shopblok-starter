import { describe, expect, it } from "vitest";
import {
  signingSecretCheck,
  TURNSTILE_TEST_KEY,
  turnstileKeyChecks,
  turnstileSecretCheck,
} from "./rate-limit-checks.ts";

const both = (value: string | undefined) => ({
  backend: { STOREFRONT_SIGNING_SECRET: value },
  storefront: { STOREFRONT_SIGNING_SECRET: value },
});

describe("signingSecretCheck (T108, D142)", () => {
  it("is ok with the secret in each app it looks at", () => {
    expect(signingSecretCheck(both("s"), ["backend", "storefront"], true).level).toBe("ok");
  });

  it("names each app without it: an error on a deployment, a warning elsewhere", () => {
    const envs = { backend: { STOREFRONT_SIGNING_SECRET: "s" }, storefront: {} };
    const deployed = signingSecretCheck(envs, ["backend", "storefront"], true);
    expect([deployed.level, deployed.details]).toEqual([
      "error",
      ["not set: STOREFRONT_SIGNING_SECRET (apps/storefront)"],
    ]);
    expect(signingSecretCheck(envs, ["backend", "storefront"], false).level).toBe("warn");
    // `--app=backend` looks at the backend alone.
    expect(signingSecretCheck(envs, ["backend"], true).level).toBe("ok");
    expect(signingSecretCheck(both("  "), ["backend"], false).level).toBe("warn");
  });
});

describe("turnstileKeyChecks (T108, D143)", () => {
  const test = {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    TURNSTILE_SECRET_KEY: "2x0000000000000000000000000000000AA",
  };

  it("knows Cloudflare's published test keys, and not a real one", () => {
    for (const key of [
      "1x00000000000000000000AA",
      "2x00000000000000000000AB",
      "3x00000000000000000000FF",
      "1x0000000000000000000000000000000AA",
      "3x0000000000000000000000000000000AA",
    ])
      expect(TURNSTILE_TEST_KEY.test(key), key).toBe(true);
    expect(TURNSTILE_TEST_KEY.test("0x4AAAAAAABkMYinukE8nzY")).toBe(false);
  });

  it("refuses a test key in production only, naming the key and never its value", () => {
    expect(turnstileKeyChecks(test, false)).toEqual([]);
    const [check] = turnstileKeyChecks(test, true);
    expect(check?.level).toBe("error");
    expect(check?.details).toEqual([
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY is a test key (apps/storefront)",
      "TURNSTILE_SECRET_KEY is a test key (apps/storefront)",
    ]);
    expect(JSON.stringify(check)).not.toContain("1x000");
    expect(turnstileKeyChecks({ TURNSTILE_SECRET_KEY: "0x4AAAAAAABkMYinukE8nzY" }, true)).toEqual(
      [],
    );
  });
});

describe("turnstileSecretCheck (T108, --online)", () => {
  const answer = (status: number, body: unknown) =>
    ({ kind: "response", status, text: JSON.stringify(body) }) as const;

  it("a refused token with a good secret is ok", () => {
    const check = turnstileSecretCheck(
      answer(200, { success: false, "error-codes": ["invalid-input-response"] }),
    );
    expect(check.level).toBe("ok");
  });

  it("a refused secret is an error", () => {
    const check = turnstileSecretCheck(
      answer(200, { success: false, "error-codes": ["invalid-input-secret"] }),
    );
    expect(check.level).toBe("error");
  });

  it("no answer, or another status, is not checked", () => {
    expect(turnstileSecretCheck({ kind: "unreachable", reason: "no answer" }).level).toBe("warn");
    expect(turnstileSecretCheck(answer(503, {})).level).toBe("warn");
  });
});
