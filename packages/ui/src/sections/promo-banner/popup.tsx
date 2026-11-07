// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D44, D102; WCAG
// 2.2.2, 2.4.11). The promo banner's `popup` member: the offer as a card at the window's end corner,
// once per visitor and offer, after the cookie choice; it takes no focus and goes with its close
// button or Escape. The card's contents (the heading, the words, the code to copy, the end, the
// link and the small print) are drawn here on the server and handed to the shop's island (`popup`,
// D42's slot for what is per visitor), which alone knows the cookie choice and whether this visitor
// has seen the offer, and loads the card's code only when it shows it (D102). In the page's flow
// the section draws the first member's look, shown only to a browser that runs no scripts (CSS's
// `scripting` media feature), so a visitor without scripts gets the offer in its place and a
// visitor with them gets nothing there and no shift. Without the island (the design system) the
// card is drawn in place, at the section's end. A server component.
import { cn } from "@shopblok/ui/lib/utils";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";
import { useId } from "react";
import {
  PromoCode,
  PromoEnds,
  PromoLink,
  PromoTerms,
  PromoText,
  promoEnds,
  type PromoBannerSectionProps,
} from "./parts";
import { PromoPopupFrame } from "./popup-frame";
import { PromoBannerCard } from "./standard";

/** The card's contents: the offer in the card's narrow column. */
function PopupBody({
  headingId,
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
}: PromoBannerSectionProps & { headingId: string }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-3">
      <h2 id={headingId} className="text-lg font-semibold text-balance wrap-anywhere">
        {heading}
      </h2>
      <PromoText text={text} className="text-sm" />
      <PromoCode code={code} copy={copy} locale={locale} />
      <PromoEnds ends={promoEnds(endsAt, copy, locale, timeZone)} />
      <PromoLink link={link} copy={copy} prefetch={prefetch} />
      <PromoTerms terms={terms} />
    </div>
  );
}

function PromoBannerPopup(props: PromoBannerSectionProps) {
  const { settings, popup, copy, className } = props;
  const headingId = useId();
  const body = <PopupBody {...props} headingId={headingId} />;
  if (popup === undefined)
    return (
      <SectionFrame
        data-variant="popup"
        settings={settings}
        slot="promo-banner-section"
        className={className}
        innerClassName="flex justify-end"
      >
        <PromoPopupFrame
          labelledBy={headingId}
          closeLabel={copy.promoBanner.close}
          placement="inline"
        >
          {body}
        </PromoPopupFrame>
      </SectionFrame>
    );
  return (
    <>
      <SectionFrame
        data-variant="popup"
        settings={settings}
        slot="promo-banner-section"
        // Drawn only where no script runs; with scripts the island shows the card instead.
        className={cn("[@media(scripting:enabled)]:hidden", className)}
      >
        <PromoBannerCard {...props} />
      </SectionFrame>
      {popup({ body, labelledBy: headingId })}
    </>
  );
}

export { PromoBannerPopup };
