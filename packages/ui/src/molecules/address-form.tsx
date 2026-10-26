// Ours (T34, D48, SETUP.md "Cart, checkout and account molecules (T34)"). An address as a plain
// `<form>` (SPEC §8.4: "the address format follows the country"): a country select limited to
// `countries` (the region's), then the chosen country's fields in its rows and order, then the
// phone, then a submit button. Which fields a country has, in which order, which are required, its
// postal code's pattern, example and prefix, and what it calls its postal code, province and city
// come from Google's address metadata (`addressFormat`, @shopblok/i18n; a country it does not list
// gets the generic form, never an error), so a market added in settings needs no code (Principle
// 10). Every field has a visible label, the `autocomplete` token of WCAG 1.3.5 (prefixed by
// `section` when the form is for `shipping` or `billing`), the right `type` and `inputMode`, and
// `required` when its country wants it; one that may stay empty says "(optional)" in its label
// (WCAG 3.3.2), and a note says that all the others are required. An error is text beside its field
// (`aria-invalid`, `aria-describedby`; a postal code that does not match its pattern says what one
// looks like: "Enter a postal code like 2008", WCAG 3.3.1 to 3.3.3), the value is kept, and a
// status line in a region that is always there says how many fields need attention (WCAG 4.1.3).
// Without JavaScript the form shows the first country's fields and submits whichever country is
// chosen, and the server draws the right form again; with it, the client part
// (`address-form-fields.tsx`) swaps the fields at once from the formats of `countries`, which this
// component formats on the server and hands over as plain data. A sending form never submits
// twice: the button is `aria-disabled` and `type="button"`, a hidden disabled submit button stands
// first, and the fields are read-only (T33's NewsletterForm). A server component: it only
// formats; the sending state and the errors are the caller's (`useActionState` in M3's wrapper).
import {
  addressFormat,
  countryName,
  formatMessage,
  type AddressFieldName,
  type Messages,
} from "@shopblok/i18n";
import type { AddressFormState } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { CircleAlertIcon } from "lucide-react";
import type * as React from "react";
import {
  AddressFormFields,
  type AddressFormCountryView,
  type AddressFormField,
  type AddressInputName,
} from "./address-form-fields";

/** What is wrong with a field: it is empty, it does not match its pattern, or the server refused it. */
type AddressFieldError = "required" | "pattern" | "invalid";

/** The errors of a submit, a kind per field (the caller's zod issues, mapped). */
type AddressFormErrors = Partial<Record<AddressFormField, AddressFieldError>>;

type AddressFormStatus = "idle" | "pending" | "error";

type AddressFormCopy = Messages["molecules"]["addressForm"];

type AddressFormProps = Omit<
  React.ComponentProps<"form">,
  "action" | "method" | "aria-label" | "aria-labelledby"
> &
  AddressFormState & {
    /** The wording, from the catalog's `molecules.addressForm`. */
    copy: AddressFormCopy;
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /**
     * What `<form action>` takes: M3's server action, or a URL (the form is then posted). Without
     * one the form submits to the page it is on.
     */
    action?: React.ComponentProps<"form">["action"];
    /** Which address this is. It names the form and prefixes the `autocomplete` tokens. */
    section?: "shipping" | "billing";
    /** What is wrong with each field after a submit; the values stay as they were typed. */
    errors?: AddressFormErrors;
    /**
     * `pending` blocks a second submit and says so; `error` says the address could not be saved
     * (when no field is to blame). Field errors need no status: they say themselves.
     */
    status?: AddressFormStatus;
    /** The button's text when the page's step has its own ("Continue to delivery"). */
    submitLabel?: string;
    /** Fields the page adds after the address, before the button (the account's default, T53). */
    children?: React.ReactNode;
  };

/** One country's format and words, plain data for the client part. */
function countryView(code: string, copy: AddressFormCopy, locale: string): AddressFormCountryView {
  const format = addressFormat(code, locale);
  const labels: Record<AddressFieldName, string> = {
    firstName: copy.labels.firstName,
    lastName: copy.labels.lastName,
    company: copy.labels.company,
    address1: copy.labels.address1,
    address2: copy.labels.address2,
    city: copy.labels.city[format.names.city],
    province: copy.labels.province[format.names.province],
    postalCode: copy.labels.postalCode[format.names.postalCode],
  };
  const name = countryName(code, locale);
  const view: AddressFormCountryView = {
    code: format.countryCode,
    name,
    announcement: formatMessage(copy.fieldsUpdated, { country: name }, locale),
    rows: format.rows,
    labels,
    required: format.required,
  };
  if (format.postalCode !== undefined) {
    const { pattern, example, prefix } = format.postalCode;
    const title =
      example === undefined
        ? undefined
        : formatMessage(copy.errors.postalCode[format.names.postalCode], { example }, locale);
    // Digits only, with nothing to type but digits: the numeric keyboard has no space or hyphen.
    const numeric =
      pattern !== undefined &&
      example !== undefined &&
      /^\d+$/.test(example) &&
      !/[ -]/.test(pattern);
    view.postalCode = {
      ...(pattern === undefined ? {} : { pattern }),
      ...(title === undefined ? {} : { title }),
      ...(example === undefined ? {} : { hint: formatMessage(copy.example, { example }, locale) }),
      ...(prefix === undefined ? {} : { prefix }),
      numeric,
    };
  }
  return view;
}

