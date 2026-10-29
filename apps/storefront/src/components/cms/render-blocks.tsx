import type { Messages } from "@shopblok/i18n";
import type { FaqItem } from "@shopblok/registry/contracts";
import { BundleSection } from "@shopblok/ui/sections/bundle";
import { CategoryShowcaseSection } from "@shopblok/ui/sections/category-showcase";
import { CollectionSpotlightSection } from "@shopblok/ui/sections/collection-spotlight";
import { ComparisonSection } from "@shopblok/ui/sections/comparison";
import { FaqSection } from "@shopblok/ui/sections/faq";
import { FeaturedProductSection } from "@shopblok/ui/sections/featured-product";
import { HeroSection } from "@shopblok/ui/sections/hero";
import { LogoCloudSection } from "@shopblok/ui/sections/logo-cloud";
import { MediaWithTextSection } from "@shopblok/ui/sections/media-with-text";
import { ProductCollectionSection } from "@shopblok/ui/sections/product-collection";
import { PromoBannerSection } from "@shopblok/ui/sections/promo-banner";
import { RichTextSection } from "@shopblok/ui/sections/rich-text";
import { sectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SpacerSection } from "@shopblok/ui/sections/spacer";
import { TestimonialsSection } from "@shopblok/ui/sections/testimonials";
import { UspBarSection } from "@shopblok/ui/sections/usp-bar";
import { VideoSection } from "@shopblok/ui/sections/video";
import type { Page } from "../../payload-types";
import { resolveLayout, type ResolveContext } from "../../lib/cms/resolve/sections";
import { faqJsonLd } from "../../lib/seo/faq";
import { jsonLdText } from "../../lib/seo/product";
import { SHELL_PREFETCH } from "../../lib/site";
import { RecentlyViewedBlock } from "./recently-viewed-block";
import { CmsRichText } from "./rich-text";

type RenderBlocksProps = {
  /** The page's `layout`, read at depth 1 (uploads and references populated). */
  blocks: Page["layout"] | undefined;
  context: ResolveContext;
  /** The market's whole catalog (`getMessages()`), for the sections' fixed words. */
  messages: Messages;
  /**
   * The page has no `<h1>` of its own: a hero that opens it takes the page's heading (and its
   * picture is preloaded). Otherwise every hero's heading is an `<h2>`.
   */
  heroTitle?: boolean;
};

/**
 * A page's blocks (D70, T63): each block resolved for the market (`resolveLayout`: its links, its
 * uploads, its contract) and drawn by its section in `@shopblok/ui/sections`, which applies the
 * block's `sectionSettings`. A block that cannot be drawn is left out. The page's FAQs together
 * are one `FAQPage` JSON-LD, after the blocks. A server component: the only island is a video
 * embed's play button,
 * a promo code's copy button, a carousel's buttons and the visitor's recently viewed products. The
 * commerce blocks (T64) are drawn only with `context.commerce`, the market's catalog.
 */
export async function RenderBlocks({
  blocks,
  context,
  messages,
  heroTitle = false,
}: RenderBlocksProps) {
  const resolved = await resolveLayout(blocks, context);
  const copy = sectionsCopy(messages);
  const locale = context.market.htmlLang;
  const timeZone = context.market.timeZone;
  const prefetch = SHELL_PREFETCH;
  const questions: FaqItem[] = resolved.flatMap((block) =>
    block.blockType === "faq" ? block.section.items : [],
  );
  const faq = faqJsonLd(questions);
  return (
    <>
      {resolved.map((block, index) => {
        switch (block.blockType) {
          case "richText":
            return (
              <RichTextSection key={block.key} {...block.section}>
                <CmsRichText data={block.content} context={context} />
              </RichTextSection>
            );
          case "mediaWithText":
            return (
              <MediaWithTextSection key={block.key} {...block.section} copy={copy}>
                {block.content === null ? undefined : (
                  <CmsRichText data={block.content} context={context} />
                )}
              </MediaWithTextSection>
            );
          case "uspBar":
            return <UspBarSection key={block.key} {...block.section} />;
          case "logoCloud":
            return <LogoCloudSection key={block.key} {...block.section} copy={copy} />;
          case "faq":
            return <FaqSection key={block.key} {...block.section} />;
          case "testimonials":
            return (
              <TestimonialsSection key={block.key} {...block.section} copy={copy} locale={locale} />
            );
          case "video":
            return <VideoSection key={block.key} {...block.section} copy={copy} locale={locale} />;
          case "spacer":
            return <SpacerSection key={block.key} {...block.section} />;
          case "hero":
            return (
              <HeroSection
                key={block.key}
                {...block.section}
                copy={copy}
                locale={locale}
                timeZone={timeZone}
                headingLevel={heroTitle && index === 0 ? 1 : 2}
                prefetch={prefetch}
              />
            );
          case "categoryShowcase":
            return (
              <CategoryShowcaseSection
                key={block.key}
                {...block.section}
                copy={copy}
                prefetch={prefetch}
              />
            );
          case "productCollection":
            return (
              <ProductCollectionSection
                key={block.key}
                {...block.section}
                copy={copy}
                locale={locale}
                prefetch={prefetch}
              />
            );
          case "featuredProduct":
            return (
              <FeaturedProductSection
                key={block.key}
                {...block.section}
                copy={copy}
                locale={locale}
                prefetch={prefetch}
              />
            );
          case "bundle":
            return (
              <BundleSection
                key={block.key}
                {...block.section}
                copy={copy}
                locale={locale}
                prefetch={prefetch}
              />
            );
          case "promoBanner":
            return (
              <PromoBannerSection
                key={block.key}
                {...block.section}
                copy={copy}
                locale={locale}
                timeZone={timeZone}
                prefetch={prefetch}
              />
            );
          case "comparison":
            return (
              <ComparisonSection
                key={block.key}
                {...block.section}
                copy={copy}
                locale={locale}
                prefetch={prefetch}
              />
            );
          case "collectionSpotlight":
            return (
              <CollectionSpotlightSection
                key={block.key}
                {...block.section}
                copy={copy}
                locale={locale}
                prefetch={prefetch}
              />
            );
          case "recentlyViewed":
            return (
              <RecentlyViewedBlock
                key={block.key}
                market={context.market.key}
                section={block.section}
                copy={{ products: copy.products }}
                locale={locale}
                prefetch={prefetch}
              />
            );
        }
      })}
      {faq === null ? null : (
        <script
          type="application/ld+json"
          // The editor's questions and answers, escaped by `jsonLdText`.
          dangerouslySetInnerHTML={{ __html: jsonLdText(faq) }}
        />
      )}
    </>
  );
}
