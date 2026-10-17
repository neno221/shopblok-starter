// Vendored from shadcn/ui (`shadcn add breadcrumb`, CLI 4.21.4, style base-vega), 2026-10-17. MIT,
// see packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): the navigation's name and the
// ellipsis's text are required `label` props in the page's language (the kit hard-coded
// "breadcrumb" and "More", and hid the ellipsis's text with `aria-hidden`); a link is a 44 × 44 px
// target (`min-h-11 min-w-11`, D32: a breadcrumb is a row of links, not running text) and draws
// the ring at full strength (D35); the separator's chevron turns with `rtl:rotate-180` to point
// along the reading direction. An ellipsis that opens a menu goes inside a 44 px trigger of its
// own. A client component because BreadcrumbLink calls Base UI's `useRender`, a hook (it needs
// `useMemo` and `useRef`, which React does not export to server components); a server page can
// still render every part of it, and passes only plain props.
"use client";

import type * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@shopblok/ui/lib/utils";
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";

type BreadcrumbProps = Omit<React.ComponentProps<"nav">, "aria-label" | "aria-labelledby"> & {
  /** The navigation's accessible name ("Breadcrumb", in the page's language). */
  label: string;
};

function Breadcrumb({ className, label, ...props }: BreadcrumbProps) {
  return <nav aria-label={label} data-slot="breadcrumb" className={cn(className)} {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xs transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "breadcrumb-link",
    },
  });
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRightIcon className="rtl:rotate-180" />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  label,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** What the ellipsis stands for, read out in its place ("More", in the page's language). */
  label: string;
}) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      className={cn("flex size-5 items-center justify-center [&>svg]:size-4", className)}
      {...props}
    >
      <MoreHorizontalIcon aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
export type { BreadcrumbProps };
