import { describe, expect, it } from "vitest";
import { ALLOWED_FAKE_KEYS, describeFindings, findKeys, isBinary } from "./no-keys.ts";

// The keys below are built from parts, so this file itself never holds one for `pnpm check:keys`
// to find (but the allowed fake, which it must let through).
const fill = (n: number, chars = "aB3dE5gH7jK9mN1pQ") => chars.repeat(4).slice(0, n);
const key = (prefix: string, n = 24) => `${prefix}${fill(n)}`;

const kinds = (text: string) => findKeys("f.ts", text).map((f) => f.kind);

describe("findKeys", () => {
  it("finds each kind of key at its real length", () => {
    expect(kinds(`STRIPE_API_KEY=${key("sk_test_")}`)).toEqual(["stripe-secret"]);
    expect(kinds(`STRIPE_API_KEY=${key("sk_live_")}`)).toEqual(["stripe-secret"]);
    expect(kinds(`const k = "${key("rk_live_")}";`)).toEqual(["stripe-restricted"]);
    expect(kinds(`NEXT_PUBLIC_STRIPE_KEY=${key("pk_live_")}`)).toEqual(["stripe-publishable-live"]);
    expect(kinds(`STRIPE_WEBHOOK_SECRET=${key("whsec_", 32)}`)).toEqual(["stripe-webhook"]);
    expect(kinds(`RESEND_API_KEY=re_${fill(8)}_${fill(24)}`)).toEqual(["resend"]);
    expect(kinds(`id: ${"AKIA"}${"ABCDEFGHIJKLMNOP"}`)).toEqual(["aws-access-key"]);
  });

  it("finds two keys on one line, and gives the line", () => {
    const text = `one\nA=${key("sk_test_")} B=${key("whsec_")}\n`;
    expect(findKeys("x/.env", text)).toEqual([
      { file: "x/.env", line: 2, kind: "stripe-secret", name: "Stripe secret key" },
      { file: "x/.env", line: 2, kind: "stripe-webhook", name: "Stripe webhook signing secret" },
    ]);
  });

  it("ignores identifiers that end in a prefix, short placeholders and Stripe's publishable test key", () => {
    for (const text of [
      `task_test_${fill(24)}`,
      `desk_live_${fill(24)}`,
      `store_${fill(24)}`,
      `are_${fill(24)}`,
      `fire_${fill(24)}`,
      "sk_test_… and pk_live_… in the docs",
      "STRIPE_API_KEY: sk_live_fake",
      "re_x and whsec_x",
      `NEXT_PUBLIC_STRIPE_KEY=${key("pk_test_")}`,
      `XAKIA${"ABCDEFGHIJKLMNOP"}`,
      `AKIA${"ABCDEFGHIJKLMNOPQ"}`,
      "pnpm-lock: sha512-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij==",
    ]) {
      expect(kinds(text), text).toEqual([]);
    }
  });

  it("lets the allowed fakes through, and only those", () => {
    const [fake] = [...ALLOWED_FAKE_KEYS];
    expect(fake).toBeDefined();
    expect(kinds(`STRIPE_API_KEY=${fake}`)).toEqual([]);
    expect(kinds(`STRIPE_API_KEY=${fake}1`)).toEqual(["stripe-secret"]);
  });

  it("never puts the key into what it prints", () => {
    const secret = key("sk_live_");
    const lines = describeFindings(findKeys("apps/backend/.env", `STRIPE_API_KEY=${secret}`));
    expect(lines).toEqual(["apps/backend/.env:1: a Stripe secret key (stripe-secret)"]);
    expect(lines.join()).not.toContain(secret.slice(8));
  });
});

describe("isBinary", () => {
  it("is a NUL byte in the first 8 KB", () => {
    expect(isBinary(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00]))).toBe(true);
    expect(isBinary(new TextEncoder().encode("plain text"))).toBe(false);
  });
});
