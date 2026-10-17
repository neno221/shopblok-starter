// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"). Toasts of three kinds (success,
// error, information) on the toast primitive. Two parts. `showToast(manager, message, copy)` adds a
// `ToastMessage` to the toast manager that the `Toaster` in `Providers` draws (Base UI's Toast): it
// maps `kind` to Base UI's `type`, and takes the kind's words from the catalog into the toast's
// `data.kindLabel`, which the primitive's list draws beside the icon, so the kind is never colour or
// a drawing alone (WCAG 1.4.1). `Toast` draws one toast as that list does, without a manager: the
// design system's states, and a place to read what a toast looks like with any words. Announced
// politely, an error too: Base UI's `priority: "high"` is an assertive alert that reads only the
// title and description and puts `aria-hidden` on the toast, which is focusable (a violation of its
// own, and the toast cannot be reached by a screen reader's cursor); a toast follows the reader's
// own action (a click, a submit), which is a moment when the reader's attention is already there,
// and an error that must not be missed does not disappear: it stays until closed (`timeout: 0`),
// while a success or an information goes after 5 s, or 10 s with an action (a time limit the reader
// can extend by hovering or focusing the stack: Base UI pauses the timer; WCAG 2.2.1). A client
// component: `showToast` runs in the browser, the buttons take handlers, and the card reads an id.
"use client";

import type { Messages } from "@shopblok/i18n";
import type { ToastMessage } from "@shopblok/registry/contracts";
import { Button } from "@shopblok/ui/atoms/button";
import { cn } from "@shopblok/ui/lib/utils";
import {
  ToastIcon,
  ToastKind,
  toastLayout,
  type createToastManager,
} from "@shopblok/ui/primitives/toast";
import { XIcon } from "lucide-react";
import { useId } from "react";
import type * as React from "react";

type ToastCopy = Messages["molecules"]["toast"];

/** What `showToast` uses of a toast manager: the shared `toast` of the primitive, or one made with `createToastManager`. */
type ToastManager = Pick<ReturnType<typeof createToastManager>, "add" | "close">;

/** How long a toast stays, in ms; 0 keeps it until it is closed. */
const toastTimeouts = {
  /** A success or an information. */
  ordinary: 5000,
  /** One with an action: the reader needs time to reach it. */
  withAction: 10000,
  /** An error stays. */
  error: 0,
} as const;

/** How long this message stays, if the caller does not say. */
function timeoutOf(message: ToastMessage): number {
  if (message.kind === "error") return toastTimeouts.error;
  return message.actionLabel === undefined ? toastTimeouts.ordinary : toastTimeouts.withAction;
}

type ShowToastOptions = {
  /** What the action button does (the toast closes after it); only with an `actionLabel`. */
  onAction?: () => void;
  /** Called when the toast closes, by the reader, by the timer or by its action. */
  onClose?: () => void;
  /** Overrides how long it stays (ms; 0 until it is closed). */
  timeout?: number;
};

/**
 * Shows a toast. Returns its id, for `manager.close(id)`. Focus does not move: the live region of
 * the toast viewport announces it.
 */
function showToast(
  manager: ToastManager,
  message: ToastMessage,
  copy: ToastCopy,
  options: ShowToastOptions = {},
): string {
  const { onAction, onClose, timeout } = options;
  const id: string = manager.add({
    type: message.kind,
    title: message.title,
    description: message.description,
    timeout: timeout ?? timeoutOf(message),
    data: { kindLabel: copy.kinds[message.kind] },
    onClose,
    actionProps:
      message.actionLabel === undefined
        ? undefined
        : {
            children: message.actionLabel,
            onClick: () => {
              onAction?.();
              manager.close(id);
            },
          },
  });
  return id;
}

type ToastProps = Omit<React.ComponentProps<"div">, "children" | "title"> &
  ToastMessage & {
    /** The wording, from the catalog's `molecules.toast`. */
    copy: ToastCopy;
    /** What the action button does; without it the button is drawn and does nothing. */
    onAction?: () => void;
    /** What the close button does; without it the button is drawn and does nothing. */
    onClose?: () => void;
  };

/**
 * One toast drawn as the primitive's list draws it: the icon and the kind in words, the title, the
 * description if there is one, the action if there is one, and the close button. A drawing: it
 * announces nothing and closes nothing by itself; `showToast` is how a page shows a live one.
 */
function Toast({
  kind,
  title,
  description,
  actionLabel,
  copy,
  onAction,
  onClose,
  className,
  ...props
}: ToastProps) {
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      data-slot="toast-card"
      data-kind={kind}
      className={cn(
        "w-full max-w-sm rounded-2xl border bg-popover p-4 text-popover-foreground shadow-lg",
        toastLayout.content,
        className,
      )}
      {...props}
    >
      <ToastIcon type={kind} className={toastLayout.icon} />
      <div className={toastLayout.text}>
        <ToastKind>{copy.kinds[kind]}</ToastKind>
        <p id={titleId} data-slot="toast-card-title" className="text-sm font-medium wrap-anywhere">
          {title}
        </p>
        {description === undefined ? null : (
          <p
            data-slot="toast-card-description"
            className="text-sm text-muted-foreground wrap-anywhere"
          >
            {description}
          </p>
        )}
      </div>
      {actionLabel === undefined ? null : (
        <Button
          type="button"
          variant="outline"
          data-slot="toast-card-action"
          className={cn("shrink-0", toastLayout.action)}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={copy.close}
        data-slot="toast-card-close"
        className={cn(
          "relative shrink-0 text-muted-foreground hover:text-foreground",
          toastLayout.close,
        )}
        onClick={onClose}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </div>
  );
}

export { Toast, showToast, toastTimeouts };
export type { ShowToastOptions, ToastManager, ToastProps };
