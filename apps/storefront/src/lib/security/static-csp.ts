// M7 D138 (T106): the static policy as the proxy sends it. `next.config.ts` computes it when
// `next build` (or `next dev`) starts and writes it into the bundles (`SHOPBLOK_CSP_HEADER`,
// `SHOPBLOK_CSP_POLICY`), so the proxy sends exactly what `headers()` sends on the paths it skips.
// Outside a Next bundle (Vitest) the two are unset and the policy is computed from the environment
// as `next.config.ts` would.
import { env } from "../env";
import { CSP_HEADER, cspSettings, type CspHeaderName, type CspSettings } from "./csp";

const HEADER_NAMES: readonly string[] = Object.values(CSP_HEADER);

export function staticCsp(): CspSettings {
  const header = env.SHOPBLOK_CSP_HEADER;
  const policy = env.SHOPBLOK_CSP_POLICY;
  if (header !== undefined && HEADER_NAMES.includes(header) && policy) {
    return { header: header as CspHeaderName, policy };
  }
  return cspSettings(
    {
      CSP_MODE: env.CSP_MODE,
      NEXT_PUBLIC_BASE_URL: env.NEXT_PUBLIC_BASE_URL,
      NEXT_PUBLIC_STRIPE_KEY: process.env.NEXT_PUBLIC_STRIPE_KEY,
      S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
    },
    env.NODE_ENV === "development",
  );
}

/** The response with the static policy on it (the proxy's every answer). */
export function withStaticCsp<R extends { headers: Headers }>(response: R): R {
  const { header, policy } = staticCsp();
  response.headers.set(header, policy);
  return response;
}
