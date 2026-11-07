// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99, D101). The
// `express-rail` checkout: M3's layout with a rail above the first step for the express payment
// buttons a provider fills (`slots.express`: M6's Stripe). Until one does, the shop passes nothing
// and the rail is not drawn, so the page is the default's with this root's `data-variant`; the
// design system fills it with its fixtures. The rail ends with "Or continue below", so the steps
// read as the other way to pay. A server component.
import { CheckoutSteps } from "@shopblok/ui/organisms/checkout-steps";
import { CheckoutRoot, CheckoutStepContent, type CheckoutTemplateProps } from "./parts";

function CheckoutExpressRail(props: CheckoutTemplateProps) {
  const { checkout, step, copy, locale, prefetch, mainId = "main", as, className, slots } = props;
  const words = copy.page.express;
  const express = step.kind === "contact" ? slots?.express : undefined;
  return (
    <CheckoutRoot
      variant="express-rail"
      step={step.kind}
      mainId={mainId}
      as={as}
      className={className}
    >
      <CheckoutSteps {...checkout} copy={copy.frame} locale={locale} prefetch={prefetch}>
        {express === undefined || express === null ? null : (
          <section
            data-slot="checkout-express"
            aria-labelledby={`${mainId}-express-title`}
            className="flex min-w-0 flex-col gap-3 rounded-xl border p-4"
          >
            <h3
              id={`${mainId}-express-title`}
              className="text-base leading-snug font-semibold wrap-anywhere"
            >
              {words.title}
            </h3>
            <div
              data-slot="checkout-express-buttons"
              className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]"
            >
              {express}
            </div>
            <p
              data-slot="checkout-express-or"
              className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border"
            >
              <span className="min-w-0 shrink wrap-anywhere">{words.or}</span>
            </p>
          </section>
        )}
        <CheckoutStepContent {...props} />
      </CheckoutSteps>
    </CheckoutRoot>
  );
}

export { CheckoutExpressRail };
