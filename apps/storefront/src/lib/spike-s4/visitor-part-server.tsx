import { cookies } from "next/headers";

// THROWAWAY spike code (plan M1 §6, S4), variant B3: a per-visitor part read on the server, the way
// D36 says to do it for the cart count and the account, i.e. behind `Suspense`. Under
// `ensureStatic = "navigation"` this is EXPECTED to fail `next build` validation, even though it is
// inside `Suspense`: `cookies()` is runtime data. The failure is the measurement.
export async function VisitorPartServer() {
  const store = await cookies();
  return (
    <p data-testid="visitor-part">cart cookie: {store.has("_medusa_cart_id") ? "yes" : "no"}</p>
  );
}
