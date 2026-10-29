// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `spacer`). Room between two sections, with a line
// across it or without. It is not part of the page's outline (a `<div>`, the line a separator), and
// its size is its own, so `sectionSettings`' spacing does not apply; the surface, the width and the
// visibility do. A server component.
import type { SpacerSection as SpacerSectionData } from "@shopblok/registry/contracts";
import { Separator } from "@shopblok/ui/atoms/separator";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";

const sizes = { small: "h-8", medium: "h-16", large: "h-24 md:h-32" } as const;

type SpacerSectionProps = SpacerSectionData & { className?: string };

function SpacerSection({ settings, size, divider, className }: SpacerSectionProps) {
  return (
    <SectionFrame
      as="div"
      settings={{ ...settings, spacing: "none" }}
      slot="spacer-section"
      data-size={size}
      className={className}
      innerClassName={cn("flex items-center", sizes[size])}
    >
      {divider ? <Separator /> : null}
    </SectionFrame>
  );
}

export { SpacerSection };
export type { SpacerSectionProps };
