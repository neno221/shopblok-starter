import type { PayloadRequest } from "payload";
import { secretMatches } from "../../lib/secret";
import { env } from "../../lib/env";
import { isAdminRequest } from "./roles";

/** `Authorization: Bearer <CRON_SECRET>`, as Vercel Cron sends it (and the development timer). */
function bearerMatches(req: PayloadRequest, secret: string | undefined): boolean {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  return secretMatches(match?.[1], secret);
}

/**
 * Who may run or queue Payload's jobs (D74), scheduled publishing among them: the cron secret, or
 * a `users` admin, and nothing else. Payload's default lets any signed-in principal through, an
 * integration's API key included; a refusal is a 401 on `/api/payload-jobs/run` and
 * `/handle-schedules` (3.92.1). `secret` is a parameter for the tests.
 */
export function cronOrAdmin(secret: () => string | undefined = () => env.CRON_SECRET) {
  return ({ req }: { req: PayloadRequest }): boolean =>
    bearerMatches(req, secret()) || isAdminRequest(req);
}
