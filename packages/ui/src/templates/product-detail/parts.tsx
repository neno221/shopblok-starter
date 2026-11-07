// Ours (T49, T83; SETUP.md "Product page (T49)", "Product page and quick view variants (T83)"; D56,
// D57, D61, D99, SPEC §8.4, SBP layouts/product-details.md). What the `product-detail` family's
// members share: the page's types and words, its root, its two islands' places, the picture list
// three of them draw from `md`, and what follows the buy box (the information, the reviews, the
// related products and the recently viewed row).
// - What follows the visitor's choice is the page's: `slots.buyBox` (its island, which reads
//   `?variant=` and draws the buy box and the sticky bar) and `slots.gallery` (the gallery that
//   shows the chosen colour). Without them the members draw both from their values, which is what
//   the design system shows and what the islands' `Suspense` fallbacks are: the default choice, in
//   the server's HTML (D61). Every member puts both where it lays the page out, so a page passes the
//   same slots whatever the `templates` global picks.
// - Each member's gallery has its own column, so its `sizes`, its thumbnails' place and whether its
//   first picture is the page's to preload differ: `GALLERY_LAYOUT[variant]` says so, and the page
//   builds its gallery island from it (the template draws a slot, it cannot reach into one).
// - The members that show every picture from `md` (`grid`, `stacked`, `wide`) draw them as plain
//   pictures (`PictureList`, server-rendered, no script) and keep the gallery for phones, where it
//   is the carousel: each is `display: none` at the other widths, so a reader meets one set and a
//   browser loads one (a lazy picture that is not drawn is not fetched). The list's first picture
//   is the one preloaded from `md`; below it the gallery's starting one is. Each says `1px` in its
//   `sizes` where it is not drawn, so its preload there is the smallest file
//   (`PHONE_GALLERY_SIZES`).
// - The buy box, the sticky bar and the reviews link to each other by the ids in
//   `PRODUCT_DETAIL_IDS`, so an island that draws them passes the same ones.
// - The information's rich texts (an editor's description, the shop's delivery text, T69) are the
//   page's too, `slots.richText`, since the registry holds no rich text. A product with no section
//   at all (no description, and the shop emptied its delivery text) draws no information.
import type { Messages } from "@shopblok/i18n";
import type { ProductDetailPage, ProductMedia, VariantOf } from "@shopblok/registry/contracts";
import { Image } from "@shopblok/ui/atoms/image";
import { cn } from "@shopblok/ui/lib/utils";
import { BuyBox, type BuyBoxCopy } from "@shopblok/ui/organisms/buy-box";
import {
  MobileStickyATC,
  type MobileStickyATCProps,
} from "@shopblok/ui/organisms/mobile-sticky-atc";
import {
  ProductCarousel,
  type ProductCarouselProps,
} from "@shopblok/ui/organisms/product-carousel";
import { ProductGallery } from "@shopblok/ui/organisms/product-gallery";
import { ProductInfoAccordions } from "@shopblok/ui/organisms/product-info-accordions";
import { ReviewsSection, type ReviewsSectionProps } from "@shopblok/ui/organisms/reviews-section";
import type * as React from "react";

/** The ids the buy box, the sticky bar and the reviews link each other with. */
type ProductDetailIds = {
  form: string;
  options: string;
  button: string;
  title: string;
  reviews: string;
};

/** A shop's page has one product, so its ids are fixed; the design system's states pass their own. */
const PRODUCT_DETAIL_IDS: ProductDetailIds = {
  form: "buy-box",
  options: "buy-box-options",
  button: "buy-box-add",
  title: "product-title",
  reviews: "reviews",
};

/** The gallery's column, from `md`: what its main picture's `sizes` says (the first member's). */
const GALLERY_SIZES = "(min-width: 768px) 55vw, 100vw";

/** How a member draws its gallery: the picture's `sizes`, the thumbnails' place, the preload. */
type GalleryLayout = {
  sizes: string;
  thumbnails: "side" | "below";
  /** The gallery's first picture is the page's largest: `false` where a picture list is, from `md`. */
  priority: boolean;
};

/**
 * Each member's gallery (T83). The page passes it to its gallery island and to the island's
 * fallback, so the shop's gallery is the one the member lays out. `grid`, `stacked` and `wide` show
 * the gallery below `md` only (their picture list from `md`), so its picture is the window's width.
 */
/**
 * The `sizes` of a gallery shown below `md` only (`grid`, `stacked`, `wide`; PR 120 review, item 1).
 * Its starting picture is preloaded, as every gallery's is, so a phone gets the picture the gallery
 * opens on (the default choice's) early. From `md` the gallery is not drawn, and `1px` makes the
 * browser's preload pick the smallest file there instead of a full-width one; `PictureList` does
 * the same below `md`, so each width preloads one picture at its size.
 */
