// Vendored from shadcn/ui (`shadcn add button`, CLI 4.21.4, style base-vega), 2026-10-16. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "shadcn and ReUI (T21)"): 44 px and taller only (D32: no
// `xs`, `sm`, `icon-xs` or `icon-sm`), the focus ring at full strength (`ring-ring`, D35), a solid
// destructive variant (the tinted one is 4.01:1), long labels wrap (`min-h-11`, no
// `whitespace-nowrap`), logical properties, light only (no `dark:`).
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shopblok/ui/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-center text-sm font-medium transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive),var(--foreground)_15%)] focus-visible:border-destructive focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-11 gap-1.5 px-4 py-2 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
        lg: "min-h-12 gap-2 px-5 py-2.5 has-data-[icon=inline-end]:pe-4 has-data-[icon=inline-start]:ps-4",
        icon: "size-11",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
