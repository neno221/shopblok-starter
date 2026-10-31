import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { payloadModule, reconcile } from "../../../../lib/payload-sync";

/**
 * Settings → Payload (D75): `GET` answers the last run in this process, `POST` writes every synced
 * document now and answers its counts. Admin session only (the middleware
 * leaves out secret API keys).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payload = payloadModule(req.scope);
  res.json({ configured: payload !== undefined, last_run: payload?.lastRun() ?? null });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const run = await reconcile(req.scope, { kind: "bulk", force: true });
  if (run === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "The Payload sync is off: set PAYLOAD_SERVER_URL and PAYLOAD_API_KEY in apps/backend/.env (`pnpm bootstrap` writes both).",
    );
  }
  res.json({ run });
}
