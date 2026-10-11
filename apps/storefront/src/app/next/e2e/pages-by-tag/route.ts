import { respondWithRead } from "../../../../lib/e2e/handlers";
import { readByTag } from "../../../../lib/e2e/reads";

// Test-only (404 unless E2E_TEST_ROUTES=true): the same read under a tag no hook touches.
export const GET = (request: Request) => respondWithRead(request, readByTag);
