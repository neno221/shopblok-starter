// M6 D124 (T97): the shop's events that need more than `track(name, properties)`: what an add to
// the cart sends (the product page's buy box and the quick view), and the sign-up, which the
// server's register action marks with a short cookie for the next page's consent island (the
// action ends in a redirect, so the browser that registered learns it on the page it lands on).
import type { CartLine } from "@shopblok/registry/contracts";
import { SIGNED_UP_COOKIE } from "../cookie-names";
import { track } from "./track";

/** `product_added_to_cart`: the line just added, and how many were added (the form's quantity). */
export function trackAdded(line: CartLine, quantity: FormDataEntryValue | null, source: string) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  const added = Number(quantity);
  track("product_added_to_cart", {
    product_id: line.productId,
    variant_id: line.variantId,
    quantity: Number.isInteger(added) && added > 0 ? added : 1,
    price: line.unitPrice.amount,
    currency: line.unitPrice.currencyCode,
    source,
  });
}

/**
 * `signed_up`, once: when the register action left its cookie, it is removed and the event sent
 * (`track` sends it only with consent; the action leaves the cookie only with it).
 */
export function trackSignedUp(): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (typeof document === "undefined") return;
  const here = document.cookie.split(";").some((part) => part.trim() === `${SIGNED_UP_COOKIE}=1`);
  if (!here) return;
  document.cookie = `${SIGNED_UP_COOKIE}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  track("signed_up");
}
