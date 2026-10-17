// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). One way to pay as a radio card
// (RadioCard: a native radio in a label, so the payment step works without JavaScript): the method's
// name, which the radio is named by, and its marks (PaymentIcon) at the end. The marks are always
// drawn `aria-hidden`, and what they say is text: when the name already says the brand ("PayPal",
// "Apple Pay", "Revolut Pay") the marks are decoration and nothing is added, so a reader does not hear
// "PayPal" twice; when it does not ("Credit or debit card" with Visa, Mastercard and American
// Express), a hidden sentence in the radio's description says "Accepts Visa, Mastercard and American
// Express" (the brands joined by `Intl.ListFormat` for the market), which the marks alone could only
// give as three unconnected image names. A method that sends the customer to the provider's page
// (`kind: "redirect"`) says so under its name, in text, before it is chosen. The caller draws the
// group (a `<fieldset>` with its `<legend>`) and gives every card the same `name`; the card details
// themselves (Stripe's fields, M6) come after the choice and are not this component's. A server
// component: it holds no state, and the chosen method is the browser's (`defaultChecked`) or the
// caller's (`checked` with `onChange`).
import { formatMessage, type Messages } from "@shopblok/i18n";
import type { PaymentMethod } from "@shopblok/registry/contracts";
import { PaymentIcon } from "@shopblok/ui/atoms/payment-icon";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { RadioCard, type RadioCardProps } from "@shopblok/ui/molecules/radio-card";
import { useId } from "react";

type PaymentMethodCardProps = Omit<
  RadioCardProps,
  "value" | "labelledBy" | "describedBy" | "children"
> & {
  method: PaymentMethod;
  /**
   * The wording: the card's own from `molecules.paymentMethodCard`, and the brands' names from
   * `atoms.payment` (the marks' accessible names, which the catalogs keep once).
   */
  copy: {
    card: Messages["molecules"]["paymentMethodCard"];
    brands: Messages["atoms"]["payment"];
  };
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
};

const lists = new Map<string, Intl.ListFormat>();

/** "Visa, Mastercard and American Express", in the market's language. */
function joinNames(names: string[], locale: string): string {
  let format = lists.get(locale);
  if (format === undefined) {
    format = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
    lists.set(locale, format);
  }
  return format.format(names);
}

function PaymentMethodCard({ method, copy, locale, ...props }: PaymentMethodCardProps) {
  const id = useId();
  const nameId = `${id}-name`;
  const acceptsId = `${id}-accepts`;
  const redirectId = `${id}-redirect`;
  const names = method.brands.map((brand) => copy.brands[brand]);
  // The name says the brand when every brand's name is in it ("Apple Pay", "Revolut Pay").
  const lowerName = method.name.toLocaleLowerCase(locale);
  const nameSaysBrands = names.every((name) => lowerName.includes(name.toLocaleLowerCase(locale)));
  const accepts = names.length > 0 && !nameSaysBrands;
  const redirects = method.kind === "redirect";
  const described = [accepts ? acceptsId : undefined, redirects ? redirectId : undefined]
    .filter((described) => described !== undefined)
    .join(" ");
  return (
    <RadioCard
      data-slot="payment-method-card"
      data-kind={method.kind}
      value={method.id}
      labelledBy={nameId}
      describedBy={described === "" ? undefined : described}
      {...props}
    >
      <span className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span
          id={nameId}
          className="min-w-0 flex-1 basis-32 leading-snug font-medium wrap-break-word"
        >
          {method.name}
        </span>
        {method.brands.length === 0 ? null : (
          <span aria-hidden="true" className="flex shrink-0 flex-wrap items-center gap-2">
            {method.brands.map((brand) => (
              <PaymentIcon
                key={brand}
                brand={brand}
                label={copy.brands[brand]}
                size="md"
                aria-hidden="true"
              />
            ))}
          </span>
        )}
      </span>
      {accepts ? (
        <VisuallyHidden id={acceptsId}>
          {formatMessage(copy.card.accepts, { brands: joinNames(names, locale) }, locale)}
        </VisuallyHidden>
      ) : null}
      {redirects ? (
        <span id={redirectId} className="text-sm text-muted-foreground wrap-break-word">
          {formatMessage(copy.card.redirect, { name: method.name }, locale)}
        </span>
      ) : null}
    </RadioCard>
  );
}

export { PaymentMethodCard };
export type { PaymentMethodCardProps };
