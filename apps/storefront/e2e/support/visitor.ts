import { createHmac, randomBytes } from "node:crypto";
import { appEnvOrBlank } from "./app-env";

// M7 D142 (T108): the visitors the suites speak for. The storefront's and Medusa's limits are kept
// at their real values (`rate-limit.spec.ts` checks them), so a whole run from one machine would
// share one bucket and trip them. CI's `next start` (`E2E_TEST_ROUTES=true`, no `DEPLOY_ENV` or
// `VERCEL_ENV`) takes the visitor's address from `x-e2e-client-ip`, so `csp.ts`' fixture gives
// every test, and every context a test opens, an address of its own; the Node helpers that sign
// in (`server.ts`, `medusa-admin.ts`) take a fresh one for each sign-in. A deployment ignores the
// header (`lib/security/client-signature.ts`).

export const VISITOR_HEADER = "x-e2e-client-ip";

/** A random address in 10.0.0.0/8: about 16 million, so two tests of a run almost never share. */
export function freshVisitor(): string {
  const [a, b, c] = randomBytes(3);
  return `10.${a}.${b}.${c}`;
}

/** `{ "x-e2e-client-ip": <a fresh address> }`, for a request or a context of its own. */
export const visitorHeaders = (address: string = freshVisitor()) => ({ [VISITOR_HEADER]: address });

/**
 * `x-shopblok-client` for a call the suite makes to Medusa itself, as the storefront's server
 * would sign it for `address` (`client-signature.ts`; the backend's copy checks it), so Medusa
 * counts that call for a visitor of its own. Nothing without `STOREFRONT_SIGNING_SECRET` (the call
 * is then counted on the machine's address).
 */
export function signedForMedusa(
  method: string,
  path: string,
  address: string = freshVisitor(),
): Record<string, string> {
  const secret = appEnvOrBlank("storefront", "STOREFRONT_SIGNING_SECRET");
  if (secret === "") return {};
  const time = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret)
    .update(["v1", address, String(time), method.toUpperCase(), path].join("\n"))
    .digest("hex");
  return { "x-shopblok-client": `v1;${address};${time};${signature}` };
}
