import { describe, expect, it } from "vitest";
import {
  fingerprint,
  FINGERPRINTS_VARIABLE,
  formatFingerprints,
  generateValue,
  isShared,
  parseFingerprints,
  payloadDatabaseTlsCheck,
  postgresTls,
  secretFingerprintCheck,
  SECRETS,
  secretsOf,
} from "./deploy-secrets.ts";

const SHARED = "a".repeat(64);

/** Both apps' copies of every shared secret, and the fingerprints `staging:secrets` would set. */
function deployed(overrides: Record<string, string> = {}) {
  const values = new Map(
    SECRETS.map((spec) => [spec.name, `${spec.name.toLowerCase()}-${SHARED}`]),
  );
  const prints = new Map(
    SECRETS.filter(isShared).map((spec) => [
      spec.name,
      fingerprint(spec.name, values.get(spec.name)!),
    ]),
  );
  const envOf = (app: "backend" | "storefront") => {
    const env: Record<string, string> = { [FINGERPRINTS_VARIABLE]: formatFingerprints(prints) };
    for (const { spec, variable } of secretsOf(app)) env[variable] = values.get(spec.name)!;
    return { ...env, ...overrides };
  };
  return { backend: envOf("backend"), storefront: envOf("storefront"), values };
}

describe("the secrets' table (D134)", () => {
  it("holds every secret D134 names, each with a rotation rule, and the MFA key alone locks out", () => {
    expect(SECRETS.map((spec) => spec.name)).toEqual([
      "JWT_SECRET",
      "COOKIE_SECRET",
      "PAYLOAD_SECRET",
      "PAYLOAD_API_KEY",
      "REVALIDATE_SECRET",
      "STOREFRONT_SIGNING_SECRET",
      "PREVIEW_SECRET",
      "CRON_SECRET",
      "AUTH_MFA_ENCRYPTION_KEY",
      "MEILI_MASTER_KEY",
    ]);
    expect(SECRETS.filter((spec) => spec.rotation === "lock-out").map((spec) => spec.name)).toEqual(
      ["AUTH_MFA_ENCRYPTION_KEY"],
    );
  });

  it("names the shared ones: both apps hold them, or Meilisearch and the backend", () => {
    expect(SECRETS.filter(isShared).map((spec) => spec.name)).toEqual([
      "PAYLOAD_API_KEY",
      "REVALIDATE_SECRET",
      "STOREFRONT_SIGNING_SECRET",
      "CRON_SECRET",
      "MEILI_MASTER_KEY",
    ]);
    expect(secretsOf("backend").find((s) => s.spec.name === "MEILI_MASTER_KEY")?.variable).toBe(
      "MEILISEARCH_API_KEY",
    );
  });

  it("generates hex of the table's length, a new value each time", () => {
    const [a, b] = [generateValue({ bytes: 32 }), generateValue({ bytes: 32 })];
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("fingerprints", () => {
  it("are 16 hex characters, differ by name for one value, and never contain the value", () => {
    const print = fingerprint("REVALIDATE_SECRET", SHARED);
    expect(print).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprint("CRON_SECRET", SHARED)).not.toBe(print);
    expect(SHARED).not.toContain(print);
  });

  it("round-trip through the variable, in the table's order", () => {
    const prints = new Map([
      ["CRON_SECRET", "0123456789abcdef"],
      ["PAYLOAD_API_KEY", "fedcba9876543210"],
    ]);
    const text = formatFingerprints(prints);
    expect(text).toBe("PAYLOAD_API_KEY:fedcba9876543210,CRON_SECRET:0123456789abcdef");
    expect(parseFingerprints(text)).toEqual(prints);
  });

  it("refuse an entry that is not NAME:hex, without echoing it", () => {
    const parsed = parseFingerprints("CRON_SECRET:a-secret-value");
    expect(typeof parsed).toBe("string");
    expect(parsed).not.toContain("a-secret-value");
  });
});

describe("secretFingerprintCheck (doctor --app)", () => {
  it("is green when each app's shared secrets match", () => {
    const { backend, storefront } = deployed();
    expect(secretFingerprintCheck(backend, "backend", true)?.level).toBe("ok");
    expect(secretFingerprintCheck(storefront, "storefront", true)?.level).toBe("ok");
  });

  it("names a shared secret that differs from its fingerprint, and never prints a value", () => {
    const stale = `stale-${SHARED}`;
    const { storefront } = deployed({ REVALIDATE_SECRET: stale });
    const check = secretFingerprintCheck(storefront, "storefront", true);
    expect(check?.level).toBe("error");
    expect(check?.details).toEqual(["REVALIDATE_SECRET: does not match its fingerprint"]);
    expect(JSON.stringify(check)).not.toContain(stale);
    expect(JSON.stringify(check)).not.toContain(SHARED);
  });

  it("checks the Meilisearch key under the backend's own variable name", () => {
    const { backend } = deployed({ MEILISEARCH_API_KEY: "another" });
    expect(secretFingerprintCheck(backend, "backend", true)?.details).toEqual([
      "MEILISEARCH_API_KEY: does not match its fingerprint",
    ]);
  });

  it("on a deployment, is an error without the fingerprints; elsewhere says nothing", () => {
    expect(secretFingerprintCheck({}, "backend", true)?.level).toBe("error");
    expect(secretFingerprintCheck({}, "backend", false)).toBeUndefined();
  });

  it("is an error for a fingerprinted secret this app lacks, or a set one with no fingerprint on a deployment", () => {
    const { backend } = deployed({ CRON_SECRET: "" });
    expect(secretFingerprintCheck(backend, "backend", true)?.details).toEqual([
      "CRON_SECRET: not set, but fingerprinted",
    ]);
    const unlisted = {
      CRON_SECRET: "x",
      PAYLOAD_API_KEY: "y",
      [FINGERPRINTS_VARIABLE]: `PAYLOAD_API_KEY:${fingerprint("PAYLOAD_API_KEY", "y")}`,
    };
    expect(secretFingerprintCheck(unlisted, "backend", true)?.details).toEqual([
      "CRON_SECRET: set, but has no fingerprint",
    ]);
    expect(secretFingerprintCheck(unlisted, "backend", false)?.level).toBe("ok");
  });
});

describe("Payload's database over TLS (D136, 4)", () => {
  const base = "postgresql://postgres:pw@shortline.proxy.rlwy.net:41234/railway";

  it("reads the sslmode, and never returns the string", () => {
    expect(postgresTls(`${base}?sslmode=require&uselibpqcompat=true`)).toEqual({
      tls: true,
      mode: "require",
      libpq: true,
    });
    expect(postgresTls(`${base}?sslmode=prefer`)).toEqual({ tls: false, mode: "prefer" });
    expect(postgresTls("not a url")).toBe("invalid");
  });

  it("on a deployment, is an error with no sslmode or one that falls back to plain text", () => {
    for (const url of [
      base,
      `${base}?sslmode=disable`,
      `${base}?sslmode=allow`,
      `${base}?sslmode=prefer`,
    ]) {
      const check = payloadDatabaseTlsCheck({ PAYLOAD_DATABASE_URL: url }, true);
      expect(check?.level, url).toBe("error");
      expect(JSON.stringify(check)).not.toContain("pw@");
    }
  });

  it("passes libpq's require and the verifying modes; warns on node-postgres' require", () => {
    const level = (query: string) =>
      payloadDatabaseTlsCheck({ PAYLOAD_DATABASE_URL: `${base}?${query}` }, true)?.level;
    expect(level("sslmode=require&uselibpqcompat=true")).toBe("ok");
    expect(level("sslmode=verify-full")).toBe("ok");
    expect(level("sslmode=no-verify")).toBe("ok");
    expect(level("sslmode=require")).toBe("warn");
  });

  it("says nothing outside a deployment, and is an error for a missing address on one", () => {
    expect(payloadDatabaseTlsCheck({ PAYLOAD_DATABASE_URL: base }, false)).toBeUndefined();
    expect(payloadDatabaseTlsCheck({}, true)?.level).toBe("error");
  });
});
