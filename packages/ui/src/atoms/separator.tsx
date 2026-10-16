// Vendored from shadcn/ui (`shadcn add separator`, CLI 4.21.4, style base-vega), 2026-10-16. MIT, see
// packages/ui/NOTICE.md. Unchanged apart from this header and formatting: it draws `border`, which
// D35 calls decorative.
"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "@shopblok/ui/lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
