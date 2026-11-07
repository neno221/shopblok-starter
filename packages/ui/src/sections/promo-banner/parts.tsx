// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; D99). What the promo banner's
// members share, moved out of `standard.tsx` (T64) with the same classes, so the first member's
// pixels are unchanged: the props, the end as a sentence in the market's time zone, and the offer's
// parts (the words, the code to copy, the end, the link and the small print). Server components.
import { formatDate, formatMessage } from "@shopblok/i18n";
import type { PromoBannerSection as PromoBannerSectionData } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { CopyCodeChip } from "@shopblok/ui/molecules/copy-code-chip";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionLinks } from "@shopblok/ui/sections/section-links";
import type * as React from "react";

/**
 * The `popup` member's island (T82): the shop's, which shows the card at the window's end corner
 * once per offer, after the cookie choice (`components/cms/promo-popup.tsx`). It gets the card's
 * contents and the id of its heading. Without it (the design system) the card is drawn in place.
 */
type PromoPopupSlot = (card: { body: React.ReactNode; labelledBy: string }) => React.ReactNode;

type PromoBannerSectionProps = PromoBannerSectionData & {
  copy: Pick<SectionsCopy, "newTab" | "copyCode" | "promoBanner" | "countdown">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The IANA time zone the end is written in: the market's (UTC unless given). */
  timeZone?: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  /** `countdown`: stays at the contract's `now` and does not tick (the design system's states). */
  frozen?: boolean;
  /** `popup`: the shop's island (above). */
  popup?: PromoPopupSlot;
  /**
   * 1 when the band opens the page and its heading is the page's title (the `full-bleed` member
   * only, T82); 2 by default.
   */
  headingLevel?: 1 | 2;
  className?: string;
};

/** "Offer ends 30 November 2026, 13:30 UTC", in the market's time zone; none without an end. */
function promoEnds(
  endsAt: string | undefined,
  copy: PromoBannerSectionProps["copy"],
  locale: string,
  timeZone = "UTC",
): string | undefined {
  return endsAt === undefined
    ? undefined
    : formatMessage(
        copy.promoBanner.ends,
        {
          date: formatDate(endsAt, locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
            timeZone,
          }),
        },
        locale,
      );
}

/** The editor's paragraphs. */
function PromoText({
  text,
  className,
}: {
  text: readonly string[] | undefined;
  className?: string;
}) {
  if (text === undefined) return null;
  return (
    <div
      className={cn(
        "flex max-w-prose flex-col gap-3 text-base text-pretty wrap-anywhere",
        className,
      )}
    >
      {text.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

/** The code to copy (CopyCodeChip, its only island). */
function PromoCode({
  code,
  copy,
  locale,
  className,
}: {
  code: string | undefined;
  copy: PromoBannerSectionProps["copy"];
  locale: string;
  className?: string;
}) {
  if (code === undefined) return null;
  return (
    <CopyCodeChip discount={{ code }} copy={copy.copyCode} locale={locale} className={className} />
  );
}

/** The end, as a sentence. */
function PromoEnds({ ends, className }: { ends: string | undefined; className?: string }) {
  if (ends === undefined) return null;
  return (
    <p data-slot="promo-banner-ends" className={cn("text-sm font-medium wrap-anywhere", className)}>
      {ends}
    </p>
  );
}

/** The editor's link, a button unless they chose a text link. */
function PromoLink({
  link,
  copy,
  prefetch,
  className,
}: Pick<PromoBannerSectionProps, "link" | "copy" | "prefetch"> & { className?: string }) {
  if (link === undefined) return null;
  return (
    <SectionLinks
      links={[link]}
      newTabLabel={copy.newTab}
      prefetch={prefetch}
      className={className}
    />
  );
}

/** The small print. */
function PromoTerms({ terms, className }: { terms: string | undefined; className?: string }) {
  if (terms === undefined) return null;
  return (
    <p
      data-slot="promo-banner-terms"
      className={cn("text-xs text-pretty wrap-anywhere text-muted-foreground", className)}
    >
      {terms}
    </p>
  );
}

export { PromoCode, PromoEnds, PromoLink, PromoTerms, PromoText, promoEnds };
export type { PromoBannerSectionProps, PromoPopupSlot };
