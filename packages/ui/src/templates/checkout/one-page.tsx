// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"; M5 plan §1a, D99, WCAG 2.4.3, 3.3.1).
// The `one-page` checkout: the three steps on one page, each a section with its own heading and
// anchor (`checkoutIds(mainId).step(kind)`). The steps done are summed up (`done`: what each chose)
// with an "Edit" link that opens that step again; the current one is open, with M3's own form and its
// errors where M3 draws them; the steps to come are closed, their headings only. Every step is still
// its own form posting to M3's action, so a change of the delivery never sends the address again;
// each action comes back to this page at the next step's anchor, and focus goes to that step's
// section (the browser's own without scripts, `CheckoutStepFocus` after a navigation by the router).
// The summary is beside the steps as in M3's layout; the stepper is left out, the sections say where
// the shopper is. A server component but for the focus.
import { formatMessage } from "@shopblok/i18n";
import { buttonVariants } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import { AddressCard } from "@shopblok/ui/molecules/address-card";
import { CheckoutSteps } from "@shopblok/ui/organisms/checkout-steps";
import { CheckIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";
import {
  CheckoutFormError,
  CheckoutRoot,
  ContactStep,
  DeliveryStep,
  PaymentLine,
  PlaceOrderForm,
  ShippingMethodLine,
  checkoutIds,
  type CheckoutStepKind,
  type CheckoutTemplateProps,
} from "./parts";
import { CheckoutStepFocus } from "./step-focus";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function CheckoutOnePage(props: CheckoutTemplateProps) {
  const {
    checkout,
    step,
    done,
    copy,
    locale,
    now,
    action,
    errors = {},
    prefetch,
    mainId = "main",
    as,
    className,
  } = props;
  const ids = checkoutIds(mainId);
  const words = copy.page;
  const steps = checkout.steps.steps;
  const currentIndex = steps.findIndex((each) => each.id === step.kind);
  const stepProps = { copy, locale, now, action, errors, prefetch, ids };
  return (
    <CheckoutRoot variant="one-page" step={step.kind} mainId={mainId} as={as} className={className}>
      <CheckoutSteps
        {...checkout}
        copy={copy.frame}
        locale={locale}
        prefetch={prefetch}
        stepper={false}
        section={false}
      >
        <ol role="list" data-slot="checkout-one-page" className="flex min-w-0 flex-col gap-4">
          {steps.map((each, index) => {
            const kind = each.id as CheckoutStepKind;
            const state =
              index < currentIndex ? "done" : index === currentIndex ? "current" : "later";
            const titleId = `${ids.step(kind)}-title`;
            return (
              <li key={kind} className="min-w-0">
                <section
                  id={ids.step(kind)}
                  tabIndex={-1}
                  aria-labelledby={titleId}
                  aria-current={state === "current" ? "step" : undefined}
                  data-slot="checkout-one-page-step"
                  data-state={state}
                  className={cn(
                    "flex min-w-0 scroll-mt-4 flex-col gap-4 rounded-xl border p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring md:p-6",
                    state === "later" && "bg-muted/40",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                        state === "done" && "border-primary bg-primary text-primary-foreground",
                        state === "current" && "border-primary text-primary",
                        state === "later" && "text-muted-foreground",
                      )}
                    >
                      {state === "done" ? <CheckIcon className="size-4" /> : index + 1}
                    </span>
                    <h2
                      id={titleId}
                      className={cn(
                        "min-w-0 flex-1 text-lg leading-snug font-semibold wrap-anywhere",
                        state === "later" && "text-muted-foreground",
                      )}
                    >
                      {each.label}
                    </h2>
                    {state === "done" ? (
                      <EditLink
                        href={editHref(done, kind)}
                        label={words.review.edit}
                        name={formatMessage(words.review.editLabel, { part: each.label }, locale)}
                        prefetch={prefetch}
                      />
                    ) : null}
                  </div>
                  {state === "done" ? (
                    <DoneSummary kind={kind} props={props} />
                  ) : state === "current" ? (
                    <>
                      <CheckoutStepFocus
                        id={ids.step(kind)}
                        token={`${kind}:${JSON.stringify(errors)}`}
                      />
                      <CheckoutFormError error={errors.form} words={words} />
                      {step.kind === "contact" ? (
                        <ContactStep step={step} {...stepProps} />
                      ) : step.kind === "delivery" ? (
                        <DeliveryStep step={step} {...stepProps} />
                      ) : (
                        <div data-slot="checkout-review" className="flex min-w-0 flex-col gap-4">
                          <PlaceOrderForm copy={copy} action={action} />
                        </div>
                      )}
                    </>
                  ) : null}
                </section>
              </li>
            );
          })}
        </ol>
      </CheckoutSteps>
    </CheckoutRoot>
  );
}

/** Where a finished step's "Edit" goes: the step, opened at its anchor. */
function editHref(done: CheckoutTemplateProps["done"], kind: CheckoutStepKind): string {
  if (kind === "contact") return done?.contact?.editHref ?? "#";
  if (kind === "delivery") return done?.delivery?.editHref ?? "#";
  return "#";
}

function EditLink({
  href,
  label,
  name,
  prefetch,
}: {
  href: string;
  label: string;
  name: string;
  prefetch?: boolean | null;
}) {
  return (
    <NextLink
      href={href as LinkHref}
      prefetch={prefetch}
      aria-label={name}
      data-slot="checkout-one-page-edit"
      className={cn(buttonVariants({ variant: "ghost" }), "shrink-0")}
    >
      {label}
    </NextLink>
  );
}

/** What a finished step chose: the e-mail and the address, or the delivery and the payment. */
function DoneSummary({ kind, props }: { kind: CheckoutStepKind; props: CheckoutTemplateProps }) {
  const { done, copy, locale } = props;
  const words = copy.page.review;
  const term = "text-sm leading-snug font-medium text-muted-foreground";
  const detail = "min-w-0 text-sm leading-snug";
  if (kind === "contact" && done?.contact !== undefined)
    return (
      <dl data-slot="checkout-one-page-done" className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <dt className={term}>{words.contact}</dt>
          <dd className={cn(detail, "wrap-anywhere")}>{done.contact.email}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className={term}>{words.shipping}</dt>
          <dd className={detail}>
            <AddressCard
              address={done.contact.shippingAddress}
              copy={copy.addressCard}
              locale={locale}
              className="border-0 p-0"
            />
          </dd>
        </div>
      </dl>
    );
  if (kind === "delivery" && done?.delivery !== undefined)
    return (
      <dl data-slot="checkout-one-page-done" className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <dt className={term}>{words.delivery}</dt>
          <dd className={detail}>
            <ShippingMethodLine method={done.delivery.shippingMethod} copy={copy} locale={locale} />
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <dt className={term}>{words.payment}</dt>
          <dd className={detail}>
            <PaymentLine payment={done.delivery.payment} />
          </dd>
        </div>
      </dl>
    );
  return null;
}

export { CheckoutOnePage };
