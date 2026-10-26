// Ours (T53, SETUP.md "Auth and account (T53)"). The pieces the account's templates build their
// plain forms from (`auth`, `account`, `order-lookup`): a labelled text field with its hint and its
// error (the error first in `aria-describedby`, so it is read before the hint), the form's alert
// when no field is to blame, and the polite status line a done step leaves ("Your changes have been
// saved."). Each field is a native input, so every form posts without scripts. Server components.
import { Input } from "@shopblok/ui/atoms/input";
import { cn } from "@shopblok/ui/lib/utils";
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";
import type * as React from "react";

type TextFieldProps = Omit<React.ComponentProps<"input">, "id" | "name"> & {
  /** The input's id; its hint and error take theirs from it. */
  id: string;
  name: string;
  label: string;
  /** Drawn after the label, for a field that may stay empty ("(optional)"). */
  optionalLabel?: string;
  hint?: string;
  /** What is wrong with the value, in words; none: nothing. */
  error?: string;
};

function TextField({
  id,
  name,
  label,
  optionalLabel,
  hint,
  error,
  className,
  ...props
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const described = [error === undefined ? null : errorId, hint === undefined ? null : hintId]
    .filter((each) => each !== null)
    .join(" ");
  return (
    <div data-slot="form-field" className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm leading-snug font-medium wrap-break-word">
        {label}
        {optionalLabel === undefined ? null : (
          <span className="font-normal text-muted-foreground"> {optionalLabel}</span>
        )}
      </label>
      <Input
        id={id}
        name={name}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={described === "" ? undefined : described}
        {...props}
      />
      {error === undefined ? null : (
        <p
          id={errorId}
          data-slot="form-field-error"
          className="flex items-start gap-1.5 text-sm leading-snug text-destructive"
        >
          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="min-w-0 wrap-break-word">{error}</span>
        </p>
      )}
      {hint === undefined ? null : (
        <p id={hintId} className="text-sm leading-snug wrap-break-word text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

/** The form's error when no field is to blame: an alert, said at once. */
function FormAlert({ children, slot }: { children: React.ReactNode; slot: string }) {
  return (
    <p
      role="alert"
      data-slot={slot}
      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm leading-snug text-foreground"
    >
      <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
      <span className="min-w-0 wrap-break-word">{children}</span>
    </p>
  );
}

/** What a step just done says: a polite status, with a check mark. */
function FormStatus({ children, slot }: { children: React.ReactNode; slot: string }) {
  return (
    <p
      role="status"
      data-slot={slot}
      className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/5 p-3 text-sm leading-snug text-foreground"
    >
      <CircleCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
      <span className="min-w-0 wrap-break-word">{children}</span>
    </p>
  );
}

export { FormAlert, FormStatus, TextField };
export type { TextFieldProps };
