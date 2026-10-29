// Ours (T63, SETUP.md "Blocks (T63)"; SPEC §7.4 `mediaWithText`). A picture beside the editor's
// text: from `lg` up in two columns, the picture on the side the editor picked (`imageSide`, in the
// reading direction); below it the picture comes first, above the text. The text is the heading,
// the rich text (the children, rendered by the storefront from Lexical) and up to two calls to
// action. A server component.
import type { MediaWithTextSection as MediaWithTextSectionData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { Prose } from "@shopblok/ui/sections/prose";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import type * as React from "react";

type MediaWithTextSectionProps = MediaWithTextSectionData & {
  /** The rich text under the heading. */
  children?: React.ReactNode;
  copy: Pick<SectionsCopy, "newTab">;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function MediaWithTextSection({
  settings,
  heading,
  image,
  imageSide,
  links,
  children,
  copy,
  prefetch,
  className,
}: MediaWithTextSectionProps) {
  return (
    <SectionFrame
      settings={settings}
      slot="media-with-text-section"
      data-image-side={imageSide}
      className={className}
      innerClassName="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12"
    >
      <Image
        src={image.src}
        alt={image.alt}
        sizes="(min-width: 1024px) 50vw, 100vw"
        ratio="landscape"
        radius="lg"
        className={cn("w-full", imageSide === "end" && "lg:order-last")}
      />
      <div className="flex min-w-0 flex-col gap-6">
        {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
        {children === undefined ? null : <Prose>{children}</Prose>}
        <SectionLinks links={links} newTabLabel={copy.newTab} prefetch={prefetch} />
      </div>
    </SectionFrame>
  );
}

export { MediaWithTextSection };
export type { MediaWithTextSectionProps };
