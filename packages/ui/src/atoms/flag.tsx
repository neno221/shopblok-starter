// Ours, on the tokens (T23, SETUP.md "Atoms (T23)"). A country's flag by its ISO 3166-1 alpha-2
// code, from `country-flag-icons` (MIT; SVG, not emoji, Principle 8), 3:2, as an image named by
// `label` (D30: "Cyprus", in the page's language). A server component on purpose, with no
// `"use client"`: the flags are rendered to HTML and cost no client JavaScript, so M2's
// MarketSwitcher must keep it out of any client component's imports. A code the set does not
// have draws an empty frame with the same name.
import * as flags from "country-flag-icons/react/3x2";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

type FlagCode = keyof typeof flags;

type FlagProps = Omit<React.ComponentProps<"svg">, "role" | "aria-label" | "children"> & {
  /** ISO 3166-1 alpha-2, in either case (`CY`, `cy`). */
  code: FlagCode | Lowercase<FlagCode>;
  /** The country's name: the image's accessible name. */
  label: string;
};

const frame = "inline-block aspect-[3/2] h-5 w-auto shrink-0 rounded-xs";

function Flag({ code, label, className, ...props }: FlagProps) {
  const Svg = (flags as Record<string, (props: React.ComponentProps<"svg">) => React.JSX.Element>)[
    code.toUpperCase()
  ];
  if (Svg === undefined) {
    return (
      <span
        data-slot="flag"
        role="img"
        aria-label={label}
        className={cn(frame, "bg-muted", className)}
      />
    );
  }
  return (
    <Svg
      data-slot="flag"
      data-code={code.toUpperCase()}
      role="img"
      aria-label={label}
      className={cn(frame, "border border-border", className)}
      {...props}
    />
  );
}

export { Flag };
export type { FlagCode, FlagProps };