const PHONE_GALLERY_SIZES = "(min-width: 768px) 1px, 100vw";

const GALLERY_LAYOUT: Record<VariantOf<"product-detail">, GalleryLayout> = {
  default: { sizes: GALLERY_SIZES, thumbnails: "side", priority: true },
  "thumbnails-below": {
    sizes: "(min-width: 768px) 50vw, 100vw",
    thumbnails: "below",
    priority: true,
  },
  grid: { sizes: PHONE_GALLERY_SIZES, thumbnails: "below", priority: true },
  stacked: { sizes: PHONE_GALLERY_SIZES, thumbnails: "below", priority: true },
  wide: { sizes: PHONE_GALLERY_SIZES, thumbnails: "below", priority: true },
  centered: { sizes: "(min-width: 640px) 36rem, 100vw", thumbnails: "below", priority: true },
};

/** Every word the page draws: the organisms' and molecules' own, picked from a catalog. */
type ProductDetailCopy = {
  breadcrumbs: Messages["molecules"]["breadcrumbs"];
  gallery: Messages["organisms"]["productGallery"];
  buyBox: BuyBoxCopy;
  sticky: MobileStickyATCProps["copy"];
  info: Messages["organisms"]["productInfoAccordions"];
  reviews: ReviewsSectionProps["copy"];
  carousel: ProductCarouselProps["copy"];
};

/** The page's words from a whole catalog (the app's `getMessages()`, the DS's `catalogs[locale]`). */
function productDetailCopy(messages: Messages): ProductDetailCopy {
  const { atoms, molecules, organisms } = messages;
  return {
    breadcrumbs: molecules.breadcrumbs,
    gallery: organisms.productGallery,
    buyBox: {
      buyBox: organisms.buyBox,
      variantSelector: molecules.variantSelector,
      priceBlock: molecules.priceBlock,
      quantityStepper: atoms.quantityStepper,
      stock: atoms.stock,
      rating: atoms.rating,
    },
    sticky: {
      mobileStickyAtc: organisms.mobileStickyAtc,
      priceBlock: molecules.priceBlock,
    },
    info: organisms.productInfoAccordions,
    reviews: {
      reviewsSection: organisms.reviewsSection,
      ratingSummary: molecules.ratingSummary,
      reviewItem: molecules.reviewItem,
      pagination: molecules.pagination,
      rating: atoms.rating,
    },
    carousel: {
      card: molecules.productCard,
      priceBlock: molecules.priceBlock,
      carousel: organisms.productCarousel,
    },
  };
}

type ProductDetailTemplateProps = ProductDetailPage & {
  copy: ProductDetailCopy;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** The address of a page of reviews, as ReviewsSection takes it. */
  reviewsHrefFor: (page: number) => string;
  /** The page's parts that follow the visitor; each one drawn from the values when left out. */
  slots?: {
    /** The buy box and the sticky bar: the shop's island in its `Suspense`. */
    buyBox?: React.ReactNode;
    /** The gallery that follows the chosen colour, laid out as `GALLERY_LAYOUT[variant]` says. */
    gallery?: React.ReactNode;
    /** The visitor's recently viewed products (a browser list), under the related ones. */
    recentlyViewed?: React.ReactNode;
    /**
     * The information's rich texts by section id (T69): an editor's description or delivery text,
     * rendered by the shop, drawn where the section has its `rich` block.
     */
    richText?: Readonly<Record<string, React.ReactNode>>;
  };
  /** The ids the parts link each other by: `PRODUCT_DETAIL_IDS` unless given (one per DS state). */
  ids?: ProductDetailIds;
  /** next/link's `prefetch` for every link; the design system passes `false`. */
  prefetch?: boolean | null;
  /** The element's id, the skip link's target. `main` unless given. */
  mainId?: string;
  /** `div` where the page has its `<main>` already (the design system's frame). */
  as?: "main" | "div";
  className?: string;
};

/** The page's `<main>` (or the DS's `div`), with the member's `data-variant` (D99). */
function DetailRoot({
  member,
  mainId = "main",
  as: Root = "main",
  className,
  frame,
  children,
}: Pick<ProductDetailTemplateProps, "mainId" | "as" | "className"> & {
  member: VariantOf<"product-detail">;
  /** The member's own classes for the root, before the page's. */
  frame?: string;
  children: React.ReactNode;
}) {
  return (
    <Root
      id={mainId}
      data-slot="product-detail-template"
      data-variant={member}
      className={cn(
        "mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-10 px-4 py-6 md:gap-16 md:px-6 md:py-8 lg:px-8",
        frame,
        className,
      )}
    >
      {children}
    </Root>
  );
}

