// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). A slot for the store's logo as an SVG: pass the
// `<svg>` as children (drawn with `currentColor`, so a brand can recolour it) and the store's name
// as `name`, which is its accessible name (D30). Without children it shows the name as text, so a
// store with no logo yet still has a header. The SVG is as tall as the slot and keeps its
// proportions.
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

type LogoProps = Omit<React.ComponentProps<"span">, "children" | "role" | "aria-label"> & {
  /** The store's name: the logo's accessible name. */
  name: string;
  /** The SVG mark. */
  children?: React.ReactNode;
};

function Logo({ name, children, className, ...props }: LogoProps) {
  const base = "inline-flex max-w-full items-center text-foreground";
  // `{svg && <Svg />}` with no SVG passes `false`: that is no logo too, not an empty image.
  if (children == null || children === false || children === "") {
    return (
      <span
        data-slot="logo"
        className={cn(
          base,
          "text-lg leading-snug font-semibold tracking-tight wrap-anywhere",
          className,
        )}
        {...props}
      >
        {name}
      </span>
    );
  }
  return (
    <span
      data-slot="logo"
      role="img"
      aria-label={name}
      className={cn(base, "h-8 [&>svg]:h-full [&>svg]:max-w-full [&>svg]:w-auto", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { Logo };
export type { LogoProps };
