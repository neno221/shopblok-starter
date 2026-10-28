import { schedulePublish } from "../../../../lib/e2e/schedule";

// Test-only (404 unless E2E_TEST_ROUTES=true): queue Payload's `schedulePublish` for a page, as the
// admin's Schedule Publish drawer does.
export const POST = (request: Request) => schedulePublish(request);
