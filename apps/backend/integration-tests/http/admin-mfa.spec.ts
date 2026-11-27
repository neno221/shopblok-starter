/**
 * M7 D146 (T109): Medusa Admin's two-factor sign-in. Medusa 2.23 ships the TOTP and recovery-code
 * providers and their routes (`/auth/mfa/…`); the shop gives it the key (`AUTH_MFA_ENCRYPTION_KEY`)
 * and puts every route that checks a code on `admin-code-check`, 5 per 15 minutes per auth
 * identity. This spec signs an admin up with a real password, enrols TOTP with a code it computes
 * itself (RFC 6238, as an authenticator app would), signs in with a code, and checks a wrong code,
 * the sixth code in 15 minutes (refused even when right) and a recovery code (once). SETUP.md,
 * "Payment secrets, the consent record and MFA (T109)", lists the mutations it catches.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http admin-mfa.spec
 */
import { createHmac } from "node:crypto";

import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";

import { Limiter, setProcessLimiter } from "../../src/lib/rate-limit/limiter";
import { MemoryStore } from "../../src/lib/rate-limit/store";

jest.setTimeout(180_000);

// Read by Medusa's `defineConfig` when the app starts: the TOTP secrets are stored encrypted.
process.env.AUTH_MFA_ENCRYPTION_KEY = "integration-test-mfa-key-0123456789abcdef";

