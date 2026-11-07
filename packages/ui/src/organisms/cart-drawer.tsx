// Ours (T79, SETUP.md "Variant plumbing (T79)"; D99, D101). The `mini-cart` family's entry file:
// what `@shopblok/ui/organisms/cart-drawer` reaches, what a click on the header's cart opens. It
// draws the member of `variant`, each in its own file in `./mini-cart/` (`drawer.tsx`, T39's
// CartDrawer, is the first; T85's `drawer-picks.tsx` adds the picks under the lines). A value the
// family does not have draws the first (`pickVariant`). `miniCartParts` is the same choice for the
// shop's header island (T85): the server renders the chosen member's parts, and the island draws
// them with the drawer's client part.
import type { VariantOf } from "@shopblok/registry/contracts";
import { pickVariant, type Members } from "@shopblok/ui/lib/variant";
import type * as React from "react";
import type { CartDrawerClientProps } from "./mini-cart/drawer-client";
import {
  cartDrawerParts,
  MiniCartDrawer,
  type CartDrawerProps as MemberProps,
} from "./mini-cart/drawer";
import { cartDrawerPicksParts, MiniCartDrawerPicks } from "./mini-cart/drawer-picks";

type CartDrawerProps = MemberProps & {
  /** The `templates` global's mini cart (D101); none draws the first. */
  variant?: VariantOf<"mini-cart">;
};

const MEMBERS: Members<"mini-cart", (props: MemberProps) => React.ReactNode> = {
  drawer: MiniCartDrawer,
  "drawer-picks": MiniCartDrawerPicks,
};

const PARTS: Members<"mini-cart", (props: MemberProps) => CartDrawerClientProps> = {
  drawer: cartDrawerParts,
  "drawer-picks": cartDrawerPicksParts,
};

function CartDrawer({ variant, ...props }: CartDrawerProps) {
  const Member = pickVariant("mini-cart", MEMBERS, variant);
  return <Member {...props} />;
}

/** The parts of `variant`'s member (the first for a value the family does not have). */
function miniCartParts({ variant, ...props }: CartDrawerProps): CartDrawerClientProps {
  return pickVariant("mini-cart", PARTS, variant)(props);
}

export { CartDrawer, cartDrawerParts, miniCartParts };
export type { CartDrawerProps };
