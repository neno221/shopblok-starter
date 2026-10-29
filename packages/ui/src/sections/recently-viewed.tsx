// Ours (T64, SETUP.md "Commerce blocks (T64)"; SPEC §7.4 `recentlyViewed`, D61, ADR 0004). The
// visitor's recently viewed products as a carousel under the editor's heading. The list is the
// visitor's (D44): the server knows only the heading, and the storefront's island reads the
// browser's store (T49's, the one the product page fills) and passes the cards in. With no card
// the section draws nothing, not even its frame, so a first visit shows no empty band. No hooks and
// no events of its own: the island renders it, and so does the design system.
import type { RecentlyViewedSection as RecentlyViewedSectionData } from "@shopblok/registry/contracts";
import { ProductCarousel } from "@shopblok/ui/organisms/product-carousel";
import type { SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SectionFrame } from "@shopblok/ui/sections/section-frame";

type RecentlyViewedSectionProps = RecentlyViewedSectionData & {
  copy: Pick<SectionsCopy, "products">;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** next/link's `prefetch`; the design system passes `false`. */
  prefetch?: boolean | null;
  className?: string;
};

function RecentlyViewedSection({
  settings,
  heading,
  products,
  copy,
  locale,
  prefetch,
  className,
}: RecentlyViewedSectionProps) {
  if (products.length === 0) return null;
  return (
    <SectionFrame settings={settings} slot="recently-viewed-section" className={className}>
      <ProductCarousel
        title={heading}
        products={products}
        variant="standard"
        copy={copy.products}
        locale={locale}
        prefetch={prefetch}
      />
    </SectionFrame>
  );
}

export { RecentlyViewedSection };
export type { RecentlyViewedSectionProps };
