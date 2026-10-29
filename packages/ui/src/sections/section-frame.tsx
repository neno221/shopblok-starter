// Ours (T63, SETUP.md "Blocks (T63)"; D79, SPEC §7.4). What every section sits in: a `<section>`
// (or a `<div>`, for the spacer) that applies the block's `sectionSettings`: the anchor as its `id`,
// the space above and below, the surface, the width of its content and where it shows. A section is
// not named after its heading: a page may hold two FAQs with the same heading, and two regions of
// one name are an axe violation (`landmark-unique`); the `<h2>` is what a screen reader jumps by.
//
// The `inverse` surface is the theme turned over rather than a colour of its own: it sets the
// tokens the components read (`--background`, `--primary`…) to the theme's dark and light ends
// inside the section, so a button, a link or a muted line inside it keeps its contrast without
// knowing where it is. A server component.
import type { SectionSettings } from "@shopblok/registry/contracts";
import type * as React from "react";
import { cn } from "@shopblok/ui/lib/utils";

const spacings = {
  none: "py-0",
  small: "py-6 md:py-8",
  medium: "py-10 md:py-14",
  large: "py-16 md:py-24",
} as const;

const containers = {
  narrow: "max-w-3xl",
  default: "max-w-7xl",
  wide: "max-w-screen-2xl",
  full: "max-w-none",
} as const;

/** The theme turned over: the light end of the neutral scale on its dark end. */
const inverse =
  "[--background:var(--neutral-950)] [--foreground:var(--neutral-50)] [--card:var(--neutral-900)] [--card-foreground:var(--neutral-50)] [--muted:var(--neutral-900)] [--muted-foreground:var(--neutral-450)] [--primary:var(--neutral-50)] [--primary-foreground:var(--neutral-950)] [--secondary:var(--neutral-900)] [--secondary-foreground:var(--neutral-50)] [--accent:var(--neutral-900)] [--accent-foreground:var(--neutral-50)] [--border:var(--neutral-600)] [--input:var(--neutral-450)] [--ring:var(--neutral-450)]";

const surfaces = {
  default: "bg-background text-foreground",
  muted: "bg-muted text-foreground",
  inverse: cn(inverse, "bg-background text-foreground"),
} as const;

const visibilities = {
  all: "",
  // Shown below the `lg` breakpoint only, or from it only (the header's and the shell's line).
  mobile: "lg:hidden",
  desktop: "max-lg:hidden",
} as const;

/** The classes of a section's outer element and of its content's, for `settings`. */
function sectionFrameClasses(settings: SectionSettings = {}) {
  const {
    spacing = "medium",
    surface = "default",
    container = "default",
    visibility = "all",
  } = settings;
  return {
    outer: cn(
      "w-full min-w-0 scroll-mt-24",
      spacings[spacing],
      surfaces[surface],
      visibilities[visibility],
    ),
    inner: cn("mx-auto w-full min-w-0 px-4 md:px-6 lg:px-8", containers[container]),
  };
}

type SectionFrameProps = Omit<React.HTMLAttributes<HTMLElement>, "id"> & {
  settings?: SectionSettings;
  /** The section's `data-slot` (`faq-section`). */
  slot: string;
  /** `div` for a section that is not a part of the page's outline (the spacer). */
  as?: "section" | "div";
  /** The content's own classes (its grid, its alignment). */
  innerClassName?: string;
};

function SectionFrame({
  settings,
  slot,
  as: Root = "section",
  className,
  innerClassName,
  children,
  ...props
}: SectionFrameProps) {
  const classes = sectionFrameClasses(settings);
  return (
    <Root
      id={settings?.anchor}
      data-slot={slot}
      data-surface={settings?.surface ?? "default"}
      className={cn(classes.outer, className)}
      {...props}
    >
      <div className={cn(classes.inner, innerClassName)}>{children}</div>
    </Root>
  );
}

type SectionHeadingProps = React.ComponentProps<"h2">;

/** A section's heading: an `<h2>`, since a page's `<h1>` is its title. */
function SectionHeading({ className, ...props }: SectionHeadingProps) {
  return (
    <h2
      data-slot="section-heading"
      className={cn("text-2xl font-semibold text-balance wrap-anywhere md:text-3xl", className)}
      {...props}
    />
  );
}

export { SectionFrame, SectionHeading, sectionFrameClasses };
export type { SectionFrameProps, SectionHeadingProps };
