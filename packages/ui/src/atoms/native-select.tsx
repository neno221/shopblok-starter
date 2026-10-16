// Vendored from shadcn/ui (`shadcn add native-select`, CLI 4.21.4, style base-vega), 2026-10-16. MIT,
// see packages/ui/NOTICE.md. Edited (SETUP.md, "shadcn and ReUI (T21)"): 44 px tall and no `sm`
// size (D32), the focus ring at full strength (D35), logical properties, the options on the popover
// tokens instead of the system colours `Canvas` and `CanvasText`, light only (no `dark:`). The
// browser cuts the chosen option to the box, so the select says so (`data-truncate`, D34).
import * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size">;

function NativeSelect({ className, ...props }: NativeSelectProps) {
  return (
    <div
      className={cn(
        "group/native-select relative w-fit has-[select:disabled]:opacity-50",
        className,
      )}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-truncate=""
        className="h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent py-1 ps-3 pe-9 text-base shadow-xs transition-[color,box-shadow] outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-popover text-popover-foreground", className)}
      {...props}
    />
  );
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-popover text-popover-foreground", className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
