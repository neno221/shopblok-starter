// Vendored from shadcn/ui (`shadcn add skeleton`, CLI 4.21.4, style base-vega), 2026-10-16. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "shadcn and ReUI (T21)"): no pulse for readers who ask
// for reduced motion (`motion-safe:`), and hidden from assistive technology (`aria-hidden`): the
// region that is loading says so, not each shape.
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };
