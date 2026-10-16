// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). Button's `icon` size: 44 × 44 px, 48 × 48 for
// `lg` (D32). Its accessible name, `label`, is a required prop (the type enforces it, D30), and the
// icon inside is decoration.
import type * as React from "react";
import { Button } from "@shopblok/ui/atoms/button";

type IconButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "size" | "children" | "aria-label" | "aria-labelledby" | "title"
> & {
  /** The button's accessible name ("Add to wishlist", in the page's language). */
  label: string;
  /** The icon, as an `Icon` or a Lucide element. It is hidden from assistive technology. */
  children: React.ReactNode;
  size?: "default" | "lg";
};

function IconButton({ label, children, size = "default", ...props }: IconButtonProps) {
  return (
    <Button
      data-slot="icon-button"
      {...props}
      size={size === "lg" ? "icon-lg" : "icon"}
      aria-label={label}
    >
      <span aria-hidden="true" className="contents">
        {children}
      </span>
    </Button>
  );
}

export { IconButton };
export type { IconButtonProps };