/** The text of one field's error, in the starting country's words. */
function errorText(
  field: AddressFormField,
  kind: AddressFieldError,
  view: AddressFormCountryView,
  copy: AddressFormCopy,
  locale: string,
): string {
  const label =
    field === "countryCode"
      ? copy.countryLabel
      : field === "phone"
        ? copy.labels.phone
        : view.labels[field];
  if (kind === "required") return formatMessage(copy.errors.required, { field: label }, locale);
  if (kind === "invalid") return formatMessage(copy.errors.invalid, { field: label }, locale);
  // A postal code that does not match says what one looks like, when the country gives an example.
  if (field === "postalCode" && view.postalCode?.title !== undefined) return view.postalCode.title;
  return formatMessage(copy.errors.pattern, { field: label }, locale);
}

function AddressForm({
  countries,
  values,
  copy,
  locale,
  action,
  section,
  errors = {},
  status = "idle",
  submitLabel,
  children,
  className,
  ...props
}: AddressFormProps) {
  const views = countries.map((code) => countryView(code, copy, locale));
  const start = views.find((view) => view.code === values.countryCode) ?? views[0];
  const pending = status === "pending";
  // Only the fields the starting country draws can show an error (and the country and the phone).
  const drawn = new Set<AddressFormField>(["countryCode", "phone", ...(start?.rows.flat() ?? [])]);
  const errorTexts: Partial<Record<AddressFormField, string>> = {};
  if (start !== undefined) {
    for (const [field, kind] of Object.entries(errors) as [AddressFormField, AddressFieldError][]) {
      if (drawn.has(field)) {
        errorTexts[field] = errorText(field, kind, start, copy, locale);
      }
    }
  }
  const failed = Object.keys(errorTexts).length;
  const message =
    failed > 0
      ? formatMessage(copy.summary, { count: failed }, locale)
      : status === "error"
        ? copy.error
        : undefined;
  const typed: Partial<Record<AddressInputName, string>> = {};
  for (const field of [
    "firstName",
    "lastName",
    "company",
    "address1",
    "address2",
    "city",
    "province",
    "postalCode",
    "phone",
  ] as const) {
    const value = values[field];
    if (value !== undefined) typed[field] = value;
  }
  return (
    <form
      data-slot="address-form"
      data-status={status}
      action={action}
      method={typeof action === "function" ? undefined : "post"}
      aria-label={copy.label[section ?? "address"]}
      className={cn("@container flex w-full min-w-0 flex-col gap-4", className)}
      {...props}
    >
      {/* Enter in a text field submits a form; a disabled default button stops it while the address
          is on its way. Hidden, so nobody meets it. */}
      {pending ? <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" /> : null}
      {values.id === undefined ? null : <input type="hidden" name="addressId" value={values.id} />}
      <p data-slot="address-form-note" className="text-sm leading-snug text-muted-foreground">
        {copy.requiredNote}
      </p>
      {start === undefined ? null : (
        <AddressFormFields
          // A new address from the server (another one to edit) starts the fields again from it.
          key={values.id ?? start.code}
          section={section}
          countryLabel={copy.countryLabel}
          phoneLabel={copy.labels.phone}
          optionalMark={copy.optional}
          countries={views}
          country={start.code}
          values={typed}
          errors={errorTexts}
          readOnly={pending}
        />
      )}
      {children}
      <div role="status" aria-live="polite" data-slot="address-form-status">
        {pending ? <VisuallyHidden>{copy.saving}</VisuallyHidden> : null}
        {message === undefined ? null : (
          <p className="flex items-start gap-2 text-sm leading-snug text-destructive">
            <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">{message}</span>
          </p>
        )}
      </div>
      <Button
        type={pending ? "button" : "submit"}
        disabled={pending}
        focusableWhenDisabled={pending}
        aria-busy={pending ? true : undefined}
        className="w-full max-w-full aria-disabled:pointer-events-none aria-disabled:opacity-50 @md:w-auto @md:self-start"
      >
        {pending ? <Spinner aria-hidden="true" label={copy.saving} /> : null}
        <span data-slot="address-form-submit-label">
          {pending ? copy.saving : (submitLabel ?? copy.submit)}
        </span>
      </Button>
    </form>
  );
}

export { AddressForm };
export type {
  AddressFieldError,
  AddressFormCopy,
  AddressFormErrors,
  AddressFormProps,
  AddressFormStatus,
};
