// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a). The hero's
// `centered` member: the words centred in a narrow column, above a wide picture across the
// content's width, then the products. The words never sit on the picture. A server component.
import { Image } from "@shopblok/ui/atoms/image";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import {
  HeroActions,
  HeroEyebrow,
  HeroHeading,
  HeroProducts,
  HeroSubheading,
  type HeroSectionProps,
} from "./parts";

function HeroCentered({
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
      data-variant="centered"
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName="flex flex-col items-center gap-10"
    >
      <div className="flex w-full max-w-3xl min-w-0 flex-col items-center gap-4 text-center md:gap-6">
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
          className="justify-center"
        />
      </div>
      {image === undefined ? null : (
        <Image
          src={image.src}
          alt={image.alt}
          ratio="video"
          radius="xl"
          sizes="(min-width: 1280px) 1216px, 100vw"
          priority={headingLevel === 1}
          className="w-full"
          data-slot="hero-image"
        />
      )}
      <HeroProducts
        products={products}
        copy={copy}
        locale={locale}
        headingLevel={headingLevel}
        prefetch={prefetch}
        className="w-full"
      />
    </SectionFrame>
  );
}

export { HeroCentered };
