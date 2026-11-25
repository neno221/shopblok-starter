// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). A card the customer saved, in
// the account's payment methods: the brand's mark, the card in words ("Visa ending in 4242": that
// is the card's name, and the mark beside it is decoration, `aria-hidden`), a "Default" mark, the
// expiry ("Expires 08/2028", month and year as numbers) and the holder's name, and a Remove button
// that asks first. The expiry is judged against the `now` prop, an ISO timestamp the caller gives
// (the fixtures' `fixtureNow` in the design system, D50): never `Date.now()`, which on the server
// would make the page's markup differ from the browser's and between runs. A card is expired from
// the month after its expiry month, in UTC; an expired card says "Expired 09/2026" in words with an
// icon (not colour alone). The contract is strict (no number, no CVV): `last4` is all there is.
// This is the server half: it formats every string and hands them to SavedPaymentMethodRemove, the
// small client part that holds the confirmation dialog (see its header for what Remove does, with and
// without JavaScript). The holder's name wraps; a long one never widens the card. M6 D119 (T101): a
// saved Revolut Pay account is drawn by its name and Revolut's mark, with no expiry and no holder. A
// card of a brand with no mark (Discover, JCB…: brand `card`, PR 142 review item 1) is drawn with a
// plain card (lucide's CreditCard) and named "Card ending in 1117" (`atoms.payment.card`).
import { formatMessage, formatNumber, type Messages } from "@shopblok/i18n";
import type { SavedCardBrand, SavedPaymentMethod } from "@shopblok/registry/contracts";
import { Badge } from "@shopblok/ui/atoms/badge";
import { PaymentIcon } from "@shopblok/ui/atoms/payment-icon";
import { cn } from "@shopblok/ui/lib/utils";
import {
  SavedPaymentMethodRemove,
  type SavedPaymentMethodRemoveProps,
} from "@shopblok/ui/molecules/saved-payment-method-remove";
import { CircleAlertIcon, CreditCardIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type SavedPaymentMethodCardProps = Omit<React.ComponentProps<"article">, "children"> &
  Pick<
    SavedPaymentMethodRemoveProps,
    "action" | "confirmHref" | "status" | "defaultOpen" | "modal" | "popupClassName"
  > & {
    card: SavedPaymentMethod;
    /**
     * The wording: the card's own from `molecules.savedPaymentMethodCard`, and the brands' names from
     * `atoms.payment`.
     */
    copy: {
      card: Messages["molecules"]["savedPaymentMethodCard"];
      brands: Messages["atoms"]["payment"];
    };
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** The time to judge the expiry by, an ISO timestamp from the caller: never the server's clock. */
    now: string;
    /** The level of the card's heading in the page's outline. */
    headingLevel?: HeadingLevel;
  };

/** A saved Revolut Pay account's name (M6 D119): Revolut's product, never translated. */
const REVOLUT_PAY = "Revolut Pay";

/**
 * A saved method's name and mark (M6 D119): a card is "Visa ending in 4242" with its brand's mark; a
 * Revolut Pay account is "Revolut Pay" with Revolut's.
 */
function savedMethodName(
  card: SavedPaymentMethod,
  copy: { card: string; brands: Messages["atoms"]["payment"] },
  locale: string,
): { name: string; brand: SavedCardBrand; brandName: string } {
  if (card.kind === "revolut_pay")
    return { name: REVOLUT_PAY, brand: "revolut", brandName: REVOLUT_PAY };
  const brandName = copy.brands[card.brand];
  return {
    name: formatMessage(copy.card, { brand: brandName, last4: card.last4 }, locale),
    brand: card.brand,
    brandName,
  };
}

const markSizes = { md: "size-8", lg: "size-10" } as const;

/**
 * A saved method's mark: its brand's (PaymentIcon), or a plain card for a brand with no mark. Both
 * are images named by `label`, the same size; callers hide them when the words say the same.
 */
function SavedMethodMark({
  brand,
  label,
  size,
  ...props
}: Omit<React.ComponentProps<"svg">, "role" | "aria-label" | "children"> & {
  brand: SavedCardBrand;
  label: string;
  size: keyof typeof markSizes;
}) {
  if (brand !== "card") return <PaymentIcon brand={brand} label={label} size={size} {...props} />;
  return (
    <CreditCardIcon
      data-slot="payment-icon"
      data-brand="card"
      role="img"
      aria-label={label}
      className={cn("shrink-0", markSizes[size])}
      {...props}
    />
  );
}

/** Month and year as numbers in the locale's digits: `08/2028`; empty for Revolut Pay, which has none. */
function expiryText(card: SavedPaymentMethod, locale: string): string {
  if (card.kind === "revolut_pay") return "";
  const month = formatNumber(card.expiryMonth, locale, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });
  const year = formatNumber(card.expiryYear, locale, { useGrouping: false });
  return `${month}/${year}`;
}

