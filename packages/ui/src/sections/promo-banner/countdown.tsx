// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D50). The promo
// banner's `countdown` member: the offer around a large countdown to its end, centred in a card:
// the heading and the words above, the time left in large digits (CountdownTimer, which counts from
// the `now` the server rendered at and never from the reader's clock, D50, so a prerendered page and
// its hydration agree), then the code to copy, the link and the small print. The countdown's
// sentence says when the offer ends, so the end is not written twice. The contract refuses this
// member without an end and a `now`. A server component; the clock and the code's copy button are
// its islands.
import { CountdownTimer } from "@shopblok/ui/molecules/countdown-timer";
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

/** CountdownTimer drawn large: its boxes taller, its digits display-sized from `md`. */
const LARGE =
  "max-w-2xl [&_[data-unit]]:py-4 [&_[data-unit]>span:first-child]:text-4xl md:[&_[data-unit]>span:first-child]:text-6xl [&_[data-slot=countdown-timer-label]]:text-center";

function PromoBannerCountdown({
  settings,
  heading,
  text,
  code,
  terms,
  endsAt,
  now,
  link,
  copy,
  locale,
  timeZone,
  prefetch,
  frozen,
  className,
}: PromoBannerSectionProps) {
  return (
    <SectionFrame
      data-variant="countdown"
      settings={settings}
      slot="promo-banner-section"
      className={className}
    >
      <div
        data-slot="promo-banner-countdown"
        className="mx-auto flex max-w-3xl min-w-0 flex-col items-center gap-5 rounded-xl border bg-card p-6 text-center text-card-foreground md:p-10"
      >
        <h2 className="text-2xl font-semibold text-balance wrap-anywhere md:text-4xl">{heading}</h2>
        <PromoText text={text} className="items-center" />
        {endsAt === undefined || now === undefined ? (
          <PromoEnds ends={promoEnds(endsAt, copy, locale, timeZone)} />
        ) : (
          <CountdownTimer
            countdown={{ endsAt, now }}
            copy={copy.countdown}
            locale={locale}
            timeZone={timeZone}
            frozen={frozen}
            className={LARGE}
          />
        )}
        <PromoCode code={code} copy={copy} locale={locale} />
        <PromoLink link={link} copy={copy} prefetch={prefetch} className="justify-center" />
        <PromoTerms terms={terms} />
      </div>
    </SectionFrame>
  );
}

export { PromoBannerCountdown };
