import type { Messages } from "@shopblok/i18n";
import type { FaqItem } from "@shopblok/registry/contracts";
import { BundleSection } from "@shopblok/ui/sections/bundle";
import { CategoryShowcaseSection } from "@shopblok/ui/sections/category-showcase";
import { CollectionSpotlightSection } from "@shopblok/ui/sections/collection-spotlight";
import { ComparisonSection } from "@shopblok/ui/sections/comparison";
import { FaqSection } from "@shopblok/ui/sections/faq";
import { FeaturedProductSection } from "@shopblok/ui/sections/featured-product";
import { LogoCloudSection } from "@shopblok/ui/sections/logo-cloud";
import { MediaWithTextSection } from "@shopblok/ui/sections/media-with-text";
import { ProductCollectionSection } from "@shopblok/ui/sections/product-collection";
import { PromoBannerSection } from "@shopblok/ui/sections/promo-banner";
import { RichTextSection } from "@shopblok/ui/sections/rich-text";
import { sectionsCopy, type SectionsCopy } from "@shopblok/ui/sections/section-copy";
import { SpacerSection } from "@shopblok/ui/sections/spacer";
import { TestimonialsSection } from "@shopblok/ui/sections/testimonials";
import { UspBarSection } from "@shopblok/ui/sections/usp-bar";
import { VideoSection } from "@shopblok/ui/sections/video";
import type * as React from "react";
import type { ResolveContext, ResolvedBlock } from "../../lib/cms/resolve/sections";
import { faqJsonLd } from "../../lib/seo/faq";
import { jsonLdText } from "../../lib/seo/product";
import { SHELL_PREFETCH } from "../../lib/site";
import { submitForm } from "../../lib/actions/form";
import { FormHoneypot } from "./form-honeypot";
// T87 (D102): the islands load with the blocks that draw them (`lazy-islands.tsx`).
import { FormBlockIsland, NewsletterSectionIsland, OfferEnd, PromoPopup } from "./lazy-islands";
import { CmsRichText } from "./rich-text";

// T87 (D104): the blocks a product's, a category's or a collection's sections hold, which are every
// page block but the hero, the recently viewed row and the journal's list, drawn here for both: a
// page's blocks (`RenderBlocks`, which adds those three) and a catalog document's sections
// (`SectionBlocks`). The catalog's pages import this module alone, so the three blocks they cannot
// hold add nothing to their first load.

/** What every block is drawn with: the market's words, language and time zone. */
export type BlockEnv = {
  context: ResolveContext;
  copy: SectionsCopy;
  locale: string;
  timeZone: string | undefined;
  prefetch: typeof SHELL_PREFETCH;
  /** The page has no `<h1>` of its own, so a band that opens it takes the page's heading. */
  heroTitle: boolean;
};

export function blockEnv(context: ResolveContext, messages: Messages, heroTitle = false): BlockEnv {
  return {
    context,
    copy: sectionsCopy(messages),
    locale: context.market.htmlLang,
    timeZone: context.market.timeZone,
    prefetch: SHELL_PREFETCH,
    heroTitle,
  };
}

/**
 * One block drawn by its section in `@shopblok/ui/sections`, which applies the block's
 * `sectionSettings`; `undefined` for the three blocks only a page draws (`RenderBlocks` draws them).
 */
