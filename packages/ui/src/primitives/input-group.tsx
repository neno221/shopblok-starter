// Vendored from shadcn/ui (`shadcn add input-group`, CLI 4.21.4, style base-vega), 2026-10-17. MIT,
// see packages/ui/NOTICE.md. Edited (SETUP.md, "Primitives (T31)"): the group is at least 44 px
// tall around the 44 px Input (D32), an addon that holds a button has no vertical padding, and
// `InputGroupButton` has two sizes, `default` and `icon` (44 px tall, 44 × 44), instead of the
// kit's four under 44 px, and may shrink so a long label wraps; the focus ring is at full strength
// (D35) with no ring tint when invalid (the destructive border marks it); logical properties
// (`ps-`, `pe-`, `-ms-`, `-me-`); light only (no `dark:`). A client component because
// `InputGroupAddon` has a click handler (a click on the addon's padding focuses the input).
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shopblok/ui/lib/utils";

import { Button } from "@shopblok/ui/atoms/button";
import { Input } from "@shopblok/ui/atoms/input";
import { Textarea } from "@shopblok/ui/atoms/textarea";

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex min-h-11 w-full min-w-0 items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot][aria-invalid=true]]:border-destructive has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pe-1.5 has-[>[data-align=inline-start]]:[&>input]:ps-1.5",
        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first ps-2 has-[>button]:-ms-1 has-[>button]:py-0 has-[>kbd]:ms-[-0.15rem]",
        "inline-end":
          "order-last pe-2 has-[>button]:-me-1 has-[>button]:py-0 has-[>kbd]:me-[-0.15rem]",
        "block-start":
          "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

/** A button inside a group: the ghost Button at its 44 px sizes (`icon` is 44 × 44). */
function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "default",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> & {
  size?: "default" | "icon";
  type?: "button" | "submit" | "reset";
}) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      size={size}
      className={cn("shrink shadow-none", className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
