// M7 D138 (T106), D139 (T107): the policies as the proxy sends them. `next.config.ts` computes them
// when `next build` (or `next dev`) starts and writes them into the bundles (`SHOPBLOK_CSP_HEADER`,
// `SHOPBLOK_CSP_POLICY`, `SHOPBLOK_CSP_NONCE_POLICY`), so the proxy sends exactly what `headers()`
// sends on the paths it skips. Outside a Next bundle (Vitest) they are unset and the policies are
// computed from the environment as `next.config.ts` would.
import { env } from "../env";
import {
  CSP_HEADER,
  NONCE_PLACEHOLDER,
  cspSettings,
  withNonce,
  type CspHeaderName,
  type CspSettings,
} from "./csp";

const HEADER_NAMES: readonly string[] = Object.values(CSP_HEADER);

type ProxyCsp = Pick<CspSettings, "header" | "policy" | "noncePolicy">;

export function staticCsp(): ProxyCsp {
  const header = env.SHOPBLOK_CSP_HEADER;
  const policy = env.SHOPBLOK_CSP_POLICY;
  const noncePolicy = env.SHOPBLOK_CSP_NONCE_POLICY;
  const frozen =
    header !== undefined && HEADER_NAMES.includes(header) && policy
      ? { header: header as CspHeaderName, policy }
      : undefined;
  if (frozen !== undefined && noncePolicy?.includes(NONCE_PLACEHOLDER)) {
    return { ...frozen, noncePolicy };
  }
  const computed = cspSettings(
    {
      CSP_MODE: env.CSP_MODE,
      NEXT_PUBLIC_BASE_URL: env.NEXT_PUBLIC_BASE_URL,
      NEXT_PUBLIC_STRIPE_KEY: process.env.NEXT_PUBLIC_STRIPE_KEY,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
    },
    env.NODE_ENV === "development",
  );
  // A build's frozen header and policy are kept even if its nonce template is missing, so the
  // proxy and `headers()` never disagree on the mode (PR 151's review, item 5).
  if (frozen !== undefined) return { ...frozen, noncePolicy: computed.noncePolicy };
  return { header: computed.header, policy: computed.policy, noncePolicy: computed.noncePolicy };
}

/** The response with the static policy on it (the proxy's every answer but the nonce routes'). */
export function withStaticCsp<R extends { headers: Headers }>(response: R): R {
  const { header, policy } = staticCsp();
  response.headers.set(header, policy);
  return response;
}

/** The nonce policy (D139) with this request's nonce, under the header `CSP_MODE` picks. */
export function nonceCsp(nonce: string): { header: CspHeaderName; policy: string } {
  const { header, noncePolicy } = staticCsp();
  return { header, policy: withNonce(noncePolicy, nonce) };
}
