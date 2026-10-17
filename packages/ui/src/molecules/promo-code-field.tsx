// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). Promotion codes in the cart: the
// codes applied, each a chip with what it takes off and a remove button, and a disclosure ("Add a
// promotion code") that opens a form with the code field and an Apply button. Both are plain forms
// (D48): `applyAction` and `removeAction` are what a `<form action>` takes (M3's server actions, or
// URLs, which are posted), the field is `code` and so is the remove button's name and value, so the
// codes can be added and taken off before any script runs. A native `<details>` and not the
// Collapsible primitive, which is Base UI's and needs JavaScript to open; the open state sits in a
// small client part (PromoCodeDisclosure) only so that applying a code does not close the form
// under a focused button. It is open in the markup when a code is typed or `error` is set. The
// field has a visible label, `autocomplete="off"`, and keeps the typed code after an error; the
// error is text with an icon, tied to the field (`aria-invalid`, `aria-describedby`) and in a
// polite status region that is always in the form. `pending` is the try in flight: `"apply"` keeps
// the button in place as "Applying…", `aria-disabled` and `type="button"`, with a hidden disabled
// submit button first in the form, because a form with one text field also submits on Enter
// (NewsletterForm's way); `"remove"` makes the remove buttons inert the same way. The applied
// codes sit in a polite region that reports additions only, so a code that was just applied is
// announced once. The chips are drawn here and not with the Chip atom: its remove control is a
// link or a click handler, and removing a code is a form post. Server component but for the
// disclosure.
import { formatMessage, formatMoney, type Messages } from "@shopblok/i18n";
import type { PromoCodeEntry } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Input } from "@shopblok/ui/atoms/input";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { PromoCodeDisclosure } from "@shopblok/ui/molecules/promo-code-disclosure";
import { Field, FieldLabel } from "@shopblok/ui/primitives/field";
import { CircleAlertIcon, XIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

/** Why the last try failed: each is a message under `errors` in the copy. */
type PromoCodeError = "invalid" | "expired" | "not-applicable" | "already-applied" | "failed";

/** What is in flight: a code being applied, or one being taken off. */
type PromoCodePending = "apply" | "remove";

type FormAction = React.ComponentProps<"form">["action"];

type PromoCodeFieldProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The codes applied, and the one typed (kept after an error). */
  entry: PromoCodeEntry;
  /** The wording, from the catalog's `molecules.promoCodeField`. */
  copy: Messages["molecules"]["promoCodeField"];
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** What `<form action>` takes for the apply form: it receives `code`. */
  applyAction?: FormAction;
  /** The same for taking a code off: it receives `code`, the one whose button was pressed. */
  removeAction?: FormAction;
  /** Why the last try failed. The form is open when it is set. */
  error?: PromoCodeError;
  /** A try in flight: nothing can be sent again until the cart answers. */
  pending?: PromoCodePending;
};

// The message of each kind of error, by the key it has in the copy.
const errorKeys = {
  invalid: "invalid",
  expired: "expired",
  "not-applicable": "notApplicable",
  "already-applied": "alreadyApplied",
  failed: "failed",
} as const satisfies Record<PromoCodeError, keyof PromoCodeFieldCopyErrors>;

type PromoCodeFieldCopyErrors = Messages["molecules"]["promoCodeField"]["errors"];

// The remove button's box is 44 × 44 px (D32); the negative margin keeps the chip itself 32 px tall.
const removeClasses =
  "-my-1.5 flex size-11 shrink-0 items-center justify-center rounded-full outline-none hover:bg-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4";

