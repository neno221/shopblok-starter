// Vendored from shadcn/ui (`shadcn add badge`, CLI 4.21.4, style base-vega), 2026-10-16. MIT, see
// packages/ui/NOTICE.md. Edited (SETUP.md, "shadcn and ReUI (T21)"): the focus ring at full
// strength (D35), a solid destructive variant (the tinted one is 4.01:1), long text wraps (no
// `whitespace-nowrap`), logical properties, light
// only (no `dark:`). A badge is a label, not a control, so D32's 44 px applies only when it is
// rendered as a link, and then the link's own box is the target.
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shopblok/ui/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex min-h-5 w-fit max-w-full shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-center text-xs font-medium transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive text-destructive-foreground focus-visible:ring-destructive/20 [a]:hover:bg-[color-mix(in_oklch,var(--destructive),var(--foreground)_15%)]",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
