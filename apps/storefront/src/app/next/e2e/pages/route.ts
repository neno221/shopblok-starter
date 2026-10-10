import { respondWithRead } from "../../../../lib/e2e/handlers";
import { readPublished } from "../../../../lib/e2e/reads";

// Test-only (plan T17 step 4; 404 unless E2E_TEST_ROUTES=true): the published pages, cached under
// the tags a `pages` hook revalidates.
export const GET = (request: Request) => respondWithRead(request, readPublished);
