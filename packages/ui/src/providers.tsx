// Ours (T31, D47): what every root layout renders once around its page: Base UI's direction, which
// its sliders, toggle groups, menus and the carousel read instead of the document's `dir`; its
// tooltip provider, so all tooltips share one delay and open at once when the pointer moves from one
// to the next; and the toast manager with its viewport, so any client component can call
// `toast.add`. A client component: all three are React contexts. The toasts' region and close
// button are named in the page's language (`catalogs[locale].primitives.toast`), never in Base UI's
// English.
"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { TooltipProvider } from "@shopblok/ui/atoms/tooltip";
import { Toaster } from "@shopblok/ui/primitives/toast";
import type { ReactNode } from "react";

export type ProvidersCopy = {
  /** The toasts' landmark (`Notifications`). */
  toastRegion: string;
  /** Each toast's close button (`Close notification`). */
  toastClose: string;
};

export function Providers({
  copy,
  dir = "ltr",
  children,
}: {
  copy: ProvidersCopy;
  /** The page's direction, as `<html dir>` says it; the four store languages are all `ltr`. */
  dir?: "ltr" | "rtl";
  children: ReactNode;
}) {
  return (
    <DirectionProvider direction={dir}>
      <TooltipProvider>
        <Toaster label={copy.toastRegion} closeLabel={copy.toastClose}>
          {children}
        </Toaster>
      </TooltipProvider>
    </DirectionProvider>
  );
}
