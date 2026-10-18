// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4). The account's saved
// cards: a list named "Saved payment methods" of SavedPaymentMethodCards (the mark, "Visa ending in
// 4242", the expiry judged against `now`, "Default", and Remove with its confirmation dialog), one or
// two columns by the space there is. A card that is not the default has "Set as default" under it:
// the submit of a small form of its own (`defaultAction`, posting `paymentMethodId`), named for its card
// ("Set as default: Mastercard ending in 4444", the visible words first). A last tile, "Add a payment
// method", links to the page that adds one (M6's Stripe), when the shop can. What is in flight
// (`pending`) holds that card's buttons: the confirmation's Remove says "Removing…" (the card's own
// `status`), the default button is `aria-disabled` and says "Saving…" in a polite region that is
// always there. With no card it is EmptyState, with the add link when there is one. A server
// component but for the card's confirmation, which is the molecule's client part.
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { PaymentMethodsManager as PaymentMethodsManagerContent } from "@shopblok/registry/contracts";
import { Button, buttonVariants } from "@shopblok/ui/atoms/button";
import { Icon } from "@shopblok/ui/atoms/icon";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { cn } from "@shopblok/ui/lib/utils";
import { EmptyState } from "@shopblok/ui/molecules/empty-state";
import { SavedPaymentMethodCard } from "@shopblok/ui/molecules/saved-payment-method-card";
import { CreditCardIcon, PlusIcon } from "lucide-react";
import NextLink from "next/link";
import type * as React from "react";

type FormAction = React.ComponentProps<"form">["action"];

type PaymentMethodsManagerProps = Omit<React.ComponentProps<"div">, "children"> &
  PaymentMethodsManagerContent & {
    /** The wording: the manager's own, SavedPaymentMethodCard's and the brands' names. */
    copy: {
      manager: Messages["organisms"]["paymentMethodsManager"];
      card: Messages["molecules"]["savedPaymentMethodCard"];
      brands: Messages["atoms"]["payment"];
    };
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The time to judge the expiry by, an ISO timestamp from the caller: never the server's clock. */
    now: string;
    /** The list's name when a page has two (the design system's states). */
    label?: string;
    /** What `<form action>` takes to remove a card (it receives `paymentMethodId`). */
    removeAction?: FormAction;
    /** Without JavaScript, the page that asks before a card is removed. */
    removeConfirmHref?: string;
    /** What `<form action>` takes to make a card the default (it receives `paymentMethodId`). None: no button. */
    defaultAction?: FormAction;
    /** What is on its way: a card being removed or made the default. */
    pending?: { paymentMethodId: string; action: "remove" | "default" };
    /** The cards' heading level, and the empty state's. */
    headingLevel?: 2 | 3 | 4;
    /** next/link's `prefetch`; the design system passes `false`. */
    prefetch?: boolean | null;
  };

// `next/link` takes whatever an app with typed routes narrows its `href` to; these are strings the
// app built.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

function PaymentMethodsManager({
  cards,
  addHref,
  copy,
  locale,
  now,
  label,
  removeAction,
  removeConfirmHref,
  defaultAction,
  pending,
  headingLevel = 3,
  prefetch,
  className,
  ...props
}: PaymentMethodsManagerProps) {
  const words = copy.manager;
  if (cards.length === 0)
    return (
      <div
        data-slot="payment-methods-manager"
        data-empty=""
        className={cn("min-w-0", className)}
        {...props}
      >
        <EmptyState
          icon={CreditCardIcon}
          title={words.emptyTitle}
          text={words.emptyText}
          {...(addHref === undefined ? {} : { action: { label: words.add, href: addHref } })}
          headingLevel={headingLevel}
          prefetch={prefetch}
        />
      </div>
    );
  const method = typeof defaultAction === "function" ? undefined : "post";
  return (
    <div
      data-slot="payment-methods-manager"
      className={cn("@container min-w-0", className)}
      {...props}
    >
      <ul
        role="list"
        aria-label={label ?? words.list}
        className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2"
      >
        {cards.map((card) => {
          const removing = pending?.paymentMethodId === card.id && pending.action === "remove";
          const saving = pending?.paymentMethodId === card.id && pending.action === "default";
          const inWords = formatMessage(
            copy.card.card,
            { brand: copy.brands[card.brand], last4: card.last4 },
            locale,
          );
          return (
            <li
              key={card.id}
              data-slot="payment-methods-manager-entry"
              className="flex min-w-0 flex-col gap-2"
            >
              <SavedPaymentMethodCard
                card={card}
                copy={{ card: copy.card, brands: copy.brands }}
                locale={locale}
                now={now}
                headingLevel={headingLevel}
                action={removeAction}
                confirmHref={removeConfirmHref}
                status={removing ? "removing" : undefined}
                className="flex-1"
              />
              {defaultAction === undefined || card.isDefault ? null : (
                <form
                  action={defaultAction}
                  method={method}
                  data-slot="payment-methods-manager-default"
                  className="flex max-w-full"
                >
                  {saving ? (
                    <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" />
                  ) : null}
                  <input type="hidden" name="paymentMethodId" value={card.id} />
                  <Button
                    type={saving ? "button" : "submit"}
                    variant="ghost"
                    disabled={saving}
                    focusableWhenDisabled={saving}
                    aria-busy={saving ? true : undefined}
                    aria-label={
                      saving
                        ? undefined
                        : formatMessage(words.makeDefaultLabel, { card: inWords }, locale)
                    }
                    className="max-w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  >
                    {saving ? <Spinner aria-hidden="true" label={words.saving} /> : null}
                    <span className="min-w-0 wrap-anywhere">
                      {saving ? words.saving : words.makeDefault}
                    </span>
                  </Button>
                  <span role="status" aria-live="polite" className="sr-only">
                    {saving ? words.saving : null}
                  </span>
                </form>
              )}
            </li>
          );
        })}
        {addHref === undefined ? null : (
          <li className="flex min-w-0">
            <NextLink
              href={addHref as LinkHref}
              prefetch={prefetch}
              data-slot="payment-methods-manager-add"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-24 w-full flex-1 border-dashed",
              )}
            >
              <Icon icon={PlusIcon} />
              <span className="min-w-0 wrap-anywhere">{words.add}</span>
            </NextLink>
          </li>
        )}
      </ul>
    </div>
  );
}

export { PaymentMethodsManager };
export type { PaymentMethodsManagerProps };
