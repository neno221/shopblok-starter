// Vendored from shadcn/ui (`shadcn add toast`, CLI 4.21.4, style base-vega), 2026-10-17. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): the action is a default Button (44
// px, D32) and the close button is Button size `icon` (44 px) with no extra hit area; no English
// text: the viewport's name (Base UI sets "Notifications") is the required `label` and the close
// button's name (it was "Close toast") the required `closeLabel`, both taken by `Toaster`; the
// viewport sits on the `--z-toast` layer (a toast's own `z-[calc(1000-…)]` only orders the stack
// inside it) and its portal goes to `usePortalContainer()` (D45); the focus ring is full strength
// (D35); logical properties; light only (no `dark:`). T33 (SETUP.md "Discovery and site-wide
// molecules (T33)"): `ToastList` draws what the Toast molecule's `showToast` adds: the toast's kind
// in words beside its icon (`data.kindLabel`, a string the caller took from the catalog; colour and
// a drawing are not the only sign of it), the icon in the kind's token colour (`ToastIcon` is now
// exported), the content as a grid (icon, text and close on the first row, the action under the
// text, so a long label does not squeeze the words), and a close button that leaves the tab order
// while Base UI hides it from assistive technology (`aria-hidden` on a tab stop is axe's
// `aria-hidden-focus`).
// A client component: Base UI's Toast keeps the toast list and its timers, `ToastList` reads them
// with a hook, and `toast` is the manager that callers share with `Toaster`.
"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cn } from "@shopblok/ui/lib/utils";
import { usePortalContainer } from "@shopblok/ui/primitives/portal-container";

import { Button } from "@shopblok/ui/atoms/button";
import {
  XIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";

const toast = ToastPrimitive.createToastManager();

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider {...props} />;
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  const container = usePortalContainer();
  return <ToastPrimitive.Portal data-slot="toast-portal" container={container} {...props} />;
}

/** `label` names the viewport's `region` landmark; it is required because Base UI's default is English. */
function ToastViewport({
  className,
  label,
  ...props
}: ToastPrimitive.Viewport.Props & { label: string }) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      aria-label={label}
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-(--z-toast) mx-auto w-auto max-w-sm outline-none sm:start-auto sm:end-4 sm:mx-0 sm:w-full",
        className,
      )}
      {...props}
    />
  );
}

function Toast({ className, ...props }: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "group/toast pointer-events-auto absolute end-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom rounded-2xl border bg-popover text-popover-foreground shadow-lg will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring",
        "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
        "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
        "after:absolute after:start-0 after:top-full after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
        "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
        "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
        "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
        "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
        "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
        className,
      )}
      {...props}
    />
  );
}

function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  render = <Button variant="outline" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

/** `closeLabel` is the button's accessible name (a 44 px icon button): the catalog's string. */
function ToastClose({
  className,
  children,
  closeLabel,
  render = <Button variant="ghost" size="icon" />,
  ...props
}: ToastPrimitive.Close.Props & { closeLabel: string }) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label={closeLabel}
      render={render}
      className={cn("relative shrink-0 text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

/** The icon of a toast's type, in the type's token colour; it says nothing on its own (the kind is also text). */
function ToastIcon({ type, className }: { type: string | undefined; className?: string }) {
  let icon: React.ReactNode = null;

  if (type === "success") {
    icon = <CircleCheckIcon className="text-success" aria-hidden="true" />;
  }

  if (type === "info") {
    icon = <InfoIcon className="text-info" aria-hidden="true" />;
  }

  if (type === "warning") {
    icon = <TriangleAlertIcon className="text-warning" aria-hidden="true" />;
  }

  if (type === "error") {
    icon = <OctagonXIcon className="text-destructive" aria-hidden="true" />;
  }

  if (type === "loading") {
    icon = <Loader2Icon className="animate-spin" aria-hidden="true" />;
  }

  if (!icon) {
    return null;
  }

  return (
    <span
      data-slot="toast-icon"
      className={cn(
        "shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
    >
      {icon}
    </span>
  );
}

/** The toast's kind in words ("Success"), above its title: `data.kindLabel` of the toast. */
function ToastKind({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="toast-kind"
      className={cn("text-xs font-medium text-foreground", className)}
      {...props}
    />
  );
}

/**
 * How a toast's content is laid out: the icon, the text and the close button on the first row, the
 * action under the text. The columns are named, so a toast without an icon keeps its text in the
 * second one.
 */
const toastLayout = {
  content: "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2",
  icon: "col-start-1 row-start-1 mt-0.5",
  text: "col-start-2 row-start-1 flex min-w-0 flex-col gap-1 py-1.5",
  action: "col-start-2 col-end-4 row-start-2 justify-self-start",
  close: "col-start-3 row-start-1",
} as const;

/**
 * Base UI sets `aria-hidden` on the close button until the stack is expanded (hovered or focused) or
 * the button has focus. A control that assistive technology cannot see must not be a tab stop (axe
 * `aria-hidden-focus`, WCAG 4.1.2), so it is `tabIndex={-1}` while hidden; focusing the viewport (F6)
 * expands the stack, unhides it and puts it back in the order.
 */
const closeButton: ToastPrimitive.Close.Props["render"] = (props) => (
  <Button
    variant="ghost"
    size="icon"
    {...props}
    tabIndex={
      props["aria-hidden"] === true || props["aria-hidden"] === "true" ? -1 : props.tabIndex
    }
  />
);

/** The kind's words a caller put in the toast's `data`, if it did. */
function kindLabelOf(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const label = (data as { kindLabel?: unknown }).kindLabel;
  return typeof label === "string" && label !== "" ? label : undefined;
}

function ToastList({ closeLabel }: { closeLabel: string }) {
  const { toasts } = ToastPrimitive.useToastManager();

  return toasts.map((toastItem) => {
    const kindLabel = kindLabelOf(toastItem.data);
    // The kind is part of the toast's name ("Error Payment failed"), not only a line for the eye
    // (WCAG 1.4.1, PR 55 review): Base UI names the toast by its title alone.
    const kindId = `${toastItem.id}-kind`;
    const titleId = `${toastItem.id}-title`;
    return (
      <Toast
        key={toastItem.id}
        toast={toastItem}
        {...(kindLabel === undefined ? {} : { "aria-labelledby": `${kindId} ${titleId}` })}
      >
        <ToastContent className={toastLayout.content}>
          <ToastIcon type={toastItem.type} className={toastLayout.icon} />
          <div className={toastLayout.text}>
            {kindLabel === undefined ? null : <ToastKind id={kindId}>{kindLabel}</ToastKind>}
            <ToastTitle id={titleId} className="wrap-anywhere" />
            <ToastDescription className="wrap-anywhere" />
          </div>
          <ToastAction className={toastLayout.action} />
          <ToastClose closeLabel={closeLabel} className={toastLayout.close} render={closeButton} />
        </ToastContent>
      </Toast>
    );
  });
}

/**
 * The provider, the portal, the viewport and the list of toasts. `label` names the notifications
 * region and `closeLabel` each toast's close button; both are the catalog's strings.
 */
function Toaster({
  children,
  toastManager = toast,
  label,
  closeLabel,
  ...props
}: ToastPrimitive.Provider.Props & { label: string; closeLabel: string }) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport label={label}>
          <ToastList closeLabel={closeLabel} />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastIcon,
  ToastKind,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  toastLayout,
  useToastManager,
};
