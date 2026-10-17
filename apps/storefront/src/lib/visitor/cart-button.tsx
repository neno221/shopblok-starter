// D44 (T35): the header's cart as a browser island. A header renders `CartButton` without a count
// unless its page hands it this in the `cart` slot: the same button, with the number of items from
// the visitor store. The server and the first render in the browser draw the placeholder (the
// store's server snapshot is "unknown"), and the number arrives when the store has it, so a
// prerendered page never contains one.
"use client";

import { CartButton, type CartButtonProps } from "@shopblok/ui/organisms/header/cart-button";
import { useVisitor } from "./use-visitor";

export type VisitorCartButtonProps = Omit<CartButtonProps, "count">;

export function VisitorCartButton(props: VisitorCartButtonProps) {
  const visitor = useVisitor();
  return <CartButton {...props} count={visitor === "unknown" ? undefined : visitor.cartCount} />;
}
