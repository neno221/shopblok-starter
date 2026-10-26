import { Image } from "@shopblok/ui/atoms/image";
import { Progress } from "@shopblok/ui/atoms/progress";
import { CartLineQuantity } from "@shopblok/ui/molecules/cart-line-quantity";
import { PromoCodeDisclosure } from "@shopblok/ui/molecules/promo-code-disclosure";

// T52: the client components the header's cart islands get from their actions (the drawer's lines,
// its promotion field and free-shipping bar, the quick cart's picture). An action's answer can use
// only a client component the page's own server tree imports ("Could not find the module … in the
// React Client Manifest" otherwise; see `suggestion-banner.tsx`), and a page without a cart of its
// own imports none of these, so the header imports them here. Draws nothing.
const PARTS = [Image, Progress, CartLineQuantity, PromoCodeDisclosure];

export function CartIslandParts() {
  return PARTS.length > 0 ? null : null;
}
