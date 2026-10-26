import { cartResponse } from "../../../lib/visitor/handlers";

// D60: the visitor's cart for the drawer and the quick cart, when they open. `private, no-store`.
export async function GET(request: Request) {
  return cartResponse(request);
}
