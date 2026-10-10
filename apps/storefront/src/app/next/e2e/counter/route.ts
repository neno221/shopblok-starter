import { respondWithRuns } from "../../../../lib/e2e/handlers";

// Test-only (404 unless E2E_TEST_ROUTES=true): how often each cached loader really ran.
export const GET = () => respondWithRuns();
