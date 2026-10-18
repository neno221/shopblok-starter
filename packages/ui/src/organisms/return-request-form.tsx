// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"; SPEC §8.4, D48, WCAG 3.3.1 to
// 3.3.3). A return as one plain `<form>` (D48: it posts without JavaScript), named "Return items from
// order #1042", with the order's id hidden: a fieldset "Items to return" with each line of the order
// (its picture, its title, every chosen option, "You can return 2 of 2") and a native select of the
// quantity to send back, 0 to what may still be returned (`items.{lineId}`; a line already returned
// says so and its select is disabled), its label "Quantity to return" with the line's name after it
// for a screen reader, since a list of selects with one name would not say which is which; then the
// reason (a required native select of the shop's reasons, Medusa's return reasons) and a note
// (optional, and says so in its label, up to 500 characters, with the limit under it). An error is a
// sentence beside its field or its fieldset (`aria-invalid`, `aria-describedby`), the values stay as
// they were sent, and one polite status region that is always in the form says how many fields need
// attention, or that the request could not be sent. A sending form never submits twice: the button is
// `aria-disabled` and `type="button"`, and a hidden disabled submit stands first (AddressForm's
// way). A server component: the errors and the sending state are the caller's (`useActionState`).
import { formatList, formatMessage, formatNumber, type Messages } from "@shopblok/i18n";
import type { ReturnItem, ReturnRequest } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Image } from "@shopblok/ui/atoms/image";
import { NativeSelect } from "@shopblok/ui/atoms/native-select";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { CircleAlertIcon, ImageOffIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

/** What is wrong after a submit: no item chosen, no reason chosen. */
type ReturnRequestErrors = { items?: "required"; reason?: "required" };

/** The most a note holds (the contract's limit). */
const NOTE_MAX = 500;

type ReturnRequestFormProps = Omit<
  React.ComponentProps<"form">,
  "children" | "action" | "method" | "aria-label" | "aria-labelledby"
> &
  ReturnRequest & {
    /** The wording, from the catalog's `organisms.returnRequestForm`. */
    copy: Messages["organisms"]["returnRequestForm"];
    /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
    locale: string;
    /** What `<form action>` takes: M3's server action, or a URL (the form is then posted). */
    action?: React.ComponentProps<"form">["action"];
    errors?: ReturnRequestErrors;
    /** `pending` holds the submit; `error` says the request could not be sent. */
    status?: "idle" | "pending" | "error";
  };

/** "Essential Tee (Colour: White, Size: M)": the line as its select is named after it. */
function itemName(item: ReturnItem, copy: ReturnRequestFormProps["copy"], locale: string) {
  if (item.options.length === 0) return item.title;
  const options = formatList(
    item.options.map((option) => formatMessage(copy.option, option, locale)),
    locale,
    "unit",
  );
  return formatMessage(copy.named, { title: item.title, options }, locale);
}

function ReturnRequestForm({
  orderId,
  displayId,
  items,
  reasons,
  reason,
  note,
  copy,
  locale,
  action,
  errors = {},
  status = "idle",
  className,
  ...props
}: ReturnRequestFormProps) {
  const id = useId();
  const pending = status === "pending";
  const errorCount = Object.values(errors).filter((error) => error !== undefined).length;
  const itemsErrorId = `${id}-items-error`;
  const reasonErrorId = `${id}-reason-error`;
  const noteHintId = `${id}-note-hint`;
  return (
    <form
      data-slot="return-request-form"
      aria-label={formatMessage(copy.label, { number: String(displayId) }, locale)}
      action={action}
      method={typeof action === "function" ? undefined : "post"}
      aria-busy={pending ? true : undefined}
      className={cn("flex min-w-0 flex-col gap-6", className)}
      {...props}
    >
      {pending ? <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" /> : null}
      <input type="hidden" name="orderId" value={orderId} />
      <fieldset
        data-slot="return-request-items"
        aria-invalid={errors.items === undefined ? undefined : true}
        aria-describedby={errors.items === undefined ? undefined : itemsErrorId}
        className="flex min-w-0 flex-col gap-3"
      >
        <legend className="mb-3 text-base leading-snug font-semibold wrap-anywhere">
          {copy.items}
        </legend>
        {errors.items === undefined ? null : (
          <FieldError id={itemsErrorId}>{copy.errors.items}</FieldError>
        )}
        <ul role="list" className="flex min-w-0 flex-col divide-y">
          {items.map((item) => (
            <ReturnLine
              key={item.id}
              item={item}
              name={itemName(item, copy, locale)}
              copy={copy}
              locale={locale}
              readOnly={pending}
            />
          ))}
        </ul>
      </fieldset>
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={`${id}-reason`} className="text-sm font-medium wrap-anywhere">
          {copy.reason}
        </label>
        <NativeSelect
          id={`${id}-reason`}
          name="reason"
          required
          defaultValue={reason ?? ""}
          aria-invalid={errors.reason === undefined ? undefined : true}
          aria-describedby={errors.reason === undefined ? undefined : reasonErrorId}
          className="w-full max-w-md"
        >
          <option value="" disabled>
            {copy.reasonPlaceholder}
          </option>
          {reasons.map((each) => (
            <option key={each.id} value={each.id}>
              {each.label}
            </option>
          ))}
        </NativeSelect>
        {errors.reason === undefined ? null : (
          <FieldError id={reasonErrorId}>{copy.errors.reason}</FieldError>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={`${id}-note`} className="text-sm font-medium wrap-anywhere">
          {copy.note} <span className="font-normal text-muted-foreground">{copy.optional}</span>
        </label>
        <textarea
          id={`${id}-note`}
          name="note"
          rows={4}
          maxLength={NOTE_MAX}
          defaultValue={note}
          readOnly={pending}
          aria-describedby={noteHintId}
          className="min-h-24 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring md:text-sm"
        />
        <p id={noteHintId} className="text-sm text-muted-foreground">
          {formatMessage(copy.noteHint, { max: NOTE_MAX }, locale)}
        </p>
      </div>
      <div role="status" aria-live="polite" data-slot="return-request-status">
        {status === "error" ? (
          <FieldError>{copy.errors.failed}</FieldError>
        ) : errorCount > 0 ? (
          <p className="text-sm font-medium text-destructive">
            {formatMessage(copy.summary, { count: errorCount }, locale)}
          </p>
        ) : null}
      </div>
      <Button
        type={pending ? "button" : "submit"}
        size="lg"
        disabled={pending}
        focusableWhenDisabled={pending}
        aria-busy={pending ? true : undefined}
        data-slot="return-request-submit"
        className="max-w-full self-start aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        {pending ? <Spinner aria-hidden="true" label={copy.submitting} /> : null}
        <span className="min-w-0 wrap-anywhere">{pending ? copy.submitting : copy.submit}</span>
      </Button>
    </form>
  );
}

function ReturnLine({
  item,
  name,
  copy,
  locale,
  readOnly,
}: {
  item: ReturnItem;
  name: string;
  copy: ReturnRequestFormProps["copy"];
  locale: string;
  readOnly: boolean;
}) {
  const id = useId();
  const none = item.returnable === 0;
  const quantities = Array.from({ length: item.returnable + 1 }, (_, index) => index);
  return (
    <li
      data-slot="return-request-item"
      data-returnable={item.returnable}
      className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-3 py-3 first:pt-0"
    >
      <div className="w-16">
        {item.image === undefined ? (
          <div
            aria-hidden="true"
            className="flex aspect-[4/5] w-full items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <ImageOffIcon className="size-5" />
          </div>
        ) : (
          <Image src={item.image.src} alt="" sizes="64px" ratio="portrait" radius="md" />
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5 text-sm leading-snug">
          <p className="font-medium wrap-anywhere">{item.title}</p>
          {item.options.map((option, index) => (
            <p key={`${option.option}-${index}`} className="text-muted-foreground wrap-anywhere">
              {formatMessage(copy.option, option, locale)}
            </p>
          ))}
          <p className="text-muted-foreground">
            {formatMessage(
              copy.available,
              { returnable: item.returnable, quantity: item.quantity },
              locale,
            )}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-quantity`} className="text-sm font-medium wrap-anywhere">
            {copy.quantity}
            <VisuallyHidden>, {name}</VisuallyHidden>
          </label>
          <NativeSelect
            id={`${id}-quantity`}
            name={`items.${item.id}`}
            defaultValue={String(item.quantityChosen)}
            disabled={none || readOnly}
            className="w-24"
          >
            {quantities.map((quantity) => (
              <option key={quantity} value={quantity}>
                {formatNumber(quantity, locale)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </li>
  );
}

function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-2 text-sm leading-snug text-destructive">
      <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 wrap-break-word">{children}</span>
    </p>
  );
}

export { ReturnRequestForm };
export type { ReturnRequestErrors, ReturnRequestFormProps };
