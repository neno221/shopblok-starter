// Ours (T86, SETUP.md "Checkout and receipt variants (T86)"). The delivery's and the payment's lines,
// which the checkout's review (and `one-page`'s finished steps) and the receipt's parts draw alike:
// the shipping method's name and its price ("Free" for nothing), and the provider's name or the
// card's brand with its last four digits. Server components.
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

/** How the order is paid: the provider's name or the card's brand, and its last four digits. */
function PaymentLine({ payment }: { payment: { name?: string; brand?: string; last4?: string } }) {
  return (
    <p className="wrap-anywhere">
      {payment.name ?? payment.brand ?? ""}
      {payment.last4 === undefined ? null : ` •••• ${payment.last4}`}
    </p>
  );
}

export { PaymentLine, ShippingMethodLine };
