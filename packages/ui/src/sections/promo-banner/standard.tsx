// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `promoBanner`, D79). An offer: the heading,
// the editor's words, a code to copy (CopyCodeChip; Medusa checks it when it is entered at the
// cart, so nothing here promises it works), when the offer ends, the small print and a link, beside
// the editor's picture when there is one. The end is written in the market's time zone, as the
// countdown's is, so the server and the browser write the same text; an offer past its end is left
// out by the storefront. A server component; the code's copy button is the only island. T82 moved
// its parts to `parts.tsx`, which the other members share.
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import {
  PromoCode,
  PromoEnds,
  PromoLink,
  PromoTerms,
  PromoText,
  promoEnds,
  type PromoBannerSectionProps,
} from "./parts";

/** The first member's card: the picture beside the offer from `md`, above it on a phone. */
function PromoBannerCard({
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
}: PromoBannerSectionProps) {
  const ends = promoEnds(endsAt, copy, locale, timeZone);
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center overflow-hidden rounded-xl border bg-card text-card-foreground",
        image !== undefined && "md:grid-cols-2",
      )}
    >
      {image === undefined ? null : (
        <Image
          src={image.src}
          alt={image.alt}
          ratio="landscape"
          radius="none"
          sizes="(min-width: 1280px) 640px, (min-width: 768px) 50vw, 100vw"
          className="w-full"
        />
      )}
      <div className="flex min-w-0 flex-col items-start gap-4 p-6 md:p-10">
        <SectionHeading>{heading}</SectionHeading>
        <PromoText text={text} />
        <PromoCode code={code} copy={copy} locale={locale} />
        <PromoEnds ends={ends} />
        <PromoLink link={link} copy={copy} prefetch={prefetch} />
        <PromoTerms terms={terms} />
      </div>
    </div>
  );
}

function PromoBannerStandard(props: PromoBannerSectionProps) {
  const { settings, className } = props;
  return (
    <SectionFrame
      data-variant="standard"
      settings={settings}
      slot="promo-banner-section"
      className={className}
    >
      <PromoBannerCard {...props} />
    </SectionFrame>
  );
}

export { PromoBannerCard, PromoBannerStandard };
export type { PromoBannerSectionProps };
