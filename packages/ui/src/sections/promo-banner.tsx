// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `promoBanner`, D79). An offer: the heading,
// the editor's words, a code to copy (CopyCodeChip; Medusa checks it when it is entered at the
// cart, so nothing here promises it works), when the offer ends, the small print and a link, beside
// the editor's picture when there is one. The end is written in the market's time zone, as the
// countdown's is, so the server and the browser write the same text; an offer past its end is left
// out by the storefront. A server component; the code's copy button is the only island.
import { formatDate, formatMessage } from "@shopblok/i18n";
import type { PromoBannerSection as PromoBannerSectionData } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { CopyCodeChip } from "@shopblok/ui/molecules/copy-code-chip";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame, SectionHeading } from "@shopblok/ui/sections/section-frame";
import { SectionLinks } from "@shopblok/ui/sections/section-links";

type PromoBannerSectionProps = PromoBannerSectionData & {
  copy: Pick<SectionsCopy, "newTab" | "copyCode" | "promoBanner">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The IANA time zone the end is written in: the market's (UTC unless given). */
  timeZone?: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function PromoBannerSection({
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
  timeZone = "UTC",
  prefetch,
  className,
}: PromoBannerSectionProps) {
  const ends =
    endsAt === undefined
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
  return (
    <SectionFrame settings={settings} slot="promo-banner-section" className={className}>
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
          {text === undefined ? null : (
            <div className="flex max-w-prose flex-col gap-3 text-base text-pretty wrap-anywhere">
              {text.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
          {code === undefined ? null : (
            <CopyCodeChip discount={{ code }} copy={copy.copyCode} locale={locale} />
          )}
          {ends === undefined ? null : (
            <p data-slot="promo-banner-ends" className="text-sm font-medium wrap-anywhere">
              {ends}
            </p>
          )}
          {link === undefined ? null : (
            <SectionLinks links={[link]} newTabLabel={copy.newTab} prefetch={prefetch} />
          )}
          {terms === undefined ? null : (
            <p
              data-slot="promo-banner-terms"
              className="text-xs text-pretty wrap-anywhere text-muted-foreground"
            >
              {terms}
            </p>
          )}
        </div>
      </div>
    </SectionFrame>
  );
}

export { PromoBannerSection };
export type { PromoBannerSectionProps };
