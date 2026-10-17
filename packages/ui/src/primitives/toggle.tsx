// Vendored from shadcn/ui (`shadcn add toggle-group` brought it in as a registry dependency; CLI
// 4.21.4, style base-vega), 2026-10-17. MIT, see packages/ui/NOTICE.md. Edited (SETUP.md,
// "Primitives (T31)"): 44 px and taller only (D32: `default` is `min-h-11 min-w-11`, `lg` is
// 48 px; the kit's `sm` is gone), long labels wrap (no `whitespace-nowrap`), the focus ring is at
// full strength (D35) with no ring tint when invalid, a pressed toggle is filled with `primary`
// (the kit's `bg-muted` is 1.1:1 against the page, under WCAG 1.4.11's 3:1), logical padding,
// light only (no `dark:`). No "use client": the file has no state and no events, and
// `toggleVariants` has to stay callable from server and client components alike.
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shopblok/ui/lib/utils";

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-md text-center text-sm font-medium transition-[color,box-shadow] outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/80 aria-pressed:hover:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-xs",
      },
      size: {
        default:
          "min-h-11 min-w-11 px-2.5 py-2 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        lg: "min-h-12 min-w-12 px-3 py-2.5 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