const anyStatus = { validateStatus: () => true };
const PASSWORD = "secret-password-1";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(text: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of text.replace(/=+$/, "").toUpperCase()) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error(`not base32: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** The 6-digit TOTP code for `secret` at `at` (RFC 6238: HMAC-SHA1, 30-second steps). */
function totp(secret: string, at = Date.now()): string {
  const step = Buffer.alloc(8);
  step.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hash = createHmac("sha1", base32Decode(secret)).update(step).digest();
  const offset = hash[hash.length - 1]! & 0xf;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/** A code no step in Medusa's window (one step either side) accepts. */
function wrongCode(secret: string): string {
  const near = [-30_000, 0, 30_000].map((delta) => totp(secret, Date.now() + delta));
  for (let n = 0; ; n += 1) {
    const code = String((Number(near[1]) + 1 + n) % 1_000_000).padStart(6, "0");
    if (!near.includes(code)) return code;
  }
}

const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` }, ...anyStatus });

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("D146: Medusa Admin's two-factor sign-in", () => {
      let serial = 0;

      beforeEach(() => {
        // A fresh limiter per test: `admin-code-check` keys on the auth identity, and the counters
        // live as long as the app.
        setProcessLimiter(new Limiter(new MemoryStore()));
      });

      afterAll(() => setProcessLimiter(undefined));

      /** An admin with a password, as an invite's acceptance leaves one: the user and its identity. */
      async function admin(): Promise<{ email: string }> {
        serial += 1;
        const email = `mfa-admin-${serial}-${Date.now()}@example.com`;
        const registered = await api.post(
          "/auth/user/emailpass/register",
          { email, password: PASSWORD },
          anyStatus,
        );
        expect(registered.status).toBe(200);
        const user = await getContainer().resolve(Modules.USER).createUsers({ email });
        const auth = getContainer().resolve(Modules.AUTH);
        const [identity] = await auth.listAuthIdentities({
          provider_identities: { entity_id: email, provider: "emailpass" },
        });
        await auth.updateAuthIdentities({ id: identity!.id, app_metadata: { user_id: user.id } });
        return { email };
      }

      const login = async (email: string) => {
        const res = await api.post(
          "/auth/user/emailpass",
          { email, password: PASSWORD },
          anyStatus,
        );
        expect(res.status).toBe(200);
        return res.data as {
          token: string;
          mfa_required?: boolean;
          mfa_challenge?: { id: string; methods: string[] };
        };
      };

      const challenge = (id: string, token: string, method: string, code: string) =>
        api.post(`/auth/mfa/challenges/${id}/verify`, { method, code }, bearer(token));

      /** Signs in, enrols TOTP and makes recovery codes; the secret and the codes. */
      async function enrolled(email: string) {
        const { token } = await login(email);
        const started = await api.post("/auth/mfa/factors", { provider: "totp" }, bearer(token));
        expect(started.status).toBe(200);
        const { secret, mfa_factor } = started.data as {
          secret: string;
          otpauth_url: string;
          mfa_factor: { id: string; status: string };
        };
        expect(mfa_factor.status).not.toBe("enabled");
        const verified = await api.post(
          `/auth/mfa/factors/${mfa_factor.id}/verify`,
          { code: totp(secret) },
          bearer(token),
        );
        expect(verified.status).toBe(200);
        expect(verified.data.mfa_factor.status).toBe("enabled");
        const recovery = await api.post("/auth/mfa/recovery-codes", { count: 2 }, bearer(token));
        expect(recovery.status).toBe(200);
        return {
          secret,
          factorId: mfa_factor.id,
          recovery: recovery.data.recovery_codes as string[],
        };
      }

      it("enrols TOTP, then a sign-in needs the code: the password alone reaches no admin route", async () => {
        const { email } = await admin();
        const { secret } = await enrolled(email);

        const first = await login(email);
        expect(first.mfa_required).toBe(true);
        expect(first.mfa_challenge?.methods).toEqual(
          expect.arrayContaining(["totp", "recovery_code"]),
        );
        expect((await api.get("/admin/users/me", bearer(first.token))).status).toBe(401);

        const passed = await challenge(first.mfa_challenge!.id, first.token, "totp", totp(secret));
        expect(passed.status).toBe(200);
        const me = await api.get("/admin/users/me", bearer(passed.data.token));
        expect(me.status).toBe(200);
        expect(me.data.user.email).toBe(email);
      });

      it("refuses a wrong code, and the sign-in stays without a token", async () => {
        const { email } = await admin();
        const { secret } = await enrolled(email);

        const first = await login(email);
        const refused = await challenge(
          first.mfa_challenge!.id,
          first.token,
          "totp",
          wrongCode(secret),
        );
        expect(refused.status).toBeGreaterThanOrEqual(400);
        expect(refused.status).toBeLessThan(500);
        expect(refused.data.token).toBeUndefined();
        expect((await api.get("/admin/users/me", bearer(first.token))).status).toBe(401);
      });

      it("refuses the 6th code in 15 minutes for one admin, even when it is right", async () => {
        const { email } = await admin();
        const { secret } = await enrolled(email);
        // The enrolment's code counted; start the 15 minutes afresh for the sign-ins.
        setProcessLimiter(new Limiter(new MemoryStore()));

        // Four wrong codes on one challenge (Medusa's own limit is 5 per challenge), the fifth on a
        // second one, so the second challenge could still take the right code.
        const a = await login(email);
        for (let i = 0; i < 4; i += 1) {
          const res = await challenge(a.mfa_challenge!.id, a.token, "totp", wrongCode(secret));
          expect(res.status).not.toBe(429);
        }
        const b = await login(email);
        expect(
          (await challenge(b.mfa_challenge!.id, b.token, "totp", wrongCode(secret))).status,
        ).not.toBe(429);

        const sixth = await challenge(b.mfa_challenge!.id, b.token, "totp", totp(secret));
        expect(sixth.status).toBe(429);
        expect(sixth.headers["retry-after"]).toBe("900");
        expect(sixth.data.token).toBeUndefined();

        // The limiter refused it, not Medusa: with the counter cleared the same code passes.
        setProcessLimiter(new Limiter(new MemoryStore()));
        expect((await challenge(b.mfa_challenge!.id, b.token, "totp", totp(secret))).status).toBe(
          200,
        );
      });

      it("counts the enrolment's code and turning a factor off with the sign-in's", async () => {
        const { email } = await admin();
        const { token } = await login(email);
        const started = await api.post("/auth/mfa/factors", { provider: "totp" }, bearer(token));
        const id = started.data.mfa_factor.id as string;
        const secret = started.data.secret as string;
        for (let i = 0; i < 5; i += 1) {
          const res = await api.post(
            `/auth/mfa/factors/${id}/verify`,
            { code: wrongCode(secret) },
            bearer(token),
          );
          expect(res.status).not.toBe(429);
        }
        const sixth = await api.post(
          `/auth/mfa/factors/${id}/verify`,
          { code: totp(secret) },
          bearer(token),
        );
        expect(sixth.status).toBe(429);
        const off = await api.delete(`/auth/mfa/factors/${id}`, {
          ...bearer(token),
          data: { method: "totp", code: totp(secret) },
        });
        expect(off.status).toBe(429);
      });

      it("takes a recovery code once", async () => {
        const { email } = await admin();
        const { recovery } = await enrolled(email);
        expect(recovery).toHaveLength(2);

        const first = await login(email);
        const used = await challenge(
          first.mfa_challenge!.id,
          first.token,
          "recovery_code",
          recovery[0]!,
        );
        expect(used.status).toBe(200);
        expect((await api.get("/admin/users/me", bearer(used.data.token))).status).toBe(200);

        const again = await login(email);
        const reused = await challenge(
          again.mfa_challenge!.id,
          again.token,
          "recovery_code",
          recovery[0]!,
        );
        expect(reused.status).toBeGreaterThanOrEqual(400);
        expect(reused.status).not.toBe(429);
        expect(reused.data.token).toBeUndefined();
        // The other code still works.
        const other = await challenge(
          again.mfa_challenge!.id,
          again.token,
          "recovery_code",
          recovery[1]!,
        );
        expect(other.status).toBe(200);
      });
    });
  },
});
