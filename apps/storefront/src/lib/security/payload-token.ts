import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// M7 D148 (4), T111: Payload's sign-in cookie checked without Payload, for the proxy's design-system
// gate. Payload cannot be loaded in the proxy (T11: 550 ms on a process's first request, and
// `proxy-imports.test.ts` refuses it), so this repeats exactly what Payload 3.94.2 does, from its
// source:
//
// - the key: `payload.secret = sha256(config.secret).hex.slice(0, 32)` (`BasePayload.init`), used
//   as the UTF-8 bytes of those 32 hex characters (`new TextEncoder().encode(payload.secret)` in
//   `auth/jwt.ts` and `auth/strategies/jwt.ts`);
// - the token: an HS256 JWT (`jose`'s `SignJWT`) whose protected header carries `authVersion: 1`
//   (`JWT_AUTH_VERSION`, which Payload's verifier requires), with `iat` and `exp` (`iat` plus the
//   collection's `tokenExpiration`, 7200 s by default), and the claims `getFieldsToSign` writes: the
//   fields with `saveToJWT` (`users.role`), `id`, `collection`, `email` and, with `useSessions`
//   (Payload's default since 3.x), `sid`;
// - the cookie: `${cookiePrefix}-token`, `payload-token` by default.
//
// `payload-token.test.ts` signs a token with Payload's own `init` and `jwtSign`, and
// `e2e/ds-gate.spec.ts` checks the cookie a real sign-in sets, so a change in any of this fails a
// test instead of locking the staff out (or letting anyone in).
//
// What it cannot check: the session. Payload also looks the `sid` up in the user's `sessions`
// (removed on sign-out) and reads the user again (a deleted or demoted user fails there). The proxy
// has no database, so a signed-out, demoted or deleted user keeps passing until `exp`, at most two
// hours after the last sign-in or refresh; D148 accepts that for the DS, whose pages hold no customer
// data.

/** Payload's sign-in cookie (`cookiePrefix` is Payload's default, `payload`). */
export const PAYLOAD_TOKEN_COOKIE = "payload-token";

/** Payload's `JWT_AUTH_VERSION`, in every token's protected header. */
export const PAYLOAD_JWT_AUTH_VERSION = 1;

/** The roles of `users` (`payload/collections/users.ts`): both are staff. */
export const STAFF_ROLES: readonly string[] = ["admin", "editor"];

/** The staff collection (`admin.user`); an integration (`integrations`) is never staff. */
export const STAFF_COLLECTION = "users";

/** What a valid staff token says. */
export type StaffToken = {
  id: string | number;
  role: string;
  /** Seconds since the epoch. */
  exp: number;
  /** Payload's session id; present with `useSessions`, and not checkable here. */
  sid?: string;
};

/** The key Payload signs its tokens with, derived from `PAYLOAD_SECRET` as `BasePayload.init` does. */
export function payloadSigningKey(secret: string): Buffer {
  return Buffer.from(createHash("sha256").update(secret).digest("hex").slice(0, 32), "utf8");
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function decodeJson(part: string): Record<string, unknown> | undefined {
  if (!BASE64URL.test(part)) return undefined;
  try {
    const value: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The token's claims when `token` is a Payload token of a staff member, signed with the key Payload
 * derives from `secret` and not expired at `nowSeconds`; `undefined` for anything else: no token or
 * secret, another shape, algorithm or auth version, a wrong signature (compared in constant time),
 * a missing or past `exp`, a `nbf` still ahead, another collection (an integration), or a role that
 * is not staff.
 */
export function verifyStaffToken(
  token: string | undefined,
  secret: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): StaffToken | undefined {
  if (!token || !secret) return undefined;
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  const [headerPart, claimsPart, signaturePart] = parts as [string, string, string];
  const header = decodeJson(headerPart);
  if (header?.["alg"] !== "HS256" || header["authVersion"] !== PAYLOAD_JWT_AUTH_VERSION) {
    return undefined;
  }
  if (!BASE64URL.test(signaturePart)) return undefined;
  const expected = createHmac("sha256", payloadSigningKey(secret))
    .update(`${headerPart}.${claimsPart}`)
    .digest();
  const given = Buffer.from(signaturePart, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
  const claims = decodeJson(claimsPart);
  if (claims === undefined) return undefined;
  const { exp, nbf, id, collection, role, sid } = claims;
  if (typeof exp !== "number" || !Number.isFinite(exp) || exp <= nowSeconds) return undefined;
  if (nbf !== undefined && (typeof nbf !== "number" || nbf > nowSeconds)) return undefined;
  if (typeof id !== "string" && typeof id !== "number") return undefined;
  // The role check (one test for both: a staff collection and a staff role). An integration's
  // token says `collection: "integrations"` and a role such as `medusa-sync`.
  if (!isStaff(collection, role)) return undefined;
  return { id, role: role as string, exp, ...(typeof sid === "string" ? { sid } : {}) };
}

/** A `users` document with a staff role. */
function isStaff(collection: unknown, role: unknown): boolean {
  return collection === STAFF_COLLECTION && typeof role === "string" && STAFF_ROLES.includes(role);
}