function PromoCodeField({
  entry,
  copy,
  locale,
  applyAction,
  removeAction,
  error,
  pending,
  className,
  ...props
}: PromoCodeFieldProps) {
  const id = useId();
  const inputId = `${id}-code`;
  const errorId = `${id}-error`;
  const applying = pending === "apply";
  const removing = pending === "remove";
  // A URL is posted; a function is left to React, which posts it as a server action.
  const method = (action: FormAction) => (typeof action === "function" ? undefined : "post");
  return (
    <div
      data-slot="promo-code-field"
      data-pending={pending}
      data-error={error}
      className={cn("flex min-w-0 flex-col", className)}
      {...props}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
        data-slot="promo-code-applied"
      >
        {entry.applied.length > 0 ? (
          <form action={removeAction} method={method(removeAction)} data-slot="promo-code-remove">
            <ul
              role="list"
              aria-label={copy.appliedList}
              className="mb-3 flex min-w-0 flex-wrap gap-2"
            >
              {entry.applied.map(({ code, discount }) => (
                <li key={code} data-slot="promo-code-chip" className="max-w-full">
                  <span className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full bg-secondary ps-3 pe-1 text-sm leading-snug text-secondary-foreground">
                    <span className="min-w-0 py-1 wrap-anywhere">
                      <span className="font-mono font-medium">{code}</span>
                      {discount === undefined ? null : (
                        <>
                          {" "}
                          <span data-slot="promo-code-saves">
                            {formatMessage(
                              copy.saves,
                              {
                                amount: formatMoney(discount.amount, discount.currencyCode, locale),
                              },
                              locale,
                            )}
                          </span>
                        </>
                      )}
                    </span>
                    <button
                      type={pending === undefined ? "submit" : "button"}
                      name="code"
                      value={code}
                      aria-label={formatMessage(copy.remove, { code }, locale)}
                      aria-disabled={pending === undefined ? undefined : true}
                      data-slot="promo-code-remove-button"
                      className={removeClasses}
                    >
                      <XIcon aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </form>
        ) : null}
        {removing ? (
          <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner aria-hidden="true" label={copy.removing} />
            <span>{copy.removing}</span>
          </p>
        ) : null}
      </div>
      <PromoCodeDisclosure
        summary={copy.toggle}
        needsOpen={error !== undefined || entry.code !== ""}
      >
        <form
          action={applyAction}
          method={method(applyAction)}
          aria-busy={applying ? true : undefined}
          data-slot="promo-code-apply"
          className="flex min-w-0 flex-col gap-2"
        >
          {/* Enter in the one text field submits a form even with no submit button; a disabled
              default button stops it while a code is on its way. Hidden, so nobody meets it. */}
          {applying ? (
            <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" />
          ) : null}
          <Field>
            <FieldLabel htmlFor={inputId}>{copy.label}</FieldLabel>
            <div className="flex flex-wrap items-start gap-2">
              <Input
                id={inputId}
                name="code"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                required
                readOnly={applying}
                defaultValue={entry.code}
                // A code longer than the box scrolls inside it, which the field says (the DS clip check).
                data-truncate=""
                aria-invalid={error === undefined ? undefined : true}
                aria-describedby={error === undefined ? undefined : errorId}
                className="min-w-40 flex-1"
              />
              <Button
                type={applying ? "button" : "submit"}
                disabled={applying}
                focusableWhenDisabled={applying}
                aria-busy={applying ? true : undefined}
                className="max-w-full aria-disabled:pointer-events-none aria-disabled:opacity-50"
              >
                {applying ? <Spinner aria-hidden="true" label={copy.applying} /> : null}
                <span data-slot="promo-code-apply-label">
                  {applying ? copy.applying : copy.apply}
                </span>
              </Button>
            </div>
          </Field>
          <div role="status" aria-live="polite" data-slot="promo-code-status">
            {applying ? <VisuallyHidden>{copy.applying}</VisuallyHidden> : null}
            {error === undefined ? null : (
              <p
                id={errorId}
                className="flex items-start gap-2 text-sm leading-snug text-destructive"
              >
                <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 wrap-break-word">{copy.errors[errorKeys[error]]}</span>
              </p>
            )}
          </div>
        </form>
      </PromoCodeDisclosure>
    </div>
  );
}

export { PromoCodeField };
export type { PromoCodeError, PromoCodeFieldProps, PromoCodePending };
