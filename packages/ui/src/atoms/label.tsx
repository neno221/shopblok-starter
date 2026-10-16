// Vendored from shadcn/ui (`shadcn add label`, CLI 4.21.4, style base-vega), 2026-10-16. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "shadcn and ReUI (T21)"): long labels wrap instead of
// overflowing (`leading-snug`, not `leading-none`), and the disabled state follows Base UI's
// `data-disabled` on the control as well as `:disabled`. A label around a Checkbox, Radio or Switch
// is their 44 px target (D32): give it `min-h-11`.
"use client";

import * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-50 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
