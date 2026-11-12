import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

// Test-only (404 unless E2E_TEST_ROUTES=true, M6 T96): `GET /e2e/throw?marker=…` throws, so that
// the storefront's `e2e/integrations/sentry.spec.ts` sees a Medusa 500 reach Sentry once, through
// the error handler, scrubbed. Read per request: only CI's `integrations-live` sets the flag on the
// backend it starts.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (process.env.E2E_TEST_ROUTES !== 'true') {
    res.status(404).json({ message: 'Not Found' })
    return
  }
  const marker = typeof req.query.marker === 'string' ? req.query.marker : 'none'
  // A plain Error on purpose: Medusa answers it with a 500, which is what the spec needs.
  // eslint-disable-next-line @medusajs/use-medusa-error-not-generic-error
  throw new Error(`e2e: Medusa's test error ${marker}`)
}
