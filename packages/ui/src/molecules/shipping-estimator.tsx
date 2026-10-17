// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). The shipping estimator of the
// cart: a plain GET form to the page in `estimate.action` (it sends `country` and `postalCode`, so
// the answer is a URL a shopper can reload, share or go back to), and, once the page has answered,
// the delivery options under it. It works before any JavaScript, and needs none: a native select of
// the region's countries (named by `countryName`, in the caller's order; `autocomplete="country"`),
// a text field for the postal code (`autocomplete="postal-code"`; text and not numeric, because a
// British or Dutch code has letters; no `pattern`, because the country is the select's and the
// select can change without the page knowing, so a pattern from the page's country would refuse a
// right code, and the format is checked on the server, which answers with `error="postalCode"`),
// both required and labelled, and a submit button. With no country chosen and more than one to
// choose from, the select starts on a disabled "Select a country" so a shopper cannot send the
// first one by accident. The answer is a list of the available options (one that is not available
// is left out, and when none is left it is the same as an empty answer): name, the time in business
// days (a range, one number, or "Same day", through ICU plurals), where it is collected if it is a
// pickup, and the price or "Free". An empty answer is a sentence, never an empty list. The results
// sit in a `role="status"` region that is always in the page, so a client that swaps the answer in
// (M3 may enhance the form) has it announced politely; after a full reload there is nothing to
// announce and the reader finds the results after the form. The two errors: a postal code the server
// refused is text tied to its field (`aria-invalid`, `aria-describedby`, the code is kept, WCAG 3.3.1
// to 3.3.3); a lookup that failed is text with an icon in the results region. The fields are keyed on
// their values from the server, so a navigation that brings new values starts them again from
// those. A container query lays the two fields on one row when the form is wide, wherever it sits.
// A server component: it only formats.
import { countryName, formatMessage, type Messages } from "@shopblok/i18n";
import type { ShippingEstimate, ShippingOption } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Input } from "@shopblok/ui/atoms/input";
import { NativeSelect, NativeSelectOption } from "@shopblok/ui/atoms/native-select";
import { Price } from "@shopblok/ui/atoms/price";
import { cn } from "@shopblok/ui/lib/utils";
import { Field, FieldError, FieldLabel } from "@shopblok/ui/primitives/field";
import { CircleAlertIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type ShippingEstimatorError = "postalCode" | "failed";

type ShippingEstimatorProps = Omit<
  React.ComponentProps<"form">,
  "children" | "action" | "method" | "aria-labelledby"
> & {
  /** The form's page and values, and the options once it has answered. */
  estimate: ShippingEstimate;
  /** The wording, from the catalog's `molecules.shippingEstimator`. */
  copy: Messages["molecules"]["shippingEstimator"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /**
   * What went wrong, from the server's answer: `postalCode` is a code the country's format
   * refuses (the field is marked and keeps its value), `failed` a lookup that did not work.
   */
  error?: ShippingEstimatorError;
  /** The level of the form's heading in the page's outline. */
  headingLevel?: HeadingLevel;
};

/** How long a delivery takes, in business days, in the locale's plural. */
function estimateText(
  estimate: NonNullable<ShippingOption["estimate"]>,
  copy: ShippingEstimatorProps["copy"],
  locale: string,
): string {
  return estimate.minDays === estimate.maxDays
    ? formatMessage(copy.estimateExact, { days: estimate.maxDays }, locale)
    : formatMessage(
        copy.estimateRange,
        { minDays: estimate.minDays, maxDays: estimate.maxDays },
        locale,
      );
}

function ShippingEstimator({
  estimate,
  copy,
  locale,
  error,
  headingLevel = 3,
  className,
  ...props
}: ShippingEstimatorProps) {
  const id = useId();
  const headingId = `${id}-heading`;
  const countryId = `${id}-country`;
  const postalId = `${id}-postal-code`;
  const errorId = `${id}-postal-code-error`;
  const resultsId = `${id}-results`;
  const Heading = `h${headingLevel}` as const;
  const { countries, countryCode, postalCode, options } = estimate;
  const chooseFirst = countryCode === undefined && countries.length > 1;
  const postalInvalid = error === "postalCode";
  const available = (options ?? []).filter((option) => option.available);
  const place = {
    postalCode,
    country: countryCode === undefined ? "" : countryName(countryCode, locale),
  };
  return (
    <form
      data-slot="shipping-estimator"
      action={estimate.action}
      method="get"
      aria-labelledby={headingId}
      className={cn("@container flex w-full min-w-0 flex-col gap-4", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <Heading
          id={headingId}
          data-slot="shipping-estimator-title"
          className="text-lg leading-snug font-semibold wrap-break-word"
        >
          {copy.title}
        </Heading>
        <p className="text-sm leading-snug wrap-break-word text-muted-foreground">
          {copy.description}
        </p>
      </div>
      <div className="flex flex-col gap-4 @lg:flex-row @lg:items-start">
        <Field className="min-w-0 @lg:flex-1">
          <FieldLabel htmlFor={countryId}>{copy.country}</FieldLabel>
          <NativeSelect
            key={countryCode ?? ""}
            id={countryId}
            name="country"
            autoComplete="country"
            required
            defaultValue={countryCode ?? (chooseFirst ? "" : countries[0])}
            className="w-full"
          >
            {chooseFirst ? (
              <NativeSelectOption value="" disabled>
                {copy.countryPlaceholder}
              </NativeSelectOption>
            ) : null}
            {countries.map((code) => (
              <NativeSelectOption key={code} value={code}>
                {countryName(code, locale)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field className="min-w-0 @lg:flex-1">
          <FieldLabel htmlFor={postalId}>{copy.postalCode}</FieldLabel>
          <Input
            key={postalCode}
            id={postalId}
            name="postalCode"
            type="text"
            autoComplete="postal-code"
            autoCapitalize="characters"
            spellCheck={false}
            required
            defaultValue={postalCode}
            data-truncate=""
            aria-invalid={postalInvalid ? true : undefined}
            aria-describedby={postalInvalid ? errorId : undefined}
          />
          {postalInvalid ? <FieldError id={errorId}>{copy.errors.postalCode}</FieldError> : null}
        </Field>
      </div>
      <Button type="submit" className="max-w-full self-start">
        {copy.submit}
      </Button>
      <div
        role="status"
        aria-live="polite"
        data-slot="shipping-estimator-results"
        className="-mt-4 flex min-w-0 flex-col gap-2 not-empty:mt-0"
      >
        {error === "failed" ? (
          <p className="flex items-start gap-2 text-sm leading-snug text-destructive">
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">{copy.errors.failed}</span>
          </p>
        ) : null}
        {error === undefined && options !== undefined && available.length === 0 ? (
          <p
            data-slot="shipping-estimator-none"
            className="text-sm leading-snug wrap-break-word text-muted-foreground"
          >
            {formatMessage(copy.none, place, locale)}
          </p>
        ) : null}
        {error === undefined && available.length > 0 ? (
          <>
            <p id={resultsId} className="text-sm leading-snug font-medium wrap-break-word">
              {formatMessage(copy.results, place, locale)}
            </p>
            <ul
              aria-labelledby={resultsId}
              data-slot="shipping-estimator-options"
              className="divide-y rounded-lg border"
            >
              {available.map((option) => (
                <li
                  key={option.id}
                  data-slot="shipping-estimator-option"
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-3"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm leading-snug font-medium wrap-break-word">
                      {option.name}
                    </span>
                    {option.estimate === undefined ? null : (
                      <span className="text-sm leading-snug wrap-break-word text-muted-foreground">
                        {estimateText(option.estimate, copy, locale)}
                      </span>
                    )}
                    {option.pickup === undefined ? null : (
                      <span className="text-sm leading-snug wrap-break-word text-muted-foreground">
                        {formatMessage(
                          copy.pickupAt,
                          { location: option.pickup.locationName },
                          locale,
                        )}
                      </span>
                    )}
                  </div>
                  <span className="ms-auto text-end text-sm font-medium">
                    {option.price.amount === 0 ? (
                      <span className="text-success">{copy.free}</span>
                    ) : (
                      <Price
                        amount={option.price.amount}
                        currency={option.price.currencyCode}
                        locale={locale}
                        size="sm"
                      />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </form>
  );
}

export { ShippingEstimator };
export type { ShippingEstimatorError, ShippingEstimatorProps };
