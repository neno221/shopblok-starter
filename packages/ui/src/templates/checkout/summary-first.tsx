// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99). The `summary-first`
// checkout: the order summary opens the page, a disclosure on a phone (its lines behind
// OrderSummary's toggle, the total always shown) and the first column from `lg`, sticky beside the
// steps. Each step is still M3's page and form. A server component.
import { CheckoutSteps } from "@shopblok/ui/organisms/checkout-steps";
import { CheckoutRoot, CheckoutStepContent, type CheckoutTemplateProps } from "./parts";

function CheckoutSummaryFirst(props: CheckoutTemplateProps) {
  const { checkout, step, copy, locale, prefetch, mainId, as, className } = props;
  return (
    <CheckoutRoot
      variant="summary-first"
      step={step.kind}
      mainId={mainId}
      as={as}
      className={className}
    >
      <CheckoutSteps
        {...checkout}
        copy={copy.frame}
        locale={locale}
        prefetch={prefetch}
        summaryAt="start"
      >
        <CheckoutStepContent {...props} />
      </CheckoutSteps>
    </CheckoutRoot>
  );
}

export { CheckoutSummaryFirst };
