import { describe, expect, it } from "vitest";
import { ALLOWED_FAKE_KEYS, describeFindings, findKeys, isBinary, maskKeys } from "./no-keys.ts";

// The keys below are built from parts, so this file itself never holds one for `pnpm check:keys`
// to find (but the allowed fake, which it must let through).
const fill = (n: number, chars = "aB3dE5gH7jK9mN1pQ") => chars.repeat(4).slice(0, n);
const key = (prefix: string, n = 24) => `${prefix}${fill(n)}`;

const hex = (n: number) => "0123456789abcdef".repeat(8).slice(0, n);
const kinds = (text: string) => findKeys("f.ts", text).map((f) => f.kind);

describe("findKeys", () => {
  it("finds each kind of key at its real length", () => {
    expect(kinds(`STRIPE_API_KEY=${key("sk_test_")}`)).toEqual(["stripe-secret"]);
    expect(kinds(`STRIPE_API_KEY=${key("sk_live_")}`)).toEqual(["stripe-secret"]);
    expect(kinds(`const k = "${key("rk_live_")}";`)).toEqual(["stripe-restricted"]);
    expect(kinds(`NEXT_PUBLIC_STRIPE_KEY=${key("pk_live_")}`)).toEqual(["stripe-publishable-live"]);
    expect(kinds(`STRIPE_WEBHOOK_SECRET=${key("whsec_", 32)}`)).toEqual(["stripe-webhook"]);
    expect(kinds(`RESEND_API_KEY=re_${fill(8)}_${fill(24)}`)).toEqual(["resend"]);
    // T97: a PostHog personal key; the project key (public) is not one.
    expect(kinds(`POSTHOG_PERSONAL=phx_${fill(40)}`)).toEqual(["posthog-personal"]);
    expect(kinds(`NEXT_PUBLIC_POSTHOG_KEY=phc_${fill(40)}`)).toEqual([]);
    expect(kinds(`id: ${"AKIA"}${"ABCDEFGHIJKLMNOP"}`)).toEqual(["aws-access-key"]);
    expect(kinds(`S3_SECRET_ACCESS_KEY=${hex(64)}`)).toEqual(["s3-key"]);
    expect(kinds(`  S3_ACCESS_KEY_ID: "${hex(32)}"`)).toEqual(["s3-key"]);
  });

  it("finds R2's hex keys only as the value of their own names", () => {
    for (const text of [
      "S3_SECRET_ACCESS_KEY=",
      "S3_ACCESS_KEY_ID=",
      "S3_ACCESS_KEY_ID: ${{ secrets.S3_ACCESS_KEY_ID }}",
      `checksum=${hex(64)}`,
      `MY_S3_SECRET_ACCESS_KEY=${hex(64)}`,
      `S3_SECRET_ACCESS_KEY=${hex(12)}`,
    ]) {
      expect(kinds(text), text).toEqual([]);
    }
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

describe("maskKeys", () => {
  it("masks every key-shaped string and every given value, and nothing else", () => {
    const stripe = key("sk_test_");
    const dsn = "https://abc123def456@o1.ingest.de.sentry.io/42";
    const text = `start STRIPE_API_KEY=${stripe}\nSentry ${dsn} ready\nkey re_${fill(8)}_${fill(24)} ok`;
    expect(maskKeys(text, [dsn, "", "short"])).toBe(
      "start STRIPE_API_KEY=***\nSentry *** ready\nkey *** ok",
    );
  });

  it("masks R2's key but keeps its name", () => {
    expect(maskKeys(`S3_SECRET_ACCESS_KEY=${hex(64)} ok`)).toBe("S3_SECRET_ACCESS_KEY=*** ok");
  });

  it("masks a value that holds a key-shaped part as a whole", () => {
    const value = `prefix-${key("whsec_")}`;
    expect(maskKeys(`a ${value} b`, [value])).toBe("a *** b");
  });
});
