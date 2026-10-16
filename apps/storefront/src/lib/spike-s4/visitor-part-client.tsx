"use client";

import { useEffect, useState } from "react";

// THROWAWAY spike code (plan M1 §6, S4), variant B4: a per-visitor part read in the browser only,
// the pattern the `ensureStatic` doc names for Client Components. No server request-time API is
// used: the prerender holds "…", and `document.cookie` is read in an effect after hydration. This
// measures whether the same part that fails in B3 passes `ensureStatic = "navigation"` this way.
export function VisitorPartClient() {
  const [hasCart, setHasCart] = useState<boolean | null>(null);

  useEffect(() => {
    // The spike asks for exactly this shape (effect, then state), so the lint rule that prefers
    // `useSyncExternalStore` is switched off for this one line.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasCart(
      document.cookie.split("; ").some((pair) => pair.split("=")[0] === "_medusa_cart_id"),
    );
  }, []);

  return (
    <p data-testid="visitor-part">cart cookie: {hasCart === null ? "…" : hasCart ? "yes" : "no"}</p>
  );
}
