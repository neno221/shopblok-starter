// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D100, D103). The
// media with text's `full-bleed` member: the picture fills the band from edge to edge and the text
// (the heading, the editor's rich text and the links) lies over it on the `overlay` token's scrim,
// at the start or the end as the editor's `imageSide` puts the picture's subject on the other side.
// D100's rule for text on a picture: light text keeps 5.7:1 on a white photo, and the tokens inside
// are remapped so the links, the buttons and the focus ring keep their contrast. The band starts at
// the section's top edge, so when it opens a page the transparent header lies over the picture,
// which the section says with `data-under-header` (D103, T80's rule). A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { Prose } from "@shopblok/ui/sections/prose";
import {
  SectionFrame,
  SectionHeading,
  sectionFrameClasses,
} from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import { overlayTokens } from "../overlay-tokens";
import type { MediaWithTextSectionProps } from "./standard";

function MediaWithTextFullBleed({
  settings,
  heading,
  image,
  imageSide,
  links,
  children,
  copy,
  prefetch,
  headingLevel,
  className,
}: MediaWithTextSectionProps) {
  const { inner } = sectionFrameClasses(settings);
  return (
    <SectionFrame
      data-variant="full-bleed"
      // The picture is always behind the words, so the transparent header may lie over it (D103).
      underHeader
      settings={settings}
      slot="media-with-text-section"
      data-image-side={imageSide}
      // The band starts at the section's top edge; the section's space stays under it.
      className={cn("pt-0 md:pt-0", className)}
      innerClassName="max-w-none px-0 md:px-0 lg:px-0"
    >
      <div
        data-slot="media-with-text-band"
        className="relative isolate flex min-h-[28rem] flex-col justify-center overflow-hidden md:min-h-[34rem]"
      >
        <Image
          src={image.src}
          alt={image.alt}
          radius="none"
          sizes="100vw"
          className="absolute inset-0 -z-10 aspect-auto h-full"
          data-slot="media-with-text-image"
        />
        <div className={cn(inner, "flex py-10 md:py-14", imageSide === "start" && "justify-end")}>
          <div
            data-slot="media-with-text-scrim"
            className={cn(
              "flex max-w-xl min-w-0 flex-col gap-6 rounded-xl bg-overlay p-6 md:p-8",
              overlayTokens,
            )}
          >
            {heading === undefined ? null : (
              <SectionHeading level={headingLevel}>{heading}</SectionHeading>
            )}
            {children === undefined ? null : <Prose>{children}</Prose>}
            <SectionLinks links={links} newTabLabel={copy.newTab} prefetch={prefetch} />
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

export { MediaWithTextFullBleed };
