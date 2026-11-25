// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"). The delivery's and the payment's lines,
// which the checkout's review (and `one-page`'s finished steps) and the receipt's parts draw alike:
// the shipping method's name and its price ("Free" for nothing), and the provider's name or the
// card's brand with its last four digits. Server components.
import { formatMessage, type Messages } from "@shopblok/i18n";
import { Price } from "@shopblok/ui/atoms/price";

/** The shipping method's name and its price, `free`'s word for nothing. */
function ShippingMethodLine({
  method,
  free,
  locale,
}: {
  method: { name: string; price: { amount: number; currencyCode: string } };
  free: string;
  locale: string;
}) {
  return (
    <p className="flex flex-wrap justify-between gap-x-3">
      <span className="wrap-anywhere">{method.name}</span>
      {method.price.amount === 0 ? (
        <span className="text-success">{free}</span>
      ) : (
        <Price amount={method.price.amount} currency={method.price.currencyCode} locale={locale} />
      )}
    </p>
  );
}

/** The words a card's line needs: "{brand} ending in {last4}" and the brands' names. */
type PaymentLineCopy = {
  card: string;
  brands: Messages["atoms"]["payment"];
};

/**
 * How the order is paid: a card's brand with its last four digits in words ("Visa ending in
 * 4242", M6 T100), or the method's name, or the brand's name for a method with no digits (Revolut).
 */
function PaymentLine({
  payment,
  copy,
  locale,
}: {
  payment: { name?: string; brand?: string; last4?: string };
  copy: PaymentLineCopy;
  locale: string;
}) {
  const brand =
    payment.brand === undefined
      ? undefined
      : (copy.brands[payment.brand as keyof PaymentLineCopy["brands"]] ?? payment.brand);
  return (
    <p className="wrap-anywhere">
      {brand !== undefined && payment.last4 !== undefined
        ? formatMessage(copy.card, { brand, last4: payment.last4 }, locale)
        : (payment.name ?? brand ?? "")}
    </p>
  );
}

export { PaymentLine, ShippingMethodLine };
export type { PaymentLineCopy };
