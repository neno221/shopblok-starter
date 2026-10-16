// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). Wraps a Lucide icon with the size tokens. It
// is decoration (`aria-hidden`) unless it has a `label`, and then it is an image with that name
// (`role="img"`, D30: the name is a prop). It draws in the text's colour (`currentColor`).
import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

const sizes = {
  xs: "size-3",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
} as const;

type IconProps = Omit<React.ComponentProps<LucideIcon>, "size" | "aria-label" | "role"> & {
  /** The Lucide icon to draw (`HeartIcon`). */
  icon: LucideIcon;
  size?: keyof typeof sizes;
  /** Its accessible name, when the icon says something on its own. Without it the icon is hidden. */
  label?: string;
};

function Icon({ icon: Glyph, size = "sm", label, className, ...props }: IconProps) {
  return (
    <Glyph
      data-slot="icon"
      className={cn("shrink-0", sizes[size], className)}
      {...(label === undefined
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label, "aria-hidden": undefined })}
      {...props}
    />
  );
}

export { Icon };
export type { IconProps };
