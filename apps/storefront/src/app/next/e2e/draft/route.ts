import { respondWithDraftMode } from "../../../../lib/e2e/handlers";

// Test-only (404 unless E2E_TEST_ROUTES=true): Draft Mode on (`?on=1`) or off (`?on=0`).
export const GET = (request: Request) => respondWithDraftMode(request);
