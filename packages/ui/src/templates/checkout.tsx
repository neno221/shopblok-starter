// Ours (T52, SETUP.md "Cart and checkout (T52)"; D65, SPEC §8.4, SBP layouts/checkout.md). The
// checkout's `<main>`: CheckoutSteps (the page's one `<h1>`, the stepper, the order summary) around
// the current step, each step its own page and its own plain form, so the checkout posts without
// scripts and the browser's back walks the steps.
// - **Contact and address:** the email field (outside AddressForm's markup but in its form, by the
//   form's id: AddressForm draws its own `<form>`), then AddressForm for the region's countries,
//   "Continue to delivery".
// - **Delivery and payment:** the cart's shipping options as ShippingOptionCards in a fieldset whose
//   radios join PaymentStep's form by its id (one form: the two choices are sent together), then
//   PaymentStep ("Pay later" in M3: Medusa's `pp_system_default`). With no option, what to do
//   instead: change the address.
// - **Review:** the email, the address (AddressCard), the delivery and the payment, each with an
//   "Edit" link back to its step, and the form that places the order.
// An action's failure comes back as `errors` (a field's kind, T34's, or the form's), drawn by the
// step's molecules beside their fields and, for the form, in an alert at the top of the step. A
// server component.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { CheckoutPage } from "@shopblok/registry/contracts";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { Input } from "@shopblok/ui/atoms/input";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { AddressCard } from "@shopblok/ui/molecules/address-card";
import { AddressForm, type AddressFormErrors } from "@shopblok/ui/molecules/address-form";
import { ShippingOptionCard } from "@shopblok/ui/molecules/shipping-option-card";
import { CheckoutSteps } from "@shopblok/ui/organisms/checkout-steps";
import { PaymentStep } from "@shopblok/ui/organisms/payment-step";
import { CircleAlertIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type FormAction = React.ComponentProps<"form">["action"];

type CheckoutCopy = {
  page: Messages["templates"]["checkout"];
  frame: React.ComponentProps<typeof CheckoutSteps>["copy"];
  address: Messages["molecules"]["addressForm"];
  addressCard: Messages["molecules"]["addressCard"];
  shipping: Messages["molecules"]["shippingOptionCard"];
  payment: React.ComponentProps<typeof PaymentStep>["copy"];
};

/** The checkout's words from a whole catalog: its own, the frame's and the steps' molecules'. */
function checkoutCopy(messages: Messages): CheckoutCopy {
  const { atoms, molecules, organisms, templates } = messages;
  return {
    page: templates.checkout,
    frame: {
      steps: organisms.checkoutSteps,
      stepper: molecules.stepper,
      summary: organisms.orderSummary,
      rows: molecules.orderSummaryRow,
    },
    address: molecules.addressForm,
    addressCard: molecules.addressCard,
    shipping: molecules.shippingOptionCard,
    payment: {
      step: organisms.paymentStep,
      method: molecules.paymentMethodCard,
      brands: atoms.payment,
    },
  };
}

/** Why a step's action failed when no field is to blame: each is under `errors` in the copy. */
type CheckoutError = keyof Messages["templates"]["checkout"]["errors"];

/** What a step's action answered: the form's error, and each field's (T34's kinds). */
type CheckoutErrors = {
  form?: CheckoutError;
  email?: keyof Messages["templates"]["checkout"]["contact"]["errors"];
  address?: AddressFormErrors;
  /** No shipping option chosen. */
  shipping?: "required";
  /** No payment chosen, or Medusa refused it. */
  payment?: "required" | "failed";
};

/** The ids the steps' forms and fields go by, from the root's id. */
function checkoutIds(mainId: string) {
  return {
    address: `${mainId}-address`,
    email: `${mainId}-email`,
    emailHint: `${mainId}-email-hint`,
    emailError: `${mainId}-email-error`,
    payment: `${mainId}-payment`,
    shippingError: `${mainId}-shipping-error`,
  };
}

type CheckoutTemplateProps = CheckoutPage & {
  copy: CheckoutCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The time a saved card's expiry is judged by (PaymentStep's), an ISO timestamp. */
  now: string;
  /** The step's form's action: the contact step's, the delivery step's or the order's. */
  action?: FormAction;
  errors?: CheckoutErrors;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

function CheckoutTemplate({
  checkout,
  step,
  copy,
  locale,
  now,
  action,
  errors = {},
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: CheckoutTemplateProps) {
  const ids = checkoutIds(mainId);
  const words = copy.page;
  return (
    <Root
      id={mainId}
      data-slot="checkout-template"
      data-variant="default"
      data-step={step.kind}
      className={cn(
        "mx-auto w-full max-w-7xl min-w-0 px-4 py-8 md:px-6 md:py-12 lg:px-8",
        className,
      )}
    >
      <CheckoutSteps {...checkout} copy={copy.frame} locale={locale} prefetch={prefetch}>
        {errors.form === undefined ? null : (
          <p
            role="alert"
            data-slot="checkout-error"
            className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm leading-snug text-destructive"
          >
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">{words.errors[errors.form]}</span>
          </p>
        )}
        {step.kind === "contact" ? (
          <div data-slot="checkout-contact" className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={ids.email} className="text-sm leading-snug font-medium">
                {words.contact.email}
              </label>
              <Input
                id={ids.email}
                form={ids.address}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                required
                defaultValue={step.email}
                aria-invalid={errors.email === undefined ? undefined : true}
                aria-describedby={
                  errors.email === undefined ? ids.emailHint : `${ids.emailError} ${ids.emailHint}`
                }
              />
              {errors.email === undefined ? null : (
                <p
                  id={ids.emailError}
                  data-slot="checkout-email-error"
                  className="flex items-start gap-1.5 text-sm leading-snug text-destructive"
                >
                  <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 wrap-break-word">
                    {words.contact.errors[errors.email]}
                  </span>
                </p>
              )}
              <p id={ids.emailHint} className="text-sm leading-snug text-muted-foreground">
                {words.contact.emailHint}
              </p>
            </div>
            <AddressForm
              id={ids.address}
              {...step.address}
              copy={copy.address}
              locale={locale}
              action={action}
              section="shipping"
              errors={errors.address}
              submitLabel={words.contact.submit}
            />
          </div>
        ) : step.kind === "delivery" ? (
          step.options.length === 0 ? (
            <div
              data-slot="checkout-no-delivery"
              className="flex min-w-0 flex-col items-start gap-3 rounded-xl border p-4"
            >
              <p className="font-medium wrap-break-word">{words.delivery.none.title}</p>
              <p className="text-sm text-muted-foreground wrap-break-word">
                {words.delivery.none.text}
              </p>
              <NextLink
                href={step.addressHref as LinkHref}
                prefetch={prefetch}
                className={cn(buttonVariants({ variant: "outline" }), "max-w-full")}
              >
                {words.delivery.none.back}
              </NextLink>
            </div>
          ) : (
            <div data-slot="checkout-delivery" className="flex min-w-0 flex-col gap-6">
              <fieldset
                data-slot="checkout-shipping"
                aria-describedby={errors.shipping === undefined ? undefined : ids.shippingError}
                aria-invalid={errors.shipping === undefined ? undefined : true}
                className="flex min-w-0 flex-col gap-2"
              >
                <legend className="mb-3 text-base leading-snug font-semibold wrap-anywhere">
                  {words.delivery.legend}
                </legend>
                {step.options.map((option) => (
                  <ShippingOptionCard
                    key={option.id}
                    option={option}
                    copy={copy.shipping}
                    locale={locale}
                    name="shippingOption"
                    form={ids.payment}
                    required
                    defaultChecked={
                      step.selected === option.id ||
                      (step.selected === undefined && step.options.length === 1)
                    }
                  />
                ))}
                {errors.shipping === undefined ? null : (
                  <p
                    id={ids.shippingError}
                    className="flex items-start gap-1.5 text-sm leading-snug text-destructive"
                  >
                    <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 wrap-break-word">{words.delivery.required}</span>
                  </p>
                )}
              </fieldset>
              <PaymentStep
                id={ids.payment}
                {...step.payment}
                copy={copy.payment}
                locale={locale}
                now={now}
                action={action}
                error={errors.payment}
              />
            </div>
          )
        ) : (
          <div data-slot="checkout-review" className="flex min-w-0 flex-col gap-6">
            <ReviewPart
              title={words.review.contact}
              edit={{ label: words.review.edit, name: words.review.editLabel }}
              href={step.editHrefs.contact}
              locale={locale}
              prefetch={prefetch}
            >
              <p className="wrap-anywhere">{step.email}</p>
            </ReviewPart>
            <ReviewPart
              title={words.review.shipping}
              edit={{ label: words.review.edit, name: words.review.editLabel }}
              href={step.editHrefs.contact}
              locale={locale}
              prefetch={prefetch}
            >
              <AddressCard
                address={step.shippingAddress}
                copy={copy.addressCard}
                locale={locale}
                className="border-0 p-0"
              />
            </ReviewPart>
            <ReviewPart
              title={words.review.delivery}
              edit={{ label: words.review.edit, name: words.review.editLabel }}
              href={step.editHrefs.delivery}
              locale={locale}
              prefetch={prefetch}
            >
              <p className="flex flex-wrap justify-between gap-x-3">
                <span className="wrap-anywhere">{step.shippingMethod.name}</span>
                {step.shippingMethod.price.amount === 0 ? (
                  <span className="text-success">{copy.shipping.free}</span>
                ) : (
                  <Price
                    amount={step.shippingMethod.price.amount}
                    currency={step.shippingMethod.price.currencyCode}
                    locale={locale}
                  />
                )}
              </p>
            </ReviewPart>
            <ReviewPart
              title={words.review.payment}
              edit={{ label: words.review.edit, name: words.review.editLabel }}
              href={step.editHrefs.delivery}
              locale={locale}
              prefetch={prefetch}
            >
              <p className="wrap-anywhere">
                {step.payment.name ?? step.payment.brand ?? ""}
                {step.payment.last4 === undefined ? null : ` •••• ${step.payment.last4}`}
              </p>
            </ReviewPart>
            <form
              data-slot="checkout-place-order"
              action={action}
              method={typeof action === "function" ? undefined : "post"}
              className="flex min-w-0 flex-col gap-3"
            >
              <p className="text-sm leading-snug text-muted-foreground">{words.review.note}</p>
              <Button type="submit" size="lg" className="w-full max-w-full md:w-auto md:self-start">
                {words.review.place}
              </Button>
            </form>
          </div>
        )}
      </CheckoutSteps>
    </Root>
  );
}

/** One part of the review: its heading, what was chosen, and the link back to its step. */
function ReviewPart({
  title,
  edit,
  href,
  locale,
  prefetch,
  children,
}: {
  title: string;
  edit: { label: string; name: string };
  href: string;
  locale: string;
  prefetch?: boolean | null;
  children: React.ReactNode;
}) {
  return (
    <section
      data-slot="checkout-review-part"
      className="flex min-w-0 flex-col gap-2 border-b pb-4 last-of-type:border-b-0"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="text-base leading-snug font-semibold wrap-anywhere">{title}</h3>
        <NextLink
          href={href as LinkHref}
          prefetch={prefetch}
          aria-label={formatMessage(edit.name, { part: title }, locale)}
          data-slot="checkout-review-edit"
          className={cn(buttonVariants({ variant: "ghost" }), "shrink-0")}
        >
          {edit.label}
        </NextLink>
      </div>
      <div className="min-w-0 text-sm leading-snug">{children}</div>
    </section>
  );
}

export { CheckoutTemplate, checkoutCopy, checkoutIds };
export type { CheckoutCopy, CheckoutError, CheckoutErrors, CheckoutTemplateProps };
