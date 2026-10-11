import { respondWithRevalidation } from "../../../../lib/e2e/handlers";

// Test-only (404 unless E2E_TEST_ROUTES=true): `revalidateTag(tag, profile)` from a route handler.
export const POST = (request: Request) => respondWithRevalidation(request);
