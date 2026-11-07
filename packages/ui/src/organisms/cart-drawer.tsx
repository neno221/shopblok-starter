// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `mini-cart` family's entry file:
// what `@shopblok/ui/organisms/cart-drawer` reaches, what a click on the header's cart opens. It
// draws the member of `variant`, each in its own file in `./mini-cart/` (`drawer.tsx`, T39's
// CartDrawer, is the first; T85 adds `drawer-picks`). A value the family does not have draws the
// first (`pickVariant`).
import type { VariantOf } from "@shopblok/registry/contracts";
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import {
  cartDrawerParts,
  MiniCartDrawer,
  type CartDrawerProps as MemberProps,
} from "./mini-cart/drawer";

type CartDrawerProps = MemberProps & {
  /** The `templates` global's mini cart (D101); none draws the first. */
  variant?: VariantOf<"mini-cart">;
};

const MEMBERS: Members<"mini-cart", (props: MemberProps) => React.ReactNode> = {
  drawer: MiniCartDrawer,
};

function CartDrawer({ variant, ...props }: CartDrawerProps) {
  const Member = pickVariant("mini-cart", MEMBERS, variant);
  return <Member {...props} />;
}

export { CartDrawer, cartDrawerParts };
export type { CartDrawerProps };
