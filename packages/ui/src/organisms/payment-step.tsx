// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, D48). The checkout's
// payment as one plain `<form>` (D48: it posts without JavaScript): a fieldset named "Payment" with
// one radio group (`name="paymentMethod"`), the customer's saved cards first ("Your saved cards":
// the mark, "Visa ending in 4242", the expiry, "Default"; an expired card is there but cannot be
// chosen, and says "Expired 09/2026" in words), then the region's ways to pay as PaymentMethodCards
// ("Other ways to pay" when there are saved cards). With neither, it offers the system payment
// (Medusa's `pp_system_default`, "Pay later"), chosen, so a shop with no provider can still take
// orders. While a way that takes card details is chosen (`kind: "card"`), a box under the group holds
// the slot for Stripe's Payment Element (M6) and, for a customer who may keep a card, "Save this card
// for next time"; the box follows the radio by CSS (`has-[…:checked]`), so it shows before any
// script runs. The chosen way starts from `selected` (or the system payment). `error` is a sentence in
// a polite status region that is always in the form, tied to the fieldset ("Choose how you would like
// to pay."); `status="pending"` holds the submit (`aria-disabled`, `type="button"`, a hidden disabled
// submit first, as AddressForm does). A server component: the choice is the browser's radio state.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type {
  PaymentMethod,
  PaymentStep as PaymentStepContent,
  SavedPaymentMethod,
} from "@shopblok/registry/contracts";
import { Badge } from "@shopblok/ui/atoms/badge";
import { Button } from "@shopblok/ui/atoms/button";
import { PaymentIcon } from "@shopblok/ui/atoms/payment-icon";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { cn } from "@shopblok/ui/lib/utils";
import { PaymentMethodCard } from "@shopblok/ui/molecules/payment-method-card";
import { RadioCard } from "@shopblok/ui/molecules/radio-card";
import { expiryText, isExpired } from "@shopblok/ui/molecules/saved-payment-method-card";
import { CircleAlertIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

/** What went wrong with the last submit: nothing chosen, or the server could not save it. */
type PaymentStepError = "required" | "failed";

type PaymentStepProps = Omit<
  React.ComponentProps<"form">,
  "children" | "action" | "method" | "onSubmit"
> &
  PaymentStepContent & {
    /** The wording: the step's own, PaymentMethodCard's, and the brands' names. */
    copy: {
      step: Messages["organisms"]["paymentStep"];
      method: Messages["molecules"]["paymentMethodCard"];
      brands: Messages["atoms"]["payment"];
    };
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The time to judge a card's expiry by, an ISO timestamp from the caller: never the server's clock. */
    now: string;
    /** What `<form action>` takes: M3's server action, or a URL (the form is then posted). */
    action?: React.ComponentProps<"form">["action"];
    /** Stripe's Payment Element (M6), drawn while a card is chosen. */
    paymentElement?: React.ReactNode;
    status?: "idle" | "pending";
    error?: PaymentStepError;
    /** The submit's words when the page has its own ("Place order"). */
    submitLabel?: string;
  };

/** The system payment: what Medusa offers when a region has no provider. */
const SYSTEM_ID = "pp_system_default";

function PaymentStep({
  saved,
  methods,
  selected,
  canSave,
  saveForLater,
  copy,
  locale,
  now,
  action,
  paymentElement,
  status = "idle",
  error,
  submitLabel,
  className,
  ...props
}: PaymentStepProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const savedId = `${id}-saved`;
  const methodsId = `${id}-methods`;
  const words = copy.step;
  const pending = status === "pending";
  // An expired card is drawn but cannot be chosen, so it is no offer: with only those and no
  // methods, the system payment is the one choice.
  const system = saved.every((card) => isExpired(card, now)) && methods.length === 0;
  const takesCards = methods.some((method) => method.kind === "card");
  const name = "paymentMethod";
  return (
    <form
      data-slot="payment-step"
      action={action}
      method={typeof action === "function" ? undefined : "post"}
      aria-busy={pending ? true : undefined}
      className={cn("group/payment flex min-w-0 flex-col gap-6", className)}
      {...props}
    >
      {/* Enter in a field submits a form; a disabled default button stops it while it is sent. */}
      {pending ? <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" /> : null}
      <fieldset
        data-slot="payment-step-methods"
        aria-describedby={error === undefined ? undefined : errorId}
        aria-invalid={error === "required" ? true : undefined}
        className="flex min-w-0 flex-col gap-4"
      >
        <legend className="mb-3 text-base leading-snug font-semibold wrap-anywhere">
          {words.legend}
        </legend>
        {saved.length === 0 ? null : (
          <div role="group" aria-labelledby={savedId} className="flex min-w-0 flex-col gap-2">
            <p id={savedId} className="text-sm font-medium text-muted-foreground wrap-anywhere">
              {words.saved}
            </p>
            {saved.map((card) => (
              <SavedCardOption
                key={card.id}
                card={card}
                name={name}
                checked={selected === card.id}
                copy={copy}
                locale={locale}
                now={now}
              />
            ))}
          </div>
        )}
        {methods.length === 0 ? null : (
          <div
            role="group"
            aria-labelledby={saved.length === 0 ? undefined : methodsId}
            className="flex min-w-0 flex-col gap-2"
          >
            {saved.length === 0 ? null : (
              <p id={methodsId} className="text-sm font-medium text-muted-foreground wrap-anywhere">
                {words.methods}
              </p>
            )}
            {methods.map((method: PaymentMethod) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                name={name}
                required
                checked={selected === method.id}
                copy={{ card: copy.method, brands: copy.brands }}
                locale={locale}
              />
            ))}
          </div>
        )}
        {system ? <SystemOption name={name} copy={words} /> : null}
      </fieldset>
      {takesCards ? (
        <div
          data-slot="payment-step-details"
          className="hidden min-w-0 flex-col gap-4 rounded-xl border border-dashed p-4 group-has-[[data-kind=card]_input:checked]/payment:flex"
        >
          <p className="text-sm font-medium wrap-anywhere">{words.details}</p>
          {paymentElement}
          {canSave ? (
            <label className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="saveForLater"
                value="true"
                defaultChecked={saveForLater}
                className="size-4 shrink-0 accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring"
              />
              <span className="min-w-0 wrap-anywhere">{words.save}</span>
            </label>
          ) : null}
        </div>
      ) : null}
      <div role="status" aria-live="polite" data-slot="payment-step-status">
        {error === undefined ? null : (
          <p id={errorId} className="flex items-start gap-2 text-sm leading-snug text-destructive">
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">{words.errors[error]}</span>
          </p>
        )}
      </div>
      <Button
        type={pending ? "button" : "submit"}
        size="lg"
        disabled={pending}
        focusableWhenDisabled={pending}
        aria-busy={pending ? true : undefined}
        data-slot="payment-step-submit"
        className="max-w-full self-start aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        {pending ? <Spinner aria-hidden="true" label={words.submitting} /> : null}
        <span className="min-w-0 wrap-anywhere">
          {pending ? words.submitting : (submitLabel ?? words.submit)}
        </span>
      </Button>
    </form>
  );
}

function SavedCardOption({
  card,
  name,
  checked,
  copy,
  locale,
  now,
}: {
  card: SavedPaymentMethod;
  name: string;
  checked: boolean;
  copy: PaymentStepProps["copy"];
  locale: string;
  now: string;
}) {
  const id = useId();
  const expired = isExpired(card, now);
  const brand = copy.brands[card.brand];
  const date = expiryText(card, locale);
  return (
    <RadioCard
      data-kind="saved"
      data-expired={expired ? "" : undefined}
      name={name}
      value={card.id}
      required
      checked={expired ? false : checked}
      disabled={expired}
      labelledBy={`${id}-name`}
      describedBy={`${id}-expiry${card.isDefault ? ` ${id}-default` : ""}`}
    >
      <span className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span id={`${id}-name`} className="min-w-0 flex-1 basis-40 font-medium wrap-break-word">
          {formatMessage(copy.step.card, { brand, last4: card.last4 }, locale)}
        </span>
        <PaymentIcon brand={card.brand} label={brand} size="md" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span
          id={`${id}-expiry`}
          className={cn("flex items-center gap-1.5", expired && "text-destructive")}
        >
          {expired ? <CircleAlertIcon aria-hidden="true" className="size-4 shrink-0" /> : null}
          {formatMessage(expired ? copy.step.expired : copy.step.expires, { date }, locale)}
        </span>
        {card.isDefault ? (
          <Badge id={`${id}-default`} variant="secondary">
            {copy.step.default}
          </Badge>
        ) : null}
      </span>
    </RadioCard>
  );
}

function SystemOption({
  name,
  copy,
}: {
  name: string;
  copy: Messages["organisms"]["paymentStep"];
}) {
  const id = useId();
  return (
    <RadioCard
      data-kind="manual"
      name={name}
      value={SYSTEM_ID}
      checked
      labelledBy={`${id}-name`}
      describedBy={`${id}-text`}
    >
      <span id={`${id}-name`} className="font-medium wrap-break-word">
        {copy.systemName}
      </span>
      <span id={`${id}-text`} className="text-sm text-muted-foreground wrap-break-word">
        {copy.systemText}
      </span>
    </RadioCard>
  );
}

export { PaymentStep, SYSTEM_ID };
export type { PaymentStepError, PaymentStepProps };
