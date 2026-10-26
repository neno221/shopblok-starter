import { respondWithCart } from "../../../../lib/e2e/cart";

// Test-only (404 unless E2E_TEST_ROUTES=true): the visitor's cart with one variant (T48's shell.spec.ts).
export const POST = (request: Request) => respondWithCart(request);
