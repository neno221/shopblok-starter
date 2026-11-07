// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `hero`, D50, D79). A page's opening band:
// an eyebrow, the heading, a line and up to two calls to action, beside the editor's picture (under
// them on a phone, so the heading is read and seen first). Optionally a countdown to an
// offer's end, which the server renders from the time it rendered (D50, CountdownTimer), and up to
// four products from a `productSource`. The heading is the page's `<h1>` when the
// hero opens the page (`headingLevel={1}`), and then its picture is preloaded; otherwise an `<h2>`.
// The cards' titles are one level below the heading. A server component; the countdown's clock is
// the only island. The pieces it shares with the family's other members are in `parts.tsx` (T80).
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import {
  HeroActions,
  HeroEyebrow,
  HeroHeading,
  HeroProducts,
  HeroSubheading,
  type HeroSectionProps,
} from "./parts";

function HeroStandard({
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
  return (
    <SectionFrame
      data-variant="standard"
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName="flex flex-col gap-10"
    >
      <div
        className={cn(
          "grid grid-cols-1 items-center gap-8",
          image !== undefined && "md:grid-cols-2 md:gap-12",
        )}
      >
        <div className="flex min-w-0 flex-col items-start gap-4 md:gap-6">
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
        {image === undefined ? null : (
          <Image
            src={image.src}
            alt={image.alt}
            ratio="landscape"
            radius="xl"
            sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
            priority={headingLevel === 1}
            className="w-full"
            data-slot="hero-image"
          />
        )}
      </div>
      <HeroProducts
        products={products}
        copy={copy}
        locale={locale}
        headingLevel={headingLevel}
        prefetch={prefetch}
      />
    </SectionFrame>
  );
}

export { HeroStandard };
export type { HeroSectionProps };
