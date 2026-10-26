// Ours (T49, SETUP.md "Product page (T49)"; D56, D57, D61, SPEC §8.4, SBP layouts/product-details.md).
// The product page's `<main>`: the breadcrumbs, then the gallery and the buy box side by side from
// `md` (the gallery first, a little wider; the buy box sticks under the header while the pictures
// scroll), then the information, the reviews, the related products and, when the page has one, the
// recently viewed row. Below `md` it is one column in that order, and the sticky bar keeps "Add to
// cart" in reach once the buy box's button has scrolled away.
// - What follows the visitor's choice is the page's: the shop passes `slots.buyBox` (its island,
//   which reads `?variant=` and draws the buy box and the sticky bar) and `slots.gallery` (the
//   gallery that shows the chosen colour). Without them the template draws both from its values,
//   which is what the design system shows and what the island's `Suspense` fallback is: the default
//   choice, in the server's HTML (D61).
// - The buy box, the sticky bar and the reviews link to each other by the ids in `PRODUCT_DETAIL_IDS`,
//   so an island that draws them passes the same ones.
// - `variant` is the contract's one value (D57); M5's variants change the layout here.
import type { Messages } from "@shopblok/i18n";
import type { ProductDetailPage } from "@shopblok/registry/contracts";
import { cn } from "@shopblok/ui/lib/utils";
import { Breadcrumbs } from "@shopblok/ui/molecules/breadcrumbs";
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

/** The gallery's column, from `md`: what its main picture's `sizes` says. */
const GALLERY_SIZES = "(min-width: 768px) 55vw, 100vw";

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
    /** The gallery that follows the chosen colour. */
    gallery?: React.ReactNode;
    /** The visitor's recently viewed products (a browser list), under the related ones. */
    recentlyViewed?: React.ReactNode;
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

function ProductDetailTemplate({
  breadcrumbs,
  gallery,
  buyBox,
  sticky,
  info,
  reviews,
  related,
  copy,
  locale,
  reviewsHrefFor,
  slots = {},
  ids = PRODUCT_DETAIL_IDS,
  prefetch,
  mainId = "main",
  as: Root = "main",
  className,
}: ProductDetailTemplateProps) {
  return (
    <Root
      id={mainId}
      data-slot="product-detail-template"
      data-variant="default"
      className={cn(
        "mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-10 px-4 py-6 md:gap-16 md:px-6 md:py-8 lg:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-6">
        <Breadcrumbs {...breadcrumbs} copy={copy.breadcrumbs} />
        <div className="grid min-w-0 gap-8 md:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:gap-12">
          <div data-slot="product-detail-gallery" className="min-w-0">
            {slots.gallery ?? (
              <ProductGallery
                {...gallery}
                copy={copy.gallery}
                locale={locale}
                sizes={GALLERY_SIZES}
                priority
              />
            )}
          </div>
          <div
            data-slot="product-detail-buy-box"
            className="min-w-0 md:sticky md:top-24 md:self-start"
          >
            {slots.buyBox ?? (
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
            )}
          </div>
        </div>
      </div>
      <ProductInfoAccordions {...info} copy={copy.info} locale={locale} prefetch={prefetch} />
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
    </Root>
  );
}

export { GALLERY_SIZES, PRODUCT_DETAIL_IDS, ProductDetailTemplate, productDetailCopy };
export type { ProductDetailCopy, ProductDetailIds, ProductDetailTemplateProps };
