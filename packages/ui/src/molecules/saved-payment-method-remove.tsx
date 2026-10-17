// Ours (T34, SETUP.md "Cart, checkout and account molecules (T34)"). The part of SavedPaymentMethodCard
// that acts, split out so that only this reaches the browser: SavedPaymentMethodCard formats every
// string on the server and passes them in, so no message formatter ships here. A client component,
// because Base UI's Dialog keeps the open state and the trigger takes a click handler. The remove
// button opens a confirmation, the Dialog primitive as an alert dialog (`role="alertdialog"`: a
// question that needs an answer; a press outside does not dismiss it): the title, the card in words,
// Cancel and Remove. Focus goes to Cancel when it opens, the least destructive choice (the ARIA
// pattern's advice), Tab stays inside while it is modal, and Escape or Cancel close it with focus
// back on the remove button (Base UI returns it to the trigger). Remove submits the form inside the
// popup (`action`: M3's server action, or a URL, which is posted) with the card's id in a hidden
// field (`paymentMethodId`). While it is working the Remove button keeps its place and its
// size, says "Removing…", is `aria-disabled` and `type="button"` so it cannot submit twice, and a
// status region that is always in the popup says so; `status="removing"` is the caller's pending
// state (`useActionState`), and `useFormStatus` covers a form whose action is a function. A failure
// is `status="error"`: the dialog stays open and says so.
// Without JavaScript the trigger cannot open a dialog, so with a `confirmHref` the trigger is the
// submit button of a GET form to that page (the caller's confirmation page, which asks the same
// question and posts the same form) and the click is stopped from submitting once this has hydrated;
// without one, it is a plain button that does nothing until then, and nothing is removed.
"use client";

import { Button } from "@shopblok/ui/atoms/button";
import { Spinner } from "@shopblok/ui/atoms/spinner";
import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@shopblok/ui/primitives/dialog";
import { CircleAlertIcon } from "lucide-react";
import { useRef } from "react";
import { useFormStatus } from "react-dom";
import type * as React from "react";

type RemoveStatus = "idle" | "removing" | "error";

type SavedPaymentMethodRemoveProps = {
  /** The card's id: sent as `paymentMethodId`. */
  paymentMethodId: string;
  /** Every string, formatted by the server half. */
  copy: {
    /** The button's visible word. */
    remove: string;
    /** The button's accessible name, which says which card. */
    removeName: string;
    title: string;
    text: string;
    cancel: string;
    confirm: string;
    removing: string;
    error: string;
  };
  /** What `<form action>` takes: M3's server action, or a URL (the form is then posted). */
  action?: React.ComponentProps<"form">["action"];
  /** Without JavaScript: the page that asks the same question; the button goes there. */
  confirmHref?: string;
  status?: RemoveStatus;
  /** Open at first render: for the design system's states, inside its overlay box. */
  defaultOpen?: boolean;
  /** `false` for the design system's states (D45); a shop leaves it unset. */
  modal?: boolean | "trap-focus";
  /** The class of what holds the remove button (a form, with `confirmHref`, or a div). */
  className?: string;
  /** The class of the dialog's popup. */
  popupClassName?: string;
};

/** The Remove button inside the popup: a function action's own pending state works too. */
function ConfirmButton({
  label,
  busyLabel,
  busy,
}: {
  label: string;
  busyLabel: string;
  busy: boolean;
}) {
  const { pending } = useFormStatus();
  const working = busy || pending;
  return (
    <Button
      type={working ? "button" : "submit"}
      variant="destructive"
      disabled={working}
      focusableWhenDisabled={working}
      aria-busy={working ? true : undefined}
      data-slot="saved-payment-method-confirm-button"
      className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
    >
      {working ? <Spinner aria-hidden="true" label={busyLabel} /> : null}
      <span>{working ? busyLabel : label}</span>
    </Button>
  );
}

function SavedPaymentMethodRemove({
  paymentMethodId,
  copy,
  action,
  confirmHref,
  status = "idle",
  defaultOpen,
  modal,
  className,
  popupClassName,
}: SavedPaymentMethodRemoveProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const Wrapper = confirmHref === undefined ? "div" : "form";
  return (
    <Wrapper
      data-slot="saved-payment-method-remove-wrapper"
      {...(confirmHref === undefined ? {} : { action: confirmHref, method: "get" })}
      className={className}
    >
      <Dialog defaultOpen={defaultOpen} modal={modal} disablePointerDismissal>
        <DialogTrigger
          data-slot="saved-payment-method-remove"
          aria-label={copy.removeName}
          type={confirmHref === undefined ? "button" : "submit"}
          // With JavaScript the dialog asks; the page behind the link is for when it is not there.
          onClick={confirmHref === undefined ? undefined : (event) => event.preventDefault()}
          render={<Button variant="outline" className="w-full @sm:w-auto" />}
        >
          {copy.remove}
        </DialogTrigger>
        <DialogContent
          role="alertdialog"
          data-slot="saved-payment-method-confirm"
          showCloseButton={false}
          initialFocus={cancelRef}
          className={cn("@container", popupClassName)}
        >
          <form
            action={action}
            method={typeof action === "string" ? "post" : undefined}
            className="flex flex-col"
          >
            <input type="hidden" name="paymentMethodId" value={paymentMethodId} />
            <DialogHeader className="pe-0">
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription className="wrap-break-word">{copy.text}</DialogDescription>
            </DialogHeader>
            {/* Always in the popup, so what appears in it is announced; it has no height of its own
                until there is something to say. */}
            <div role="status" aria-live="polite" data-slot="saved-payment-method-confirm-status">
              {status === "removing" ? <VisuallyHidden>{copy.removing}</VisuallyHidden> : null}
              {status === "error" ? (
                <p className="mt-3 flex items-start gap-2 text-sm leading-snug text-destructive">
                  <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 wrap-break-word">{copy.error}</span>
                </p>
              ) : null}
            </div>
            {/* The buttons sit side by side when the popup is wide enough (24rem inside), not
                from a viewport width: the popup can be narrower than the viewport says (in the DS's
                box, three states side by side at 768 px), and two buttons would not fit in a row. */}
            <DialogFooter className="mt-6 sm:flex-col-reverse @sm:flex-row">
              <DialogClose render={<Button ref={cancelRef} variant="outline" type="button" />}>
                {copy.cancel}
              </DialogClose>
              <ConfirmButton
                label={copy.confirm}
                busyLabel={copy.removing}
                busy={status === "removing"}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}

export { SavedPaymentMethodRemove };
export type { RemoveStatus, SavedPaymentMethodRemoveProps };
