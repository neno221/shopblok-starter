import { notFound } from "next/navigation";
import { connection } from "next/server";
import { e2eRoutesEnabled, env } from "../../../../lib/env";
import { getCustomer } from "../../../../lib/medusa/customer";
import { TaintProbe } from "./probe";

// Test-only (404 unless E2E_TEST_ROUTES=true): React's taint guard (SPEC §11.1, `experimental.taint`
// in `next.config.ts`; `lib/security/taint.ts`), for `e2e/taint.spec.ts`. `?leak=` names what the
// page hands to a Client Component: `secret` the signing secret as `lib/env.ts` reads it, `customer`
// the signed-in customer as `lib/medusa/customer.ts` reads it, `email` that customer's e-mail alone
// (a field, which may pass), and anything else a plain string. The first two must fail on the
// server (the market's error page), with neither value in the answer.
export const instant = false;
export default async function E2eTaintPage({ searchParams }: PageProps<"/[market]/e2e-taint">) {
  await connection();
  if (!e2eRoutesEnabled()) notFound();
  const { leak } = await searchParams;
  if (leak === "secret") return <TaintProbe value={env.STOREFRONT_SIGNING_SECRET} />;
  if (leak === "customer" || leak === "email") {
    const customer = await getCustomer();
    if (customer === null) notFound();
    return <TaintProbe value={leak === "email" ? customer.email : customer} />;
  }
  return <TaintProbe value="nothing tainted" />;
}
