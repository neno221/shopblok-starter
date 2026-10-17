// Vendored from shadcn/ui (`shadcn add collapsible`, CLI 4.21.4, style base-vega), 2026-10-17. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): the trigger is at least 44 × 44 px
// (`min-h-11 min-w-11`, D32), whether it is the plain button or a `render` of a Button; the focus
// ring is full strength (D35).
// A client component: Base UI's Collapsible keeps the open state, and its parts take function props
// (`onOpenChange`, `render`) that only a client module can receive.
"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { cn } from "@shopblok/ui/lib/utils";

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ className, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        "min-h-11 min-w-11 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
