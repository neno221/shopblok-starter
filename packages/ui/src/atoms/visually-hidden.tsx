// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). Text for screen readers only: it keeps its
// place in the reading order and is not drawn (Tailwind's `sr-only`).
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

function VisuallyHidden({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="visually-hidden" className={cn("sr-only", className)} {...props} />;
}

export { VisuallyHidden };
