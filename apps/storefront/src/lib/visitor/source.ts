// D60 (T47): the visitor store's source in the shop. A prerendered page holds no visitor's value
// (D44), so after hydration the island asks `/next/visitor`, which reads the httpOnly cookies, and
// hands the answer to the store. Once per page: a later change comes from the action that made it
// (`addToCart` answers the new count, which the caller gives `setCartCount`, and an answer that was
// out meanwhile keeps it). The consent choice is not the server's: the store keeps the one the
// visitor made on this page. A failed request leaves the store "unknown", so the header keeps its
// placeholder rather than showing a wrong 0.
import { getCartCountChanges, getSnapshot, setVisitor, type Visitor } from "./store";

/** Where the island asks. */
export const VISITOR_ROUTE = "/next/visitor";

type VisitorAnswer = Pick<Visitor, "cartCount" | "customer" | "suggestion">;

function isAnswer(body: unknown): body is VisitorAnswer {
  if (typeof body !== "object" || body === null) return false;
  const { cartCount, customer, suggestion } = body as Record<string, unknown>;
  return (
    typeof cartCount === "number" &&
    Number.isInteger(cartCount) &&
    cartCount >= 0 &&
    (customer === null || typeof customer === "object") &&
    (suggestion === null || typeof suggestion === "object")
  );
}

/**
 * Asks for the visitor and fills the store; resolves to whether it did. `market` is the page's
 * market key and `path` its public path (the suggestion links to the same page in the other
 * market). Credentials are the same origin's, so the cookies go with the request.
 */
export async function loadVisitor(
  market: string,
  path: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const url = `${VISITOR_ROUTE}?${new URLSearchParams({ market, path })}`;
  const changes = getCartCountChanges();
  try {
    const response = await fetcher(url, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return false;
    const body: unknown = await response.json();
    if (!isAnswer(body)) return false;
    const known = getSnapshot();
    // An add answered while this request was out knows a newer count than this answer.
    const newer = known !== "unknown" && getCartCountChanges() !== changes;
    setVisitor({
      cartCount: newer ? known.cartCount : body.cartCount,
      consent: known === "unknown" ? null : known.consent,
      customer: body.customer,
      suggestion: body.suggestion,
    });
    return true;
  } catch {
    return false;
  }
}
