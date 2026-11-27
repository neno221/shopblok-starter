import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TAINT_PROBE_VALUE } from "../../../../lib/e2e/taint-probe";
import { e2eRoutesEnabled } from "../../../../lib/env";
import { getCustomer } from "../../../../lib/medusa/customer";
import { taintSecret } from "../../../../lib/security/taint";
import { TaintProbe } from "./probe";

// Test-only (404 unless E2E_TEST_ROUTES=true): React's taint guard (SPEC §11.1, `experimental.taint`
// in `next.config.ts`; `lib/security/taint.ts`), for `e2e/taint.spec.ts` and `auth.spec.ts`.
// `?leak=` names what the page hands to a Client Component: `secret` a value tainted as
// `lib/env.ts` taints a server secret (`taintSecret`), but made for the probe, so no real secret is
// ever handed over, whatever the guard does (PR 158 review, item 1); `customer` the signed-in
// customer as `lib/medusa/customer.ts` reads it; `id` and `email` one of its fields alone, which
// may pass; anything else a plain string. The first two must fail on the server (the market's
// error page), with nothing of either in the answer.
const PROBE = taintSecret("E2E_TAINT_PROBE", TAINT_PROBE_VALUE);

export const instant = false;
export default async function E2eTaintPage({ searchParams }: PageProps<"/[market]/e2e-taint">) {
  await connection();
  if (!e2eRoutesEnabled()) notFound();
  const { leak } = await searchParams;
  if (leak === "secret") return <TaintProbe value={PROBE} />;
  if (leak === "customer" || leak === "id" || leak === "email") {
    const customer = await getCustomer();
    if (customer === null) notFound();
    const value = leak === "id" ? customer.id : leak === "email" ? customer.email : customer;
    return <TaintProbe value={value} />;
  }
  return <TaintProbe value="nothing tainted" />;
}
