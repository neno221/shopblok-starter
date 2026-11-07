// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `cart` family's entry file: what
// `@shopblok/ui/templates/cart` reaches. It draws the member of the page's `variant` (the
// `templates` global's pick), each in its own file in `./cart/` (`default.tsx`, M3's, is the
// first; T85 adds `table`, `sticky-summary` and `focused`, their shared parts in `parts.tsx`), so a
// page passes the `variant` it read and nothing else changes. A value the family does not have
// draws the first (`pickVariant`).
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  CartDefault,
  cartCopy,
  cartIds,
  type CartCopy,
  type CartError,
  type CartTemplateProps,
} from "./cart/default";
import { CartFocused } from "./cart/focused";
import { CartStickySummary } from "./cart/sticky-summary";
import { CartTable } from "./cart/table";

const MEMBERS: Members<"cart", (props: CartTemplateProps) => React.ReactNode> = {
  default: CartDefault,
  table: CartTable,
  "sticky-summary": CartStickySummary,
  focused: CartFocused,
};

function CartTemplate(props: CartTemplateProps) {
  const Member = pickVariant("cart", MEMBERS, props.variant);
  return <Member {...props} />;
}

export { CartTemplate, cartCopy, cartIds };
export type { CartCopy, CartError, CartTemplateProps };
