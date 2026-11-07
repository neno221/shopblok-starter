// Ours (T80, SETUP.md "Hero variants and the transparent header (T80)"; M5 plan §1a). The hero's
// `text` member: words only, the heading in display type, no picture (an editor's picture is not
// drawn), then the products if the source has any. Nothing lies under the transparent header here:
// the section has no `data-under-header` (D103). A server component.
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import {
  HeroActions,
  HeroEyebrow,
  HeroHeading,
  HeroProducts,
  HeroSubheading,
  type HeroSectionProps,
} from "./parts";

function HeroText({
  settings,
  eyebrow,
  heading,
  subheading,
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
      data-variant="text"
      settings={settings}
      slot="hero-section"
      className={className}
      innerClassName="flex flex-col gap-10"
    >
      <div className="flex max-w-5xl min-w-0 flex-col items-start gap-6 md:gap-8">
        <HeroEyebrow>{eyebrow}</HeroEyebrow>
        <HeroHeading
          level={headingLevel}
          className="text-5xl leading-none tracking-tight md:text-7xl lg:text-8xl"
        >
          {heading}
        </HeroHeading>
        <HeroSubheading className="md:text-xl">{subheading}</HeroSubheading>
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

export { HeroText };
