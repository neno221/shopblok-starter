import { visitorResponse } from "../../../lib/visitor/handlers";

// D60: what the httpOnly cookies know about the visitor, for the island (`lib/visitor/source.ts`).
// Under `/next`, which the proxy's matcher skips; per visitor, so `private, no-store`.
export async function GET(request: Request) {
  return visitorResponse(request);
}
