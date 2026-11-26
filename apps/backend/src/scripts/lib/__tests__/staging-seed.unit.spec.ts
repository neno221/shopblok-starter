import { adminEmail, inviteAction, resultLine, stagingSeedRefusal } from "../staging-seed";

const now = new Date("2026-11-26T12:00:00Z");
const later = "2026-11-27T12:00:00Z";
const earlier = "2026-11-25T12:00:00Z";
const staging = {
  DEPLOY_ENV: "staging",
  NODE_ENV: "production",
  SEED_ADMIN_EMAIL: "Owner@Example.com",
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "onboarding@resend.dev",
};

describe("stagingSeedRefusal (M7 D148, 5)", () => {
  it("runs on staging with an address", () => {
    expect(stagingSeedRefusal(staging)).toBeUndefined();
  });

  it("refuses production, development and a missing address", () => {
    expect(stagingSeedRefusal({ ...staging, DEPLOY_ENV: "production" })).toMatch(/GO-LIVE/);
    expect(stagingSeedRefusal({ NODE_ENV: "development" })).toMatch(/staging only/);
    expect(stagingSeedRefusal({ ...staging, SEED_ADMIN_EMAIL: "not-an-address" })).toMatch(
      /SEED_ADMIN_EMAIL/,
    );
  });

  it("refuses without Resend, which would print the invite's token in the log", () => {
    expect(stagingSeedRefusal({ ...staging, RESEND_API_KEY: "" })).toMatch(/token/);
  });

  it("reads the address trimmed and lowercased", () => {
    expect(adminEmail({ SEED_ADMIN_EMAIL: "  Owner@Example.com " })).toBe("owner@example.com");
  });
});

describe("inviteAction", () => {
  const email = "owner@example.com";

  it("creates an invite on the first run", () => {
    expect(inviteAction({ email, userEmails: [], invites: [], now })).toEqual({ action: "create" });
  });

  it("re-sends the open invite on a second run (the e-mail's idempotency key keeps it to one)", () => {
    const invites = [{ id: "inv_1", email, accepted: false, expires_at: later }];
    expect(inviteAction({ email, userEmails: [], invites, now })).toEqual({
      action: "send",
      inviteId: "inv_1",
    });
  });

  it("refreshes an expired invite, and picks the newest open one", () => {
    const invites = [
      { id: "inv_old", email, accepted: false, expires_at: "2026-11-01T00:00:00Z" },
      { id: "inv_new", email: "OWNER@example.com", accepted: false, expires_at: earlier },
    ];
    expect(inviteAction({ email, userEmails: [], invites, now })).toEqual({
      action: "refresh",
      inviteId: "inv_new",
    });
  });

  it("does nothing once the address is a user, and ignores accepted invites", () => {
    expect(
      inviteAction({ email, userEmails: ["Owner@example.com"], invites: [], now }).action,
    ).toBe("user-exists");
    const accepted = [{ id: "inv_1", email, accepted: true, expires_at: later }];
    expect(inviteAction({ email, userEmails: [], invites: accepted, now }).action).toBe("create");
  });
});

describe("resultLine", () => {
  it("is one JSON line with the outcomes and the public key, and nothing else", () => {
    const line = resultLine({ demo: "seeded", invite: "create", publishableKey: "pk_abc" });
    expect(JSON.parse(line)).toEqual({
      seedStaging: { demo: "seeded", invite: "create", publishableKey: "pk_abc" },
    });
    expect(line).not.toContain("\n");
  });
});
