// Ours (T52, SETUP.md "Cart and checkout (T52)"; D65, SPEC §8.4, SBP layouts/checkout.md). The
// checkout's `<main>`, M3's layout and the `checkout` family's first member: CheckoutSteps (the
// page's one `<h1>`, the stepper, the order summary) around the current step, each step its own page
// and its own plain form, so the checkout posts without scripts and the browser's back walks the
// steps. The steps' content and what the layouts share are in `parts.tsx` (T86). A server component.
import { CheckoutSteps } from "@shopblok/ui/organisms/checkout-steps";
import {
  CheckoutRoot,
  CheckoutStepContent,
  checkoutCopy,
  checkoutIds,
  type CheckoutCopy,
  type CheckoutError,
  type CheckoutErrors,
  type CheckoutTemplateProps,
} from "./parts";

function CheckoutDefault(props: CheckoutTemplateProps) {
  const { checkout, step, copy, locale, prefetch, mainId, as, className } = props;
  return (
    <CheckoutRoot variant="default" step={step.kind} mainId={mainId} as={as} className={className}>
      <CheckoutSteps {...checkout} copy={copy.frame} locale={locale} prefetch={prefetch}>
        <CheckoutStepContent {...props} />
      </CheckoutSteps>
    </CheckoutRoot>
  );
}

export { CheckoutDefault, checkoutCopy, checkoutIds };
export type { CheckoutCopy, CheckoutError, CheckoutErrors, CheckoutTemplateProps };
