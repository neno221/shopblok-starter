// M6 D124 (T97): the shop's events that need more than `track(name, properties)`: what an add to
// the cart sends (the product page's buy box and the quick view), and the sign-up, which the
// server's register action marks with a short cookie for the page it lands on (`VisitorSource`;
// the action ends in a redirect, so the browser that registered learns it there). And the auth
// actions' mark that the visitor changed (`takeMark`).
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

/** Whether the server left the cookie `name` (`=1`) for this page; removes it, so once. */
export function takeMark(name: string): boolean {
  if (typeof document === "undefined") return false;
  const here = document.cookie.split(";").some((part) => part.trim() === `${name}=1`);
  if (here)
    document.cookie = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  return here;
}

/**
 * `signed_up`, once: when the register action left its cookie, it is removed and the event sent
 * (`track` sends it only with consent; the action leaves the cookie only with it).
 */
export function trackSignedUp(): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  if (takeMark(SIGNED_UP_COOKIE)) track("signed_up");
}
