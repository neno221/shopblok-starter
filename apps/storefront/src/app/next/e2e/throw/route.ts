import { e2eGate } from "../../../../lib/e2e/gate";

// Test-only (404 unless E2E_TEST_ROUTES=true, T96): a route handler that throws, so that
// `e2e/integrations/sentry.spec.ts` can see the server's error reach Sentry once, scrubbed
// (Next hands it to `onRequestError`). `marker` names the error; every other parameter, and the
// request's cookies and headers, are what the scrubber must remove.
export async function GET(request: Request): Promise<Response> {
  const blocked = await e2eGate();
  if (blocked) return blocked;
  const marker = new URL(request.url).searchParams.get("marker") ?? "none";
  throw new Error(`e2e: the storefront's test error ${marker}`);
}
