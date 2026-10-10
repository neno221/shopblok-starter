import "server-only";
import { connection } from "next/server";
import { e2eRoutesEnabled } from "../env";

/**
 * The gate of every route under `/next/e2e` (plan T17 step 4). The routes exist to run ADR 0001's
 * checks (cache hits, tag revalidation, draft isolation) against a production build, and a
 * deployment is a production build too, so the build cannot decide: the answer is read per
 * request, after `connection()` has made the handler dynamic (without it Next would prerender the
 * handler and freeze the build's environment into it). Without `E2E_TEST_ROUTES=true`, which only
 * CI's `e2e-smoke` sets on the server it starts, the answer is the same 404 as for a path that does
 * not exist, and nothing is read or revalidated.
 *
 * Returns the response to send, or `null` when the route may run.
 */
export async function e2eGate(): Promise<Response | null> {
  await connection();
  return e2eRoutesEnabled() ? null : new Response("Not Found", { status: 404 });
}
