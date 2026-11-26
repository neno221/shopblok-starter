import { describe, expect, it } from "vitest";
import {
  seedAdminEmail,
  stagingPayloadSeedRefusal,
  stagingResultLine,
  unusablePassword,
} from "./staging";

// Staging's Production build on Vercel (D132, D133): `VERCEL_ENV=production` with `DEPLOY_ENV`.
const staging = {
  VERCEL_ENV: "production",
  DEPLOY_ENV: "staging",
  NODE_ENV: "production",
  SEED_ADMIN_EMAIL: " Owner@Example.com ",
  PAYLOAD_API_KEY: "payload-key",
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "onboarding@resend.dev",
};

describe("stagingPayloadSeedRefusal (M7 D148, 5)", () => {
  it("runs in staging's Production build", () => {
    expect(stagingPayloadSeedRefusal(staging)).toBeUndefined();
  });

  it("refuses production, development, a preview and a bad DEPLOY_ENV", () => {
    expect(stagingPayloadSeedRefusal({ ...staging, DEPLOY_ENV: "production" })).toMatch(/GO-LIVE/);
    expect(stagingPayloadSeedRefusal({ ...staging, DEPLOY_ENV: "" })).toMatch(/GO-LIVE/);
    expect(stagingPayloadSeedRefusal({ NODE_ENV: "development" })).toMatch(/staging only/);
    expect(stagingPayloadSeedRefusal({ ...staging, VERCEL_ENV: "preview" })).toMatch(/preview/);
    expect(stagingPayloadSeedRefusal({ ...staging, DEPLOY_ENV: "Staging" })).toMatch(/DEPLOY_ENV/);
  });

  it("refuses without an address or the integrations key", () => {
    expect(stagingPayloadSeedRefusal({ ...staging, SEED_ADMIN_EMAIL: "owner" })).toMatch(
      /SEED_ADMIN_EMAIL/,
    );
    expect(stagingPayloadSeedRefusal({ ...staging, PAYLOAD_API_KEY: " " })).toMatch(
      /PAYLOAD_API_KEY/,
    );
  });

  it("refuses without an e-mail adapter, which would print the reset token in the log", () => {
    expect(stagingPayloadSeedRefusal({ ...staging, RESEND_API_KEY: "" })).toMatch(/token/);
    // Mailpit is an adapter: a local check of the seed sends its e-mail there.
    expect(
      stagingPayloadSeedRefusal({ ...staging, RESEND_API_KEY: "", SMTP_HOST: "localhost" }),
    ).toBeUndefined();
  });

  it("reads the address trimmed and lowercased", () => {
    expect(seedAdminEmail(staging)).toBe("owner@example.com");
  });
});

describe("the seed's secrets", () => {
  it("makes a long random password, a new one each time", () => {
    const first = unusablePassword();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(unusablePassword()).not.toBe(first);
  });

  it("prints the outcomes only", () => {
    const line = stagingResultLine({
      admin: "created",
      integration: "created",
      content: { created: 3, updated: 0, unchanged: 1, kept: 0 },
    });
    expect(JSON.parse(line)).toEqual({
      seedStagingPayload: {
        admin: "created",
        integration: "created",
        content: { created: 3, updated: 0, unchanged: 1, kept: 0 },
      },
    });
    expect(line).not.toMatch(/@|payload-key|re_test/);
  });
});
