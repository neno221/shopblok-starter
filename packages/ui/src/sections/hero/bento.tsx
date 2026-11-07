// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a). The hero's
// `bento` member: the message in one tile on the muted fill, beside up to four products from its
// source as a two-by-two grid of cards (under it on a phone). Without products the editor's
// picture takes the second tile; with neither, the message runs across. The products are a list
// named as a grid, their names one level below the heading. A server component.
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

function HeroBento({
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
  const second = products.length > 0 ? "products" : image === undefined ? null : "image";
  return (
    <SectionFrame
      data-variant="bento"
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName={cn("grid grid-cols-1 gap-4 md:gap-6", second !== null && "md:grid-cols-2")}
    >
      <div
        data-slot="hero-bento-message"
        className="flex min-h-80 min-w-0 flex-col items-start justify-end gap-4 rounded-xl bg-muted p-6 md:gap-6 md:p-10"
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
      {second === "products" ? (
        <HeroProducts
          products={products}
          copy={copy}
          locale={locale}
          headingLevel={headingLevel}
          prefetch={prefetch}
          className="gap-4 md:grid-cols-2 md:gap-x-6"
        />
      ) : second === "image" && image !== undefined ? (
        <Image
          src={image.src}
          alt={image.alt}
          ratio="square"
          radius="xl"
          sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
          priority={headingLevel === 1}
          className="h-full w-full"
          data-slot="hero-image"
        />
      ) : null}
    </SectionFrame>
  );
}

export { HeroBento };
