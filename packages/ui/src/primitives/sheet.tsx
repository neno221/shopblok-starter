// Vendored from shadcn/ui (`shadcn add sheet`, CLI 4.21.4, style base-vega), 2026-10-17. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): `side` is `top`, `bottom`,
// `inline-start` or `inline-end` (default `inline-end`), so a sheet opens on the reading end of the
// page in either direction, with its slide mirrored by `rtl:`; the backdrop is the `overlay` token,
// and backdrop and popup sit on the `--z-modal` layer; the close button is 44 px (Button size
// `icon`) and its text is a required `closeLabel`, not English; the portal goes to
// `usePortalContainer()` (D45); logical properties; light only (no `dark:`).
// A client component: it is Base UI's Dialog, which keeps the open state, moves focus and takes
// function props (`onOpenChange`, `render`) that only a client module can receive.
"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "@shopblok/ui/lib/utils";
import { usePortalContainer } from "@shopblok/ui/primitives/portal-container";

import { Button } from "@shopblok/ui/atoms/button";
import { XIcon } from "lucide-react";

type SheetSide = "top" | "bottom" | "inline-start" | "inline-end";

/** The text of the close button is required whenever the button is shown. */
type CloseButtonProps =
  { showCloseButton?: true; closeLabel: string } | { showCloseButton: false; closeLabel?: never };

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  const container = usePortalContainer();
  return <SheetPrimitive.Portal data-slot="sheet-portal" container={container} {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-(--z-modal) bg-overlay transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "inline-end",
  showCloseButton = true,
  closeLabel,
  ...props
}: SheetPrimitive.Popup.Props & CloseButtonProps & { side?: SheetSide }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-(--z-modal) flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0",
          // Top and bottom: a full-width strip that slides vertically.
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem]",
          // Start and end: a side panel on the reading start or end; it slides toward its own edge,
          // which `rtl:` mirrors.
          "data-[side=inline-start]:inset-y-0 data-[side=inline-start]:start-0 data-[side=inline-start]:h-full data-[side=inline-start]:w-3/4 data-[side=inline-start]:border-e data-[side=inline-start]:data-ending-style:translate-x-[-2.5rem] data-[side=inline-start]:data-starting-style:translate-x-[-2.5rem] data-[side=inline-start]:sm:max-w-sm rtl:data-[side=inline-start]:data-ending-style:translate-x-[2.5rem] rtl:data-[side=inline-start]:data-starting-style:translate-x-[2.5rem]",
          "data-[side=inline-end]:inset-y-0 data-[side=inline-end]:end-0 data-[side=inline-end]:h-full data-[side=inline-end]:w-3/4 data-[side=inline-end]:border-s data-[side=inline-end]:data-ending-style:translate-x-[2.5rem] data-[side=inline-end]:data-starting-style:translate-x-[2.5rem] data-[side=inline-end]:sm:max-w-sm rtl:data-[side=inline-end]:data-ending-style:translate-x-[-2.5rem] rtl:data-[side=inline-end]:data-starting-style:translate-x-[-2.5rem]",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" className="absolute end-2 top-2" size="icon" />}
          >
            <XIcon aria-hidden="true" />
            <span className="sr-only">{closeLabel}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    // `pe-14` keeps a title out from under the corner close button (44 px at 8 px from the edge).
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4 pe-14", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("leading-snug font-medium text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
export type { SheetSide };
