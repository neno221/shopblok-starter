// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The promo
// banner's `ticket` member: a coupon card centred in the section, its offer (the heading, the words
// and the end) on one side of a perforated line and the code to copy with the link on the other,
// side by side from `md` and one above the other on a phone. The perforation is a dashed rule with
// a round notch at each end, cut in the section's own fill, so it reads as a coupon on every
// surface; it is decoration (hidden from assistive technology). The small print follows the card.
// No picture. A server component; the code's copy button is the only island.
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import {
  PromoCode,
  PromoEnds,
  PromoLink,
  PromoTerms,
  PromoText,
  promoEnds,
  type PromoBannerSectionProps,
} from "./parts";

/**
 * A notch: a circle in the section's fill (its surface), centred on the card's edge. The
 * perforation's own box reaches the edges and clips the half outside, so the card clips nothing and
 * its words are never cut (the DS's clip check).
 */
const notch = "absolute size-6 rounded-full border bg-background in-data-[surface=muted]:bg-muted";

function PromoBannerTicket({
  settings,
  heading,
  text,
  code,
  terms,
  endsAt,
  link,
  copy,
  locale,
  timeZone,
  prefetch,
  className,
}: PromoBannerSectionProps) {
  const ends = promoEnds(endsAt, copy, locale, timeZone);
  return (
    <SectionFrame
      data-variant="ticket"
      settings={settings}
      slot="promo-banner-section"
      className={className}
      innerClassName="flex flex-col items-center gap-4"
    >
      <div
        data-slot="promo-banner-ticket"
        className="relative flex w-full max-w-3xl min-w-0 flex-col rounded-xl border bg-card text-card-foreground md:flex-row"
      >
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 p-6 text-center md:items-start md:p-8 md:text-start">
          <h2 className="text-2xl font-semibold text-balance wrap-anywhere md:text-3xl">
            {heading}
          </h2>
          <PromoText text={text} />
          <PromoEnds ends={ends} />
        </div>
        <div
          aria-hidden="true"
          data-slot="promo-banner-perforation"
          className="pointer-events-none relative -my-3 h-6 shrink-0 overflow-hidden md:my-0 md:-mx-3 md:h-auto md:w-6"
        >
          <span className="absolute inset-x-6 top-[11px] h-0 border-t-2 border-dashed md:inset-x-auto md:inset-y-6 md:start-[11px] md:h-auto md:w-0 md:border-t-0 md:border-s-2" />
          <span className={cn(notch, "-start-3 top-0 md:start-0 md:-top-3")} />
          <span
            className={cn(notch, "-end-3 top-0 md:end-auto md:start-0 md:top-auto md:-bottom-3")}
          />
        </div>
        <div className="flex min-w-0 flex-col items-center justify-center gap-3 p-6 md:p-8">
          <PromoCode code={code} copy={copy} locale={locale} />
          <PromoLink link={link} copy={copy} prefetch={prefetch} className="justify-center" />
        </div>
      </div>
      <PromoTerms terms={terms} className="max-w-3xl text-center" />
    </SectionFrame>
  );
}

export { PromoBannerTicket };
