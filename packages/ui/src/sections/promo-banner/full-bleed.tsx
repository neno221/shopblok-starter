// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D100, D103). The
// promo banner's `full-bleed` member: the editor's picture fills the band from edge to edge and the
// offer lies over it at the start, on the `overlay` token's scrim (D100's rule for text on a
// picture: light text keeps 5.7:1 on a white photo, with the tokens inside remapped so the code's
// box, the link and the focus ring keep their contrast). The band starts at the section's top edge,
// so when the banner opens a page the transparent header lies over its picture, which the section
// says with `data-under-header` (`SectionFrame`'s `underHeader`, D103, T80's rule). The contract
// refuses this member without a picture. A server component; the code's copy button is the only
// island.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import {
  SectionFrame,
  SectionHeading,
  sectionFrameClasses,
} from "@shopblok/ui/sections/section-frame";
import { overlayTokens } from "../overlay-tokens";
import {
  PromoCode,
  PromoEnds,
  PromoLink,
  PromoTerms,
  PromoText,
  promoEnds,
  type PromoBannerSectionProps,
} from "./parts";

function PromoBannerFullBleed({
  settings,
  heading,
  text,
  code,
  terms,
  endsAt,
  image,
  link,
  copy,
  locale,
  timeZone,
  prefetch,
  className,
}: PromoBannerSectionProps) {
  const { inner } = sectionFrameClasses(settings);
  const ends = promoEnds(endsAt, copy, locale, timeZone);
  return (
    <SectionFrame
      data-variant="full-bleed"
      // Only a picture behind the words lets the transparent header lie over the banner (D103).
      underHeader={image !== undefined}
      settings={settings}
      slot="promo-banner-section"
      // The band starts at the section's top edge; the section's space stays under it.
      className={cn("pt-0 md:pt-0", className)}
      innerClassName="max-w-none px-0 md:px-0 lg:px-0"
    >
      <div
        data-slot="promo-banner-band"
        className="relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden md:min-h-[30rem]"
      >
        {image === undefined ? null : (
          <Image
            src={image.src}
            alt={image.alt}
            radius="none"
            sizes="100vw"
            className="absolute inset-0 -z-10 aspect-auto h-full"
            data-slot="promo-banner-image"
          />
        )}
        <div className={cn(inner, "py-10 md:py-14")}>
          <div
            data-slot="promo-banner-scrim"
            className={cn(
              "flex max-w-xl min-w-0 flex-col items-start gap-4 rounded-xl bg-overlay p-6 md:p-8",
              overlayTokens,
            )}
          >
            <SectionHeading>{heading}</SectionHeading>
            <PromoText text={text} />
            <PromoCode code={code} copy={copy} locale={locale} />
            <PromoEnds ends={ends} />
            <PromoLink link={link} copy={copy} prefetch={prefetch} />
            <PromoTerms terms={terms} />
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

export { PromoBannerFullBleed };