/** The gallery: the page's island, or ProductGallery from the values, as the member lays it out. */
function detailGallery(props: ProductDetailTemplateProps, member: VariantOf<"product-detail">) {
  const { gallery, copy, locale, slots = {} } = props;
  const layout = GALLERY_LAYOUT[member];
  return (
    slots.gallery ?? (
      <ProductGallery
        {...gallery}
        copy={copy.gallery}
        locale={locale}
        sizes={layout.sizes}
        priority={layout.priority}
        {...(layout.thumbnails === "side" ? {} : { thumbnails: layout.thumbnails })}
      />
    )
  );
}

/** The buy box and the sticky bar: the page's island, or both from the values. */
function detailBuyBox({
  buyBox,
  sticky,
  copy,
  locale,
  slots = {},
  ids = PRODUCT_DETAIL_IDS,
}: ProductDetailTemplateProps) {
  return (
    slots.buyBox ?? (
      <>
        <BuyBox
          {...buyBox}
          copy={copy.buyBox}
          locale={locale}
          reviewsHref={`#${ids.reviews}`}
          formId={ids.form}
          optionsId={ids.options}
          buttonId={ids.button}
          titleId={ids.title}
        />
        <MobileStickyATC
          {...sticky}
          copy={copy.sticky}
          locale={locale}
          watch={ids.button}
          formId={ids.form}
          optionsHref={`#${ids.options}`}
        />
      </>
    )
  );
}

/** The information, or nothing for a product with no section. */
function DetailInfo({ info, copy, locale, prefetch, slots = {} }: ProductDetailTemplateProps) {
  return info.sections.length === 0 ? null : (
    <ProductInfoAccordions
      {...info}
      copy={copy.info}
      locale={locale}
      prefetch={prefetch}
      {...(slots.richText === undefined ? {} : { rich: slots.richText })}
    />
  );
}

/** What follows: the information (unless the member draws it elsewhere), the reviews, the rest. */
function DetailRest({
  withInfo = true,
  ...props
}: ProductDetailTemplateProps & { withInfo?: boolean }) {
  const {
    reviews,
    related,
    copy,
    locale,
    reviewsHrefFor,
    slots = {},
    ids = PRODUCT_DETAIL_IDS,
    prefetch,
  } = props;
  return (
    <>
      {withInfo ? <DetailInfo {...props} /> : null}
      <ReviewsSection
        {...reviews}
        id={ids.reviews}
        copy={copy.reviews}
        locale={locale}
        hrefFor={reviewsHrefFor}
        prefetch={prefetch}
      />
      {related === undefined ? null : (
        <ProductCarousel {...related} copy={copy.carousel} locale={locale} prefetch={prefetch} />
      )}
      {slots.recentlyViewed ?? null}
    </>
  );
}

/** A picture's frame: its own aspect ratio, so the page does not shift as it loads. */
const ratioOf = (item: ProductMedia): React.CSSProperties => ({
  aspectRatio: `${item.width} / ${item.height}`,
});

/**
 * Every picture of the product, from `md` only (`hidden md:grid`): in one column (`stacked`), two
 * (`grid`) or one row (`wide`'s band). Plain pictures in the server's HTML, each with its own
 * alternative text and ratio; the first is preloaded, at the list's `sizes`. Below `md` the member
 * shows the gallery instead.
 */
function PictureList({
  media,
  layout,
  sizes,
  className,
}: {
  media: readonly ProductMedia[];
  layout: "column" | "grid" | "band";
  /** The width of one picture from `md`, as `sizes` says it. */
  sizes: string;
  className?: string;
}) {
  return (
    <ul
      role="list"
      data-slot="product-detail-pictures"
      data-layout={layout}
      className={cn(
        "hidden min-w-0 items-start gap-3 md:grid",
        layout === "grid" && "md:grid-cols-2",
        layout === "band" && "md:auto-cols-fr md:grid-flow-col",
        className,
      )}
    >
      {media.map((item, index) => (
        <li key={index} className="relative min-w-0" style={ratioOf(item)}>
          <Image
            src={item.src}
            alt={item.alt}
            // Not drawn below `md`: `1px` keeps its preload there to the smallest file.
            sizes={`(min-width: 768px) ${sizes}, 1px`}
            priority={index === 0}
            radius="lg"
            className="absolute inset-0 aspect-auto h-full"
          />
        </li>
      ))}
    </ul>
  );
}

export {
  DetailInfo,
  DetailRest,
  DetailRoot,
  GALLERY_LAYOUT,
  GALLERY_SIZES,
  PRODUCT_DETAIL_IDS,
  PictureList,
  detailBuyBox,
  detailGallery,
  productDetailCopy,
};
export type { GalleryLayout, ProductDetailCopy, ProductDetailIds, ProductDetailTemplateProps };
