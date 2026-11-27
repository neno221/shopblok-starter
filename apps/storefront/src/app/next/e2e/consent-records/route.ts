import { consentRecordColumns, consentRecordsTask } from "../../../../lib/e2e/consent-records";

// Test-only (404 unless E2E_TEST_ROUTES=true): the consent records' columns, an aged record, and a
// run of their retention job (T109's consent.spec.ts).
export const GET = () => consentRecordColumns();
export const POST = (request: Request) => consentRecordsTask(request);
