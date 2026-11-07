// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a). The promo
// banner's `strip` member: a thin band on the muted fill with the offer on one line where it fits
// (the heading, its first paragraph, the code to copy and the link), wrapping and centred on a
// phone; the end and the small print follow in small type. No picture: the band is for a page's
// top or between sections. A server component; the code's copy button is the only island.
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import {
  PromoCode,
  PromoEnds,
  PromoLink,
  PromoTerms,
  promoEnds,
  type PromoBannerSectionProps,
} from "./parts";

function PromoBannerStrip({
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
      data-variant="strip"
      settings={settings}
      slot="promo-banner-section"
      className={className}
    >
      <div
        data-slot="promo-banner-strip"
        className="flex flex-col items-center gap-2 rounded-lg bg-muted px-4 py-3 text-center"
      >
        <div className="flex max-w-full min-w-0 flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <h2 className="text-base font-semibold text-balance wrap-anywhere">{heading}</h2>
          {text?.[0] === undefined ? null : (
            <p className="text-sm text-pretty wrap-anywhere">{text[0]}</p>
          )}
          {/* The chip's status line is under the code: it keeps its room, so the row stays put. */}
          <PromoCode code={code} copy={copy} locale={locale} className="pt-6.5" />
          <PromoLink link={link} copy={copy} prefetch={prefetch} />
        </div>
        {ends === undefined && terms === undefined ? null : (
          <div className="flex max-w-full flex-wrap justify-center gap-x-4 gap-y-1">
            <PromoEnds ends={ends} className="text-xs" />
            <PromoTerms terms={terms} />
          </div>
        )}
      </div>
    </SectionFrame>
  );
}

export { PromoBannerStrip };