/** True from the month after the expiry month (the card works through its last day). */
function isExpired(card: SavedPaymentMethod, now: string): boolean {
  if (card.kind === "revolut_pay") return false;
  const at = new Date(now);
  const year = at.getUTCFullYear();
  const month = at.getUTCMonth() + 1;
  return card.expiryYear < year || (card.expiryYear === year && card.expiryMonth < month);
}

function SavedPaymentMethodCard({
  card,
  copy,
  locale,
  now,
  headingLevel = 3,
  action,
  confirmHref,
  status,
  defaultOpen,
  modal,
  popupClassName,
  className,
  ...props
}: SavedPaymentMethodCardProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  const {
    name: inWords,
    brand,
    brandName,
  } = savedMethodName(card, { card: copy.card.card, brands: copy.brands }, locale);
  const wallet = card.kind === "revolut_pay";
  const expired = isExpired(card, now);
  const date = expiryText(card, locale);
  return (
    <article
      data-slot="saved-payment-method-card"
      data-default={card.isDefault ? "" : undefined}
      data-expired={expired ? "" : undefined}
      aria-labelledby={headingId}
      className={cn(
        "@container w-full min-w-0 rounded-xl border border-border bg-card p-4 text-card-foreground",
        className,
      )}
      {...props}
    >
      {/* The card's own width decides the layout (a container cannot query itself): Remove beside
          the details from 24rem, and the mark above them below 10rem, where a word like
          "Προεπιλογή" would not fit beside it. */}
      <div className="flex min-w-0 flex-col gap-4 @sm:flex-row @sm:items-start @sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3 @min-[10rem]:flex-row">
          {/* The mark says nothing the heading does not: the brand and the digits are in its words. */}
          <SavedMethodMark brand={brand} label={brandName} size="lg" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <Heading
                id={headingId}
                className="min-w-0 text-base leading-snug font-medium wrap-break-word"
              >
                {inWords}
              </Heading>
              {card.isDefault ? (
                <Badge variant="secondary" data-slot="saved-payment-method-default">
                  {copy.card.default}
                </Badge>
              ) : null}
            </div>
            {wallet ? null : expired ? (
              <p
                data-slot="saved-payment-method-expiry"
                className="flex items-start gap-1.5 text-sm font-medium text-destructive"
              >
                <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 wrap-break-word">
                  {formatMessage(copy.card.expired, { date }, locale)}
                </span>
              </p>
            ) : (
              <p data-slot="saved-payment-method-expiry" className="text-sm text-muted-foreground">
                {formatMessage(copy.card.expires, { date }, locale)}
              </p>
            )}
            {wallet || card.holderName === undefined ? null : (
              <p
                data-slot="saved-payment-method-holder"
                className="text-sm text-muted-foreground wrap-break-word"
              >
                {formatMessage(copy.card.holder, { name: card.holderName }, locale)}
              </p>
            )}
          </div>
        </div>
        <SavedPaymentMethodRemove
          paymentMethodId={card.id}
          copy={{
            remove: copy.card.remove,
            removeName: formatMessage(copy.card.removeNamed, { card: inWords }, locale),
            title: copy.card.confirmTitle,
            text: formatMessage(copy.card.confirmText, { card: inWords }, locale),
            cancel: copy.card.cancel,
            confirm: copy.card.confirm,
            removing: copy.card.removing,
            error: copy.card.error,
          }}
          action={action}
          confirmHref={confirmHref}
          status={status}
          defaultOpen={defaultOpen}
          modal={modal}
          className="@sm:shrink-0"
          popupClassName={popupClassName}
        />
      </div>
    </article>
  );
}

export { expiryText, isExpired, SavedMethodMark, savedMethodName, SavedPaymentMethodCard };
export type { SavedPaymentMethodCardProps };
