// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The media with
// text's `overlap` member: the text (the heading, the editor's rich text and the links) on a card
// that overlaps the picture's edge. From `lg` the picture takes seven of twelve columns on the
// editor's side and the card the five on the other, laid over the picture's edge by one column and
// centred on its height; below `lg` the picture comes first and the card rises over its bottom
// edge. The order in the markup is the reading order at every width. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { Prose } from "@shopblok/ui/sections/prose";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import type { MediaWithTextSectionProps } from "./standard";

function MediaWithTextOverlap({
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
  const end = imageSide === "end";
  return (
    <SectionFrame
      data-variant="overlap"
      settings={settings}
      slot="media-with-text-section"
      data-image-side={imageSide}
      className={className}
      innerClassName="grid grid-cols-1 items-center lg:grid-cols-12"
    >
      <Image
        src={image.src}
        alt={image.alt}
        sizes="(min-width: 1024px) 60vw, 100vw"
        ratio="landscape"
        radius="lg"
        className={cn(
          "w-full lg:row-start-1",
          end ? "lg:col-span-7 lg:col-start-6" : "lg:col-span-7 lg:col-start-1",
        )}
      />
      <div
        data-slot="media-with-text-card"
        className={cn(
          "relative z-10 mx-4 -mt-12 flex min-w-0 flex-col gap-6 rounded-lg border bg-card p-6 text-card-foreground shadow-md md:mx-10 md:p-8 lg:row-start-1 lg:mx-0 lg:mt-0",
          end ? "lg:col-span-6 lg:col-start-1" : "lg:col-span-6 lg:col-start-7",
        )}
      >
        {heading === undefined ? null : <SectionHeading>{heading}</SectionHeading>}
        {children === undefined ? null : <Prose>{children}</Prose>}
        <SectionLinks links={links} newTabLabel={copy.newTab} prefetch={prefetch} />
      </div>
    </SectionFrame>
  );
}

export { MediaWithTextOverlap };
