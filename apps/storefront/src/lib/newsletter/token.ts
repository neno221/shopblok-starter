import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

// The newsletter's confirmation link (D122, T99): a token signed with a key derived from
// `PAYLOAD_SECRET` (HKDF, its own `info`, so the key signs nothing else Payload signs), holding the
// address, the form, the market, its language, an expiry 48 hours on and a random id. The id is
// what makes it one use: the confirmation records it (`newsletter-confirmations`, unique), so a
// second POST of the same token finds it taken. Nothing in it is secret; it is signed, not
// encrypted, and only its owner's inbox gets it.

/** How long a confirmation link works. */
export const TOKEN_LIFETIME_MS = 48 * 60 * 60 * 1000;

/** What a token says. `exp` is in milliseconds since the epoch. */
export type NewsletterClaims = {
  /** The token's own id (random): the one-use record's key. */
  id: string;
  email: string;
  /** The form the address was typed into (its id), for the submission kept without Resend. */
  form: number;
  /** The market's key (`en-us`), whose page and language the link opens. */
  market: string;
  language: string;
  exp: number;
};

const INFO = "shopblok newsletter confirmation v1";
const SALT = "shopblok";

/** The signing key, from `PAYLOAD_SECRET`; no secret, no key (the caller answers "unavailable"). */
export function tokenKey(secret: string | undefined = process.env.PAYLOAD_SECRET): Buffer {
  if (secret === undefined || secret.trim() === "")
    throw new Error("newsletter: PAYLOAD_SECRET is not set, so no confirmation link can be signed");
  return Buffer.from(hkdfSync("sha256", secret, SALT, INFO, 32));
}

const signature = (key: Buffer, body: string) =>
  createHmac("sha256", key).update(body).digest("base64url");

/** A new token for `claims` (its id and expiry are made here). */
export function signToken(
  claims: Omit<NewsletterClaims, "id" | "exp">,
  key: Buffer,
  now: number = Date.now(),
): { token: string; claims: NewsletterClaims } {
  const full: NewsletterClaims = {
    id: randomBytes(16).toString("base64url"),
    ...claims,
    exp: now + TOKEN_LIFETIME_MS,
  };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return { token: `${body}.${signature(key, body)}`, claims: full };
}

/** The longest token a page or the action reads: an address of 254 characters fits well within. */
export const MAX_TOKEN_LENGTH = 1024;

const isClaims = (value: unknown): value is NewsletterClaims => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["id"] === "string" &&
    typeof v["email"] === "string" &&
    typeof v["form"] === "number" &&
    Number.isInteger(v["form"]) &&
    typeof v["market"] === "string" &&
    typeof v["language"] === "string" &&
    typeof v["exp"] === "number"
  );
};

/**
 * What `token` says when its signature is ours and it has not expired; else `null` (a token cut
 * short, changed, signed with another key, or older than 48 hours).
 */
export function readToken(
  token: unknown,
  key: Buffer,
  now: number = Date.now(),
): NewsletterClaims | null {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return null;
  const [body, signed, ...rest] = token.split(".");
  if (body === undefined || signed === undefined || rest.length > 0 || body === "") return null;
  const expected = Buffer.from(signature(key, body));
  const given = Buffer.from(signed);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isClaims(claims) || claims.exp <= now) return null;
  return claims;
}
