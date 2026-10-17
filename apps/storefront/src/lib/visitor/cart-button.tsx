// D44 (T35): the header's cart as a browser island. A header renders `CartButton` without a count
// unless its page hands it this in the `cart` slot: the same button, with the number of items from
// the visitor store. The server and the first render in the browser draw the placeholder (the
// store's server snapshot is "unknown"), and the number arrives when the store has it, so a
// prerendered page never contains one. The first number the island learns is not news, so it is not
// announced; once the number changes from it, the button's live region says each new one (PR 57
// review).
"use client";

import { CartButton, type CartButtonProps } from "@shopblok/ui/organisms/header/cart-button";
import { useState } from "react";
import { useVisitor } from "./use-visitor";

export type VisitorCartButtonProps = Omit<CartButtonProps, "count" | "announce">;

export function VisitorCartButton(props: VisitorCartButtonProps) {
  const visitor = useVisitor();
  const count = visitor === "unknown" ? undefined : visitor.cartCount;
  // Adjusted while rendering (the React docs' way of following a value), not in an effect.
  const [seen, setSeen] = useState<{ first?: number; changed: boolean }>({ changed: false });
  if (count !== undefined && seen.first === undefined) setSeen({ first: count, changed: false });
  else if (count !== undefined && !seen.changed && count !== seen.first)
    setSeen({ first: seen.first, changed: true });
  return <CartButton {...props} count={count} announce={seen.changed} />;
}
