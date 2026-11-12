import { sendTestEmail } from "../../../../lib/e2e/email";

// Test-only (404 unless E2E_TEST_ROUTES=true, T98): one e-mail through Payload's adapter, to one of
// Resend's test addresses only, for `e2e/integrations/resend.spec.ts`.
export const POST = (request: Request) => sendTestEmail(request);
