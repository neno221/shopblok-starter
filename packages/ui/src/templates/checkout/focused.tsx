// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99). The `focused`
// checkout: one narrow column with no aside, the order summary a bar at its top (a native
// disclosure with the count and the total on it, so it opens without scripts), then the heading, the
// stepper and the step. Each step is still M3's page and form. A server component.
import { CheckoutSteps } from "@shopblok/ui/organisms/checkout-steps";
import { cn } from "@shopblok/ui/lib/utils";
import { CheckoutRoot, CheckoutStepContent, type CheckoutTemplateProps } from "./parts";

function CheckoutFocused(props: CheckoutTemplateProps) {
  const { checkout, step, copy, locale, prefetch, mainId, as, className } = props;
  return (
    <CheckoutRoot
      variant="focused"
      step={step.kind}
      mainId={mainId}
      as={as}
      className={cn("max-w-2xl", className)}
    >
      <CheckoutSteps
        {...checkout}
        copy={copy.frame}
        locale={locale}
        prefetch={prefetch}
        summaryAt="top"
      >
        <CheckoutStepContent {...props} />
      </CheckoutSteps>
    </CheckoutRoot>
  );
}

export { CheckoutFocused };
