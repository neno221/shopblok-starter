import { respondWithRead } from "../../../../lib/e2e/handlers";
import { readForPreview } from "../../../../lib/e2e/reads";

// Test-only (404 unless E2E_TEST_ROUTES=true): the draft-aware read, for the draft-isolation test.
export const GET = (request: Request) => respondWithRead(request, readForPreview);
