import type { Endpoint } from "payload";
import { e2eRoutesEnabled } from "../lib/env";

/**
 * Test-only (404 unless E2E_TEST_ROUTES=true, T96): `GET /api/e2e/throw?marker=…` throws, so that
 * `e2e/integrations/sentry.spec.ts` sees a Payload 500 go through `afterError` to Sentry once,
 * scrubbed. Read per request, as the `/next/e2e` routes' gate does: a deployment is a production
 * build too.
 */
export const e2eThrowEndpoint: Endpoint = {
  path: "/e2e/throw",
  method: "get",
  handler: (req) => {
    if (!e2eRoutesEnabled()) return Response.json({ message: "Not Found" }, { status: 404 });
    const marker = new URL(req.url ?? "http://x/").searchParams.get("marker") ?? "none";
    throw new Error(`e2e: Payload's test error ${marker}`);
  },
};
