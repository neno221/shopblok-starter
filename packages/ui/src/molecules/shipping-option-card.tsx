// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). One shipping option as a radio
// card (RadioCard: a native radio in a label, so the delivery step works without JavaScript): the
// option's name, its price or "Free" for a 0 amount, the estimate in business days ("3–5 business
// days": an ICU plural, one number when the two are the same, "Same day" for 0 to 0) and, for a
// pickup, the location's name and its address in the country's own order. The caller draws the group
// (a `<fieldset>` with its `<legend>`) and gives every card the same `name`. The radio is named by
// the option's name and described by the rest (price, estimate, pickup, reason), so the price and
// the time are read after the name as a radio group is walked. An option with `available: false` is
// disabled (a disabled radio is not sent and not focusable) and says why in text: the reason is
// the same sentence for every unavailable option, since the contract carries no reason of its own.
// The pickup address is put together by `addressLines` from @shopblok/i18n (D48: the same country
// order AddressForm uses, with the country's own separators), joined with commas on one line, so no
// per-country order is written here.
// A server component: it holds no state, and the chosen option is the browser's (`defaultChecked`) or
// the caller's (`checked` with `onChange`).
import { addressLines, formatMessage, type Messages } from "@shopblok/i18n";
import type { LocationAddress, ShippingOption } from "@shopblok/registry/contracts";
import { Price } from "@shopblok/ui/atoms/price";
import { RadioCard, type RadioCardProps } from "@shopblok/ui/molecules/radio-card";
import { CircleAlertIcon } from "lucide-react";
import { useId } from "react";

type ShippingOptionCardProps = Omit<
  RadioCardProps,
  "value" | "labelledBy" | "describedBy" | "children"
> & {
  option: ShippingOption;
  /** The wording, from the catalog's `molecules.shippingOptionCard`. */
  copy: Messages["molecules"]["shippingOptionCard"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
};

/** The pickup point's address on one line, in its country's order (`addressLines`, D48). */
function addressLine(address: LocationAddress, locale: string): string {
  return addressLines(address, locale)
    .map((line) => line.text)
    .join(", ");
}

function estimateText(
  estimate: NonNullable<ShippingOption["estimate"]>,
  copy: ShippingOptionCardProps["copy"],
  locale: string,
): string {
  const { minDays, maxDays } = estimate;
  if (maxDays === 0) return copy.sameDay;
  if (minDays === maxDays) return formatMessage(copy.estimateExact, { days: maxDays }, locale);
  return formatMessage(copy.estimate, { minDays, maxDays }, locale);
}

function ShippingOptionCard({ option, copy, locale, disabled, ...props }: ShippingOptionCardProps) {
  const id = useId();
  const nameId = `${id}-name`;
  const priceId = `${id}-price`;
  const estimateId = `${id}-estimate`;
  const pickupId = `${id}-pickup`;
  const reasonId = `${id}-reason`;
  const unavailable = !option.available;
  const { estimate, pickup } = option;
  const described = [
    priceId,
    estimate === undefined ? undefined : estimateId,
    pickup === undefined ? undefined : pickupId,
    unavailable ? reasonId : undefined,
  ]
    .filter((described) => described !== undefined)
    .join(" ");
  return (
    <RadioCard
      data-slot="shipping-option-card"
      data-available={unavailable ? "false" : "true"}
      value={option.id}
      labelledBy={nameId}
      describedBy={described}
      disabled={disabled === true || unavailable}
      {...props}
    >
      <span className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span
          id={nameId}
          className="min-w-0 flex-1 basis-32 leading-snug font-medium wrap-break-word"
        >
          {option.name}
        </span>
        <span id={priceId} className="shrink-0 font-medium tabular-nums">
          {option.price.amount === 0 ? (
            <span data-slot="shipping-option-free" className="text-success">
              {copy.free}
            </span>
          ) : (
            <Price
              amount={option.price.amount}
              currency={option.price.currencyCode}
              locale={locale}
            />
          )}
        </span>
      </span>
      {estimate === undefined ? null : (
        <span id={estimateId} className="text-sm text-muted-foreground">
          {estimateText(estimate, copy, locale)}
        </span>
      )}
      {pickup === undefined ? null : (
        <span id={pickupId} className="flex flex-col text-sm text-muted-foreground">
          <span className="wrap-break-word">
            {formatMessage(copy.pickup, { location: pickup.locationName }, locale)}
          </span>
          {pickup.address === undefined ? null : (
            <span className="wrap-break-word">{addressLine(pickup.address, locale)}</span>
          )}
        </span>
      )}
      {unavailable ? (
        <span id={reasonId} className="mt-1 flex items-start gap-1.5 text-sm font-medium">
          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 wrap-break-word">{copy.unavailable}</span>
        </span>
      ) : null}
    </RadioCard>
  );
}

export { ShippingOptionCard };
export type { ShippingOptionCardProps };
