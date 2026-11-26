import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/**
 * M7 D142 (T108): the visitor's address, signed by the storefront's server. Every server-side call
 * the storefront makes to Medusa carries
 *
 *     x-shopblok-client: v1;<address>;<unix seconds>;<HMAC-SHA256, hex>
 *
 * where `<address>` is the visitor's IP address, or `server` for a call with no visitor, and the
 * HMAC (with `STOREFRONT_SIGNING_SECRET`, the same in both apps) is taken over the version, the
 * address, the time, the request's method and its path without the query string, one per line. So
 * a header taken from one call is refused on another path or method, and refused after 60 s. The
 * storefront's copy is `apps/storefront/src/lib/security/client-signature.ts`; both test the same
 * vector (`signature.unit.spec.ts`, `client-signature.test.ts`).
 *
 * Every server call reaches Medusa from the storefront's host, so without the header all visitors
 * would share one counter; a forged, replayed or stale header falls back to the request's own
 * address, never to the address it names.
 */

export const CLIENT_HEADER = "x-shopblok-client";
export const SIGNATURE_VERSION = "v1";
/** How far the header's time may be from Medusa's clock, either way. */
export const SKEW_SECONDS = 60;
/** What a call with no visitor signs as its address. */
export const SERVER_ADDRESS = "server";

export type SignedInput = {
  address: string;
  /** Unix seconds. */
  time: number;
  method: string;
  /** The path without its query string, as the request line has it. */
  path: string;
};

/** The HMAC over one call, hex. */
export function clientSignature(secret: string, input: SignedInput): string {
  return createHmac("sha256", secret)
    .update(
      [SIGNATURE_VERSION, input.address, String(input.time), input.method.toUpperCase(), input.path].join(
        "\n",
      ),
    )
    .digest("hex");
}

/** The whole header for one call (the tests sign with it, as the storefront does). */
export function clientHeader(secret: string, input: SignedInput): string {
  return [SIGNATURE_VERSION, input.address, String(input.time), clientSignature(secret, input)].join(
    ";",
  );
}

/** The path of `originalUrl` (Express keeps the request line's target there), without the query. */
export function requestPath(originalUrl: string): string {
  const query = originalUrl.search(/[?#]/);
  return query === -1 ? originalUrl : originalUrl.slice(0, query);
}

export type Verified = { address: string } | undefined;

/**
 * The address a header names, when its signature holds for this call: the right secret, this
 * method and path, a time within `SKEW_SECONDS`. `undefined` otherwise (no secret, no header, any
 * other shape), and the caller keys on the request's own address.
 */
export function verifyClientHeader(
  header: string | string[] | undefined,
  call: { method: string; path: string },
  secret: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Verified {
  if (secret === undefined || secret.trim() === "" || typeof header !== "string") return undefined;
  if (header.length > 256) return undefined;
  const parts = header.split(";");
  if (parts.length !== 4) return undefined;
  const [version, address, time, signature] = parts as [string, string, string, string];
  if (version !== SIGNATURE_VERSION) return undefined;
  if (address !== SERVER_ADDRESS && isIP(address) === 0) return undefined;
  if (!/^\d{1,12}$/.test(time) || !/^[0-9a-f]{64}$/.test(signature)) return undefined;
  const seconds = Number(time);
  if (Math.abs(nowSeconds - seconds) > SKEW_SECONDS) return undefined;
  const expected = clientSignature(secret.trim(), {
    address,
    time: seconds,
    method: call.method,
    path: call.path,
  });
  const given = Buffer.from(signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return undefined;
  return { address };
}