export function sectionBlock(
  block: ResolvedBlock,
  index: number,
  { context, copy, locale, timeZone, prefetch, heroTitle }: BlockEnv,
): React.ReactNode {
  switch (block.blockType) {
    case "richText":
      return (
        <RichTextSection key={block.key} {...block.section}>
          <CmsRichText data={block.content} context={context} />
        </RichTextSection>
      );
    case "mediaWithText":
      return (
        <MediaWithTextSection
          key={block.key}
          {...block.section}
          copy={copy}
          headingLevel={heroTitle && index === 0 ? 1 : 2}
        >
          {block.content === null ? undefined : (
            <CmsRichText data={block.content} context={context} />
          )}
        </MediaWithTextSection>
      );
    case "uspBar":
      return <UspBarSection key={block.key} {...block.section} copy={copy} />;
    case "logoCloud":
      return <LogoCloudSection key={block.key} {...block.section} copy={copy} />;
    case "faq":
      return <FaqSection key={block.key} {...block.section} />;
    case "testimonials":
      return <TestimonialsSection key={block.key} {...block.section} copy={copy} locale={locale} />;
    case "video":
      return <VideoSection key={block.key} {...block.section} copy={copy} locale={locale} />;
    case "spacer":
      return <SpacerSection key={block.key} {...block.section} />;
    case "categoryShowcase":
      return (
        <CategoryShowcaseSection
          key={block.key}
          {...block.section}
          copy={copy}
          locale={locale}
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
    case "promoBanner": {
      const banner = (
        <PromoBannerSection
          key={block.key}
          {...block.section}
          copy={copy}
          locale={locale}
          timeZone={timeZone}
          prefetch={prefetch}
          headingLevel={heroTitle && index === 0 ? 1 : 2}
          popup={({ body, labelledBy, visibility }) => (
            <PromoPopup
              offer={block.key}
              labelledBy={labelledBy}
              closeLabel={copy.promoBanner.close}
              visibility={visibility}
            >
              {body}
            </PromoPopup>
          )}
        />
      );
      const { endsAt } = block.section;
      return endsAt === undefined ? (
        banner
      ) : (
        <OfferEnd key={block.key} endsAt={endsAt}>
          {banner}
        </OfferEnd>
      );
    }
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
    case "newsletter":
      return (
        <NewsletterSectionIsland
          key={block.key}
          {...block.section}
          copy={copy}
          locale={locale}
          fieldName={block.form.fieldName}
          hiddenFields={<FormHoneypot label={copy.form.honeypot} />}
          submit={submitForm.bind(null, { market: context.market.key, form: block.form.id })}
          formId={`form-${block.key}`}
        />
      );
    case "formBlock":
      return (
        <FormBlockIsland
          key={block.key}
          {...block.section}
          copy={copy}
          messages={Object.fromEntries(
            Object.entries(block.messages).map(([id, message]) => [
              id,
              <CmsRichText key={id} data={message} context={context} />,
            ]),
          )}
          confirmation={
            block.confirmation === null ? undefined : (
              <CmsRichText data={block.confirmation} context={context} />
            )
          }
          hiddenFields={<FormHoneypot label={copy.form.honeypot} />}
          submit={submitForm.bind(null, {
            market: context.market.key,
            form: block.section.form.id,
          })}
          formId={`form-${block.key}`}
        />
      );
    default:
      return undefined;
  }
}

/** The blocks' FAQs together as one `FAQPage` JSON-LD, or nothing without a question. */
export function BlocksFaqJsonLd({ resolved }: { resolved: readonly ResolvedBlock[] }) {
  const questions: FaqItem[] = resolved.flatMap((block) =>
    block.blockType === "faq" ? block.section.items : [],
  );
  const faq = faqJsonLd(questions);
  return faq === null ? null : (
    <script
      type="application/ld+json"
      // The editor's questions and answers, escaped by `jsonLdText`.
      dangerouslySetInnerHTML={{ __html: jsonLdText(faq) }}
    />
  );
}

/**
 * A catalog document's sections (D104, T87), resolved already (`resolveLayout`): each block drawn
 * as on a page, every heading an `<h2>` (the page's `<h1>` is the product's or the listing's name),
 * and their FAQs as one `FAQPage` JSON-LD after them.
 */
export function SectionBlocks({
  resolved,
  context,
  messages,
}: {
  resolved: ResolvedBlock[];
  context: ResolveContext;
  messages: Messages;
}) {
  const env = blockEnv(context, messages);
  return (
    <>
      {resolved.map((block, index) => sectionBlock(block, index, env))}
      <BlocksFaqJsonLd resolved={resolved} />
    </>
  );
}
