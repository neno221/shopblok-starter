// Vendored from shadcn/ui (`shadcn add pagination`, CLI 4.21.4, style base-vega), 2026-10-17. MIT,
// see packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): every string a reader sees or
// hears is a required `label` prop in the page's language (the navigation's name, "Previous",
// "Next", "More pages"; the kit hard-coded English and its ellipsis hid its own text with
// `aria-hidden`); a link's name is its visible text, shown from `sm` up and read out below it;
// `PaginationLink` is a plain `<a>` with the Button's classes (`buttonVariants`), because the kit's
// Base UI `Button` on an anchor (`nativeButton={false}`) gave it `role="button"` and `tabindex="0"`,
// and these are links (SPEC §8.4); the links are the Button's 44 px sizes (`icon` is 44 × 44;
// previous and next also have `min-w-11`; the ellipsis is `size-11` to match), the current page is
// the filled `default` variant (the kit's outline border is 1.26:1, under WCAG 1.4.11's 3:1),
// padding is logical (`ps-2!`, `pe-2!`), and the chevrons turn with `rtl:rotate-180` to point along
// the reading direction. No "use client": the file has no state and no events.
import type * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@shopblok/ui/lib/utils";

import { buttonVariants } from "@shopblok/ui/atoms/button";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";

type PaginationProps = Omit<React.ComponentProps<"nav">, "aria-label" | "aria-labelledby"> & {
  /** The navigation's accessible name ("Pagination", in the page's language). */
  label: string;
};

function Pagination({ className, label, ...props }: PaginationProps) {
  return (
    <nav
      role="navigation"
      aria-label={label}
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<VariantProps<typeof buttonVariants>, "size"> &
  React.ComponentProps<"a">;

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(buttonVariants({ variant: isActive ? "default" : "ghost", size }), className)}
      {...props}
    />
  );
}

type PaginationStepProps = Omit<
  React.ComponentProps<typeof PaginationLink>,
  "children" | "size" | "aria-label"
> & {
  /** The link's text and accessible name ("Previous" or "Next", in the page's language). */
  label: string;
};

function PaginationPrevious({ className, label, ...props }: PaginationStepProps) {
  return (
    <PaginationLink size="default" className={cn("min-w-11 ps-2!", className)} {...props}>
      <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" className="rtl:rotate-180" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, label, ...props }: PaginationStepProps) {
  return (
    <PaginationLink size="default" className={cn("min-w-11 pe-2!", className)} {...props}>
      <span className="sr-only sm:not-sr-only">{label}</span>
      <ChevronRightIcon data-icon="inline-end" aria-hidden="true" className="rtl:rotate-180" />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  label,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** What the gap stands for, read out in its place ("More pages", in the page's language). */
  label: string;
}) {
  return (
    <span
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-11 items-center justify-center [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
export type { PaginationProps, PaginationLinkProps };
