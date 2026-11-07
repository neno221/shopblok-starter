// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"). The ids the checkout's steps go by,
// apart from its components: the app's server actions build the `one-page` layout's anchors from
// them, and a module they import puts its client components in every page's first load (D102).
import type { CheckoutPage } from "@shopblok/registry/contracts";

type CheckoutStepKind = CheckoutPage["step"]["kind"];

/**
 * The ids the steps' forms and fields go by, from the root's id; `step(kind)` is the `one-page`
 * layout's section of a step, the anchor its actions come back to (T86).
 */
function checkoutIds(mainId: string) {
  return {
    address: `${mainId}-address`,
    email: `${mainId}-email`,
    emailHint: `${mainId}-email-hint`,
    emailError: `${mainId}-email-error`,
    payment: `${mainId}-payment`,
    shippingError: `${mainId}-shipping-error`,
    step: (kind: CheckoutStepKind) => `${mainId}-step-${kind}`,
  };
}

export { checkoutIds };
export type { CheckoutStepKind };
