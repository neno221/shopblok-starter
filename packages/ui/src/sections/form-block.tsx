// Ours (T67, SETUP.md "Forms (T67)"; SPEC §7.4 `formBlock`, D81). A form an editor built in the admin
// (Payload's form builder): its fields in the editor's order, each a labelled native control (a text
// field, an email field, a text area, a native select, a native checkbox) or the editor's text
// between them, then the submit button. A plain `<form>` (D48, SPEC §8.4): `action` is what a
// `<form action>` takes, the shop's server action, so it posts before any script runs, and the
// browser checks the required fields, the email's shape and the lengths natively. The server checks
// them all again, and its answer comes back as props: each refused field is marked
// (`aria-invalid`, its error tied to it by `aria-describedby`) with what was typed kept, and the
// result is text in a `role="status"` region that is always in the page, so a change is announced
// politely (WCAG 3.3.1, 4.1.3). A half-width field shares a row with the next one when the form is
// 28rem wide (a container query: the form decides, not the viewport). `sending` keeps the button in
// place and named but makes it `type="button"` and `aria-disabled`, with a disabled submit button
// first in the form, which stops Enter, as NewsletterForm does. The spam trap and other hidden inputs
// are the shop's (`hiddenFields`). A server component; the shop draws it from an island that keeps the
// action's answer.
import type {
  FormBlockSection as FormBlockSectionData,
  FormField,
} from "@shopblok/registry/contracts";
import { FORM_LIMITS } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { Input } from "@shopblok/ui/atoms/input";
import { NativeSelect, NativeSelectOption } from "@shopblok/ui/atoms/native-select";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { Textarea } from "@shopblok/ui/atoms/textarea";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { Field, FieldLabel } from "@shopblok/ui/primitives/field";
import { Prose } from "@shopblok/ui/sections/prose";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

type FormStatus = "idle" | "sending" | "done" | "error";

/** What is wrong with a field, as the shop's server action says (`FieldError`). */
type FormFieldError = "required" | "pattern" | "invalid";

type FormBlockSectionProps = FormBlockSectionData & {
  copy: Pick<SectionsCopy, "form">;
  /** What `<form action>` takes: the shop's server action. */
  action?: React.ComponentProps<"form">["action"];
  /** Where the form is. `error` with no field to blame says the form could not be sent. */
  status?: FormStatus;
  /** Each refused field's error, by its name. */
  errors?: Partial<Record<string, FormFieldError>>;
  /**
   * What was typed, by name, after an answer that refused it (a checkbox: `"on"` or `""`). Unset,
   * each field starts from the editor's default.
   */
  values?: Partial<Record<string, string>>;
  /** The editor's confirmation, shown when the form is sent; the catalog's line without one. */
  confirmation?: React.ReactNode;
  /** The editor's text between fields, rendered by the shop, keyed by the `message` field's `id`. */
  messages?: Partial<Record<string, React.ReactNode>>;
  /** Hidden inputs the shop posts with the answers (the spam trap), first in the form. */
  hiddenFields?: React.ReactNode;
  /** The `<form>`'s `id`, for a link to it (the no-script answer scrolls back to it). */
  formId?: string;
  className?: string;
};

type InputField = Exclude<FormField, { kind: "message" }>;

/** The words under a refused field: a box left unticked says so, an email's shape says how. */
function errorText(field: InputField, error: FormFieldError, copy: SectionsCopy["form"]): string {
  if (error === "required")
    return field.kind === "checkbox" ? copy.errors.checkbox : copy.errors.required;
  if (error === "pattern" && field.kind === "email") return copy.errors.email;
  return copy.errors.invalid;
}

type ControlProps = {
  field: InputField;
  id: string;
  describedBy?: string;
  invalid: boolean;
  typed?: string;
  readOnly: boolean;
  copy: SectionsCopy["form"];
};

