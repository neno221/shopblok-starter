import {
  BundleSection,
  CategoryShowcaseSection,
  CollectionSpotlightSection,
  EditorialListSection,
  ComparisonSection,
  FaqSection,
  FeaturedProductSection,
  FormBlockSection,
  HeroSection,
  LogoCloudSection,
  MediaWithTextSection,
  NewsletterSection,
  ProductCollectionSection,
  PromoBannerSection,
  RecentlyViewedSection,
  RichTextSection,
  SpacerSection,
  TestimonialsSection,
  UspBarSection,
  VideoSection,
} from "../contracts";
import type { EntryInput } from "../types";

// SPEC §7.4's blocks (D70, D79): each a section in `@shopblok/ui/sections`, drawn by Payload's
// block of the same `block` slug. A block is a family with one member until M5, the `standard`
// variant, so it has a thumbnail (D52) for Payload's block drawer and `variantsOf(family)` lists it
// for the block's `variant` field; M5 adds the other variants as more members of the family.

const section = <const Slug extends string>(
  slug: Slug,
  block: string,
  label: string,
  name: string,
  contract: EntryInput["contract"],
) =>
  ({
    id: `sections/${slug}`,
    group: "sections",
    kind: "section",
    label,
    component: { module: `@shopblok/ui/sections/${slug}`, name },
    family: slug,
    variant: "standard",
    block,
    contract,
  }) as const satisfies EntryInput;

export const sections = [
  // T63: the eight content blocks, in D79's order.
  section("rich-text", "richText", "Rich text", "RichTextSection", RichTextSection),
  section(
    "media-with-text",
    "mediaWithText",
    "Media with text",
    "MediaWithTextSection",
    MediaWithTextSection,
  ),
  section("usp-bar", "uspBar", "USP bar", "UspBarSection", UspBarSection),
  section("logo-cloud", "logoCloud", "Logo cloud", "LogoCloudSection", LogoCloudSection),
  section("faq", "faq", "FAQ", "FaqSection", FaqSection),
  section(
    "testimonials",
    "testimonials",
    "Testimonials",
    "TestimonialsSection",
    TestimonialsSection,
  ),
  section("video", "video", "Video", "VideoSection", VideoSection),
  section("spacer", "spacer", "Spacer", "SpacerSection", SpacerSection),
  // T64: the nine commerce blocks, in D79's order; their products and categories come from Medusa.
  section("hero", "hero", "Hero", "HeroSection", HeroSection),
  section(
    "category-showcase",
    "categoryShowcase",
    "Category showcase",
    "CategoryShowcaseSection",
    CategoryShowcaseSection,
  ),
  section(
    "product-collection",
    "productCollection",
    "Product collection",
    "ProductCollectionSection",
    ProductCollectionSection,
  ),
  section(
    "featured-product",
    "featuredProduct",
    "Featured product",
    "FeaturedProductSection",
    FeaturedProductSection,
  ),
  section("bundle", "bundle", "Bundle", "BundleSection", BundleSection),
  section("promo-banner", "promoBanner", "Promo banner", "PromoBannerSection", PromoBannerSection),
  section("comparison", "comparison", "Comparison", "ComparisonSection", ComparisonSection),
  section(
    "collection-spotlight",
    "collectionSpotlight",
    "Collection spotlight",
    "CollectionSpotlightSection",
    CollectionSpotlightSection,
  ),
  section(
    "recently-viewed",
    "recentlyViewed",
    "Recently viewed",
    "RecentlyViewedSection",
    RecentlyViewedSection,
  ),
  // T67: the two blocks that post a form (D81).
  section("newsletter", "newsletter", "Newsletter", "NewsletterSection", NewsletterSection),
  section("form-block", "formBlock", "Form", "FormBlockSection", FormBlockSection),
  // T66: the journal's posts on a page.
  section(
    "editorial-list",
    "editorialList",
    "Editorial list",
    "EditorialListSection",
    EditorialListSection,
  ),
] as const satisfies readonly EntryInput[];
