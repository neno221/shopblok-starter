// Vendored from shadcn/ui (`shadcn add spinner`, CLI 4.21.4, style base-vega), 2026-10-16. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "shadcn and ReUI (T21)"): its accessible name is a
// required `label` prop instead of the hard-coded English "Loading" (D30: atoms take every string
// as a prop), and it turns slower for readers who ask for reduced motion.
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";
import { Loader2Icon } from "lucide-react";

type SpinnerProps = Omit<React.ComponentProps<"svg">, "aria-label" | "role"> & {
  /** What is loading, read out by screen readers ("Loading", in the page's language). */
  label: string;
};

function Spinner({ className, label, ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label={label}
      className={cn(
        "size-4 animate-spin motion-reduce:animate-[spin_3s_linear_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Spinner };
