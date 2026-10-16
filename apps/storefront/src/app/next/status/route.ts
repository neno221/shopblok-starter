import { connection } from "next/server";
import { getPayloadClient } from "../../../lib/cms/payload";
import { medusaEnv } from "../../../lib/env";
import { withTimeout } from "../../../lib/with-timeout";

// THROWAWAY spike code (plan M1 §6, S4), variant C: an uptime monitor's answer. Each check gets
// 2 s, and the two run side by side, so the whole answer is in well under 3 s even when one
// dependency is down or accepts connections and never answers.
const CHECK_TIMEOUT_MS = 2000;

type CheckResult = "ok" | "down";

async function checkMedusa(): Promise<void> {
  // A Store API read, not `/health`: measured on Medusa 2.21, `/health` still answers 200 while
  // Medusa's Postgres is stopped (its Store API then gives no answer in 15 s), so it would miss a
  // database outage. This is a plain `fetch` with its own timeout, not the Medusa SDK, so the check
  // does not depend on `medusaRequest`'s 10 s one.
  // A missing or bad setting (the URL or the publishable key) throws an `EnvError`, which still
  // counts as down: the storefront could not read the catalog either.
  const { backendUrl, publishableKey } = await medusaEnv();
  const response = await fetch(`${backendUrl}/store/regions?limit=1&fields=id`, {
    headers: { "x-publishable-api-key": publishableKey },
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    cache: "no-store",
  });
  // Only the status matters; the body is dropped so the connection is not held open.
  await response.body?.cancel();
  if (!response.ok) throw new Error(`Store API answered ${response.status}`);
}

async function checkPayload(): Promise<void> {
  // A real query, not a ping: it goes through the connection pool to the `payload` database.
  const payload = await getPayloadClient();
  await payload.count({ collection: "pages", overrideAccess: true });
}

async function check(name: string, run: () => Promise<void>): Promise<CheckResult> {
  try {
    await withTimeout(run(), CHECK_TIMEOUT_MS);
    return "ok";
  } catch (error) {
    // The reason goes to the server log only: the body is public and names no URL or stack.
    console.warn(`[status] ${name} down:`, error instanceof Error ? error.message : String(error));
    return "down";
  }
}

export async function GET(): Promise<Response> {
  // Without this Next prerenders the handler at build and the answer would never change.
  await connection();
  const [medusa, payload] = await Promise.all([
    check("medusa", checkMedusa),
    check("payload", checkPayload),
  ]);
  const ok = medusa === "ok" && payload === "ok";
  return Response.json(
    { status: ok ? "ok" : "unavailable", checks: { medusa, payload } },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
