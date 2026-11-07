// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a, D100, D103).
// The hero's `overlay` member: the editor's picture fills the band from edge to edge and the words
// lie over it at the start, on the `overlay` token's scrim (60 % black: light text keeps 5.7:1 on
// a white photo, D100's rule for text on a picture). Inside the scrim the tokens are remapped as
// the transparent header remaps them, so the links, the countdown and the focus ring keep their
// own contrast pairing with no class of ours on them. The band starts at the section's top edge
// (the section's space is under it): when the hero opens a page, the transparent header lies over
// its picture, which the section says with `data-under-header` (`SectionFrame`'s `underHeader`,
// with the widths the section shows at) and the shell's CSS rule reads (D103). The products, if any, follow the band on the section's surface. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame, sectionFrameClasses } from "@shopblok/ui/sections/section-frame";
import {
  HeroActions,
  HeroEyebrow,
  HeroHeading,
  HeroProducts,
  HeroSubheading,
  type HeroSectionProps,
} from "./parts";

/**
 * The tokens inside the scrim: light text and ring, a light button with dark text, an outline
 * button on no fill, the countdown's boxes a darker scrim. Written in full so Tailwind finds them.
 */
const overlayTokens =
  "text-overlay-foreground [--foreground:var(--overlay-foreground)] [--muted-foreground:var(--overlay-foreground)] [--muted:var(--overlay)] [--background:transparent] [--border:var(--overlay-foreground)] [--ring:var(--overlay-foreground)] [--primary:var(--overlay-foreground)] [--primary-foreground:var(--neutral-950)]";

function HeroOverlay({
  settings,
  eyebrow,
  heading,
  subheading,
  image,
  links,
  countdown,
  products,
  copy,
  locale,
  headingLevel = 2,
  timeZone,
  frozen,
  prefetch,
  className,
}: HeroSectionProps) {
  const { inner } = sectionFrameClasses(settings);
  return (
    <SectionFrame
      data-variant="overlay"
      // Only a picture behind the words lets the transparent header lie over the hero (D103).
      underHeader={image !== undefined}
      settings={settings}
      slot="hero-section"
      // The band starts at the section's top edge; the section's space stays under it.
      className={cn("pt-0 md:pt-0", className)}
      innerClassName="max-w-none px-0 md:px-0 lg:px-0"
    >
      <div
        data-slot="hero-band"
        className="relative isolate flex min-h-[28rem] flex-col justify-end overflow-hidden md:min-h-[36rem] lg:min-h-[40rem]"
      >
        {image === undefined ? null : (
          <Image
            src={image.src}
            alt={image.alt}
            radius="none"
            sizes="100vw"
            priority={headingLevel === 1}
            className="absolute inset-0 -z-10 aspect-auto h-full"
            data-slot="hero-image"
          />
        )}
        <div className={cn(inner, "py-10 md:py-14")}>
          <div
            data-slot="hero-scrim"
            className={cn(
              "flex max-w-2xl min-w-0 flex-col items-start gap-4 rounded-xl bg-overlay p-6 md:gap-6 md:p-8",
              overlayTokens,
            )}
          >
            <HeroEyebrow>{eyebrow}</HeroEyebrow>
            <HeroHeading level={headingLevel}>{heading}</HeroHeading>
            <HeroSubheading>{subheading}</HeroSubheading>
            <HeroActions
              countdown={countdown}
              links={links}
              copy={copy}
              locale={locale}
              timeZone={timeZone}
              frozen={frozen}
              prefetch={prefetch}
            />
          </div>
        </div>
      </div>
      {products.length === 0 ? null : (
        <div className={cn(inner, "pt-10 md:pt-14")}>
          <HeroProducts
            products={products}
            copy={copy}
            locale={locale}
            headingLevel={headingLevel}
            prefetch={prefetch}
          />
        </div>
      )}
    </SectionFrame>
  );
}

export { HeroOverlay };
