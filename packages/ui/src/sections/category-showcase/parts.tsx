// Ours (T81, SETUP.md "Catalog block variants (T81)"; D99). What the category showcase's members
// share: the heading and the line over the tiles, and the editor's link under them, moved here from
// `standard.tsx` with their classes unchanged, so the first member's pixels are M4's. Server parts.
import type { CategoryShowcaseSection as CategoryShowcaseSectionData } from "@shopblok/registry/contracts";
import { SectionHeading } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import type NextLink from "next/link";
import type * as React from "react";
import type { CategoryShowcaseSectionProps } from "./standard";

// The hrefs are strings the app built; `next/link` takes whatever the app's typed routes allow.
type LinkHref = React.ComponentProps<typeof NextLink>["href"];

type CategoryTileData = CategoryShowcaseSectionData["tiles"][number];

/** The heading and the line over the tiles; nothing when the editor wrote neither. */
function CategoryShowcaseIntro({
  heading,
  intro,
  headingId,
}: {
  heading?: string;
  intro?: string;
  /** The heading's id, for a list or a carousel it names. */
  headingId?: string;
}) {
  if (heading === undefined && intro === undefined) return null;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {heading === undefined ? null : <SectionHeading id={headingId}>{heading}</SectionHeading>}
      {intro === undefined ? null : (
        <p className="max-w-prose text-base text-pretty wrap-anywhere text-muted-foreground">
          {intro}
        </p>
      )}
    </div>
  );
}

/** The editor's link under the tiles. */
function CategoryShowcaseLink({
  link,
  copy,
  prefetch,
}: Pick<CategoryShowcaseSectionProps, "link" | "copy" | "prefetch">) {
  return link === undefined ? null : (
    <SectionLinks links={[link]} newTabLabel={copy.newTab} prefetch={prefetch} />
  );
}

/** The list's or the carousel's name: the heading when there is one, else the catalog's words. */
function namedBy(headingId: string, heading: string | undefined, label: string) {
  return heading === undefined ? { "aria-label": label } : { "aria-labelledby": headingId };
}

export { CategoryShowcaseIntro, CategoryShowcaseLink, namedBy };
export type { CategoryTileData, LinkHref };