/** The native control of one field, with its value from the answer or the editor's default. */
function Control({ field, id, describedBy, invalid, typed, readOnly, copy }: ControlProps) {
  const common = {
    id,
    name: field.name,
    required: field.required,
    "aria-invalid": invalid ? (true as const) : undefined,
    "aria-describedby": describedBy,
  };
  switch (field.kind) {
    case "text":
      return (
        <Input
          {...common}
          type="text"
          maxLength={FORM_LIMITS.text}
          readOnly={readOnly}
          defaultValue={typed ?? field.defaultValue}
          data-truncate=""
        />
      );
    case "email":
      return (
        <Input
          {...common}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={FORM_LIMITS.email}
          readOnly={readOnly}
          defaultValue={typed}
          data-truncate=""
        />
      );
    case "textarea":
      return (
        <Textarea
          {...common}
          rows={5}
          maxLength={FORM_LIMITS.textarea}
          readOnly={readOnly}
          defaultValue={typed ?? field.defaultValue}
        />
      );
    case "select":
      return (
        <NativeSelect
          {...common}
          className="w-full"
          defaultValue={typed ?? field.defaultValue ?? ""}
        >
          <NativeSelectOption value="" disabled={field.required}>
            {field.placeholder ?? copy.choose}
          </NativeSelectOption>
          {field.options.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      );
    case "checkbox":
      return null;
  }
}

function FormBlockSection({
  settings,
  heading,
  intro,
  form,
  copy,
  action,
  status = "idle",
  errors = {},
  values,
  confirmation,
  messages = {},
  hiddenFields,
  formId,
  className,
}: FormBlockSectionProps) {
  const id = useId();
  const words = copy.form;
  const sending = status === "sending";
  const refused = Object.keys(errors).length > 0;
  const headingId = heading === undefined ? undefined : `${id}-heading`;
  return (
    <SectionFrame
      settings={{ ...settings, container: settings?.container ?? "narrow" }}
      slot="form-block-section"
      className={className}
      innerClassName="flex flex-col gap-6"
    >
      {heading === undefined && intro === undefined ? null : (
        <div className="flex min-w-0 flex-col gap-2">
          {heading === undefined ? null : <SectionHeading id={headingId}>{heading}</SectionHeading>}
          {intro === undefined ? null : (
            <p className="text-muted-foreground wrap-anywhere">{intro}</p>
          )}
        </div>
      )}
      <form
        id={formId}
        data-slot="form-block"
        data-status={status}
        action={action}
        // POST unless React owns the submission: a GET would put the answers in the URL.
        method={typeof action === "function" ? undefined : "post"}
        aria-labelledby={headingId}
        className="@container flex w-full min-w-0 flex-col gap-6"
      >
        {/* Enter in a text field submits the form; a disabled default button stops it while it is
            on its way. Hidden, so nobody meets it. */}
        {sending ? <button type="submit" disabled hidden tabIndex={-1} aria-hidden="true" /> : null}
        {hiddenFields}
        <div className="grid min-w-0 grid-cols-1 gap-4 @md:grid-cols-2">
          {form.fields.map((field, index) => {
            if (field.kind === "message")
              return (
                <Prose key={field.id} data-slot="form-block-message" className="@md:col-span-2">
                  {messages[field.id]}
                </Prose>
              );
            const controlId = `${id}-${index}`;
            const errorId = `${controlId}-error`;
            const error = errors[field.name];
            const typed = values?.[field.name];
            const span = field.width === "half" ? "" : "@md:col-span-2";
            const message =
              error === undefined ? null : (
                <p
                  id={errorId}
                  data-slot="form-block-error"
                  className="flex items-start gap-2 text-sm leading-snug text-destructive"
                >
                  <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 wrap-break-word">{errorText(field, error, words)}</span>
                </p>
              );
            if (field.kind === "checkbox")
              return (
                <Field
                  key={field.name}
                  data-slot="form-block-field"
                  data-field={field.name}
                  data-invalid={error === undefined ? undefined : true}
                  className={cn("gap-2", span)}
                >
                  <label className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 text-sm leading-snug">
                    <input
                      type="checkbox"
                      id={controlId}
                      name={field.name}
                      required={field.required}
                      // After an answer, a box keeps what was posted: unticked posts nothing.
                      defaultChecked={values === undefined ? field.defaultChecked : typed === "on"}
                      aria-invalid={error === undefined ? undefined : true}
                      aria-describedby={error === undefined ? undefined : errorId}
                      className="size-4 shrink-0 accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring"
                    />
                    <span className="min-w-0 wrap-break-word">
                      {field.label}
                      {field.required ? null : (
                        <span className="text-muted-foreground"> {words.optional}</span>
                      )}
                    </span>
                  </label>
                  {message}
                </Field>
              );
            return (
              <Field
                key={field.name}
                data-slot="form-block-field"
                data-field={field.name}
                data-invalid={error === undefined ? undefined : true}
                className={cn("gap-2", span)}
              >
                <FieldLabel htmlFor={controlId} className="flex-wrap">
                  {field.label}{" "}
                  {field.required ? null : (
                    <span className="font-normal text-muted-foreground">{words.optional}</span>
                  )}
                </FieldLabel>
                <Control
                  field={field}
                  id={controlId}
                  describedBy={error === undefined ? undefined : errorId}
                  invalid={error !== undefined}
                  typed={typed}
                  readOnly={sending}
                  copy={words}
                />
                {message}
              </Field>
            );
          })}
        </div>
        <div role="status" aria-live="polite" data-slot="form-block-status">
          {sending ? <VisuallyHidden>{words.sending}</VisuallyHidden> : null}
          {status === "done" ? (
            <div className="flex items-start gap-2 text-sm leading-snug">
              <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              <div className="min-w-0 wrap-break-word">{confirmation ?? <p>{words.done}</p>}</div>
            </div>
          ) : null}
          {status === "error" ? (
            <p className="flex items-start gap-2 text-sm leading-snug text-destructive">
              <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 wrap-break-word">
                {refused ? words.invalid : words.unavailable}
              </span>
            </p>
          ) : null}
        </div>
        <Button
          type={sending ? "button" : "submit"}
          disabled={sending}
          focusableWhenDisabled={sending}
          aria-busy={sending ? true : undefined}
          className="w-full aria-disabled:pointer-events-none aria-disabled:opacity-50 @md:w-auto @md:self-start"
        >
          {sending ? <Spinner aria-hidden="true" label={words.sending} /> : null}
          <span data-slot="form-block-submit-label">
            {sending ? words.sending : (form.submitLabel ?? words.submit)}
          </span>
        </Button>
      </form>
    </SectionFrame>
  );
}

export { FormBlockSection };
export type { FormBlockSectionProps, FormFieldError, FormStatus };
