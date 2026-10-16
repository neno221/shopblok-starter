// Vendored from shadcn/ui (`shadcn add switch`, CLI 4.21.4, style base-vega), 2026-10-16. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "shadcn and ReUI (T21)"): one size, the kit's 32 × 18.4 px
// track, whose `::after` is a 44 px tall hit area (D32: no `sm`); the focus ring at full strength
// (D35, also when invalid); the thumb moves the other way in a right-to-left page; light only (no `dark:`). Put it in a
// `Label` for a bigger target and a name.
"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@shopblok/ui/lib/utils";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-1.5 after:-inset-y-[13px] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive data-checked:bg-primary data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-background ring-0 transition-transform data-checked:translate-x-[calc(100%-2px)] data-unchecked:translate-x-0 rtl:data-checked:-translate-x-[calc(100%-2px)]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
