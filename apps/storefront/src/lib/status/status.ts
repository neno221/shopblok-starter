import { medusaEnv } from "../env";
import { withTimeout } from "../with-timeout";

// `/next/status` (D58, ADR 0004 reading 5): an uptime monitor's answer, from S4's variant C
// (commit `bbb4045`). Each check gets 2 s and the two run side by side, so the whole answer comes
// in just over 2 s even when a dependency accepts connections and never answers.

/** Each check's budget. `outage.spec.ts` expects the 503 within 2.01 s. */
export const STATUS_CHECK_TIMEOUT_MS = 2_000;

export type CheckResult = "ok" | "down";

export type StatusChecks = {
  medusa: () => Promise<void>;
  payload: () => Promise<void>;
};

/**
 * A Store API read, not `/health`: on Medusa 2.21 `/health` answers 200 while Medusa's Postgres is
 * stopped (S4), so it would miss a database outage. A plain `fetch` with its own timeout rather
 * than the SDK, whose requests wait 10 s. A missing or bad setting throws `EnvError`, which counts
 * as down: the storefront could not read the catalog either.
 */
export async function checkMedusa(): Promise<void> {
  const { backendUrl, publishableKey } = await medusaEnv();
  const response = await fetch(`${backendUrl}/store/regions?limit=1&fields=id`, {
    headers: { "x-publishable-api-key": publishableKey },
    signal: AbortSignal.timeout(STATUS_CHECK_TIMEOUT_MS),
    cache: "no-store",
  });
  // Only the status matters; the body is dropped so the connection is not held open.
  await response.body?.cancel();
  if (!response.ok) throw new Error(`Store API answered ${response.status}`);
}

/** A real query, not a ping: it goes through the pool to the `payload` database. */
export async function checkPayload(): Promise<void> {
  const { getPayloadClient } = await import("../cms/payload");
  const payload = await getPayloadClient();
  await payload.count({ collection: "pages", overrideAccess: true });
}

async function check(name: string, run: () => Promise<void>): Promise<CheckResult> {
  try {
    await withTimeout(run(), STATUS_CHECK_TIMEOUT_MS);
    return "ok";
  } catch (error) {
    // The reason goes to the server log only: the body is public and names no URL or stack.
    console.warn(`[status] ${name} down:`, error instanceof Error ? error.message : String(error));
    return "down";
  }
}

/** 200 when both answer, 503 when either does not; never cached. */
export async function statusResponse(
  checks: StatusChecks = { medusa: checkMedusa, payload: checkPayload },
): Promise<Response> {
  const [medusa, payload] = await Promise.all([
    check("medusa", checks.medusa),
    check("payload", checks.payload),
  ]);
  const ok = medusa === "ok" && payload === "ok";
  return Response.json(
    { status: ok ? "ok" : "unavailable", checks: { medusa, payload } },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
