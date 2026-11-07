// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a). The hero's
// `editorial` member, a magazine's opening: a large heading across both columns, then a tall
// picture beside a smaller second one with the line and the links under it (on a phone, one after
// the other: the heading, the tall picture, the second, the words). It needs both pictures (the
// contract refuses it without them). A server component.
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

function HeroEditorial({
  settings,
  eyebrow,
  heading,
  subheading,
  image,
  secondImage,
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
      data-variant="editorial"
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName="flex flex-col gap-10"
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-x-12 md:gap-y-10">
        <div className="flex min-w-0 flex-col items-start gap-4 md:col-span-12 md:gap-6">
          <HeroEyebrow>{eyebrow}</HeroEyebrow>
          <HeroHeading
            level={headingLevel}
            className="text-4xl leading-none tracking-tight md:text-6xl lg:text-7xl"
          >
            {heading}
          </HeroHeading>
        </div>
        {image === undefined ? null : (
          <Image
            src={image.src}
            alt={image.alt}
            ratio="portrait"
            radius="xl"
            sizes="(min-width: 1280px) 700px, (min-width: 768px) 58vw, 100vw"
            priority={headingLevel === 1}
            className="w-full md:col-span-7"
            data-slot="hero-image"
          />
        )}
        <div className="flex min-w-0 flex-col items-start gap-6 md:col-span-5 md:justify-end">
          {secondImage === undefined ? null : (
            <Image
              src={secondImage.src}
              alt={secondImage.alt}
              ratio="square"
              radius="xl"
              sizes="(min-width: 1280px) 480px, (min-width: 768px) 40vw, 66vw"
              className="w-2/3 md:w-full"
              data-slot="hero-second-image"
            />
          )}
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

export { HeroEditorial };
