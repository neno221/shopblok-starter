import type { Messages } from "@shopblok/i18n";
import type { FaqItem } from "@shopblok/registry/contracts";
import { FaqSection } from "@shopblok/ui/sections/faq";
import { LogoCloudSection } from "@shopblok/ui/sections/logo-cloud";
import { MediaWithTextSection } from "@shopblok/ui/sections/media-with-text";
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
import { submitForm } from "../../lib/actions/form";
import { FormHoneypot } from "./form-honeypot";
import { FormBlockIsland, NewsletterSectionIsland } from "./form-islands";
import { CmsRichText } from "./rich-text";

type RenderBlocksProps = {
  /** The page's `layout`, read at depth 1 (uploads and references populated). */
  blocks: Page["layout"] | undefined;
  context: ResolveContext;
  /** The market's whole catalog (`getMessages()`), for the sections' fixed words. */
  messages: Messages;
};

/**
 * A page's blocks (D70, T63): each block resolved for the market (`resolveLayout`: its links, its
 * uploads, its contract) and drawn by its section in `@shopblok/ui/sections`, which applies the
 * block's `sectionSettings`. A block that cannot be drawn is left out. The page's FAQs together
 * are one `FAQPage` JSON-LD, after the blocks. A server component; its islands are a video embed's
 * play button and the forms (T67, D81), each posting to `submitForm` bound to the market and its
 * form, with the spam trap, and an `id` from the block's, so the answer to a post without scripts
 * scrolls back to it.
 */
export function RenderBlocks({ blocks, context, messages }: RenderBlocksProps) {
  const resolved = resolveLayout(blocks, context);
  const copy = sectionsCopy(messages);
  const locale = context.market.htmlLang;
  const questions: FaqItem[] = resolved.flatMap((block) =>
    block.blockType === "faq" ? block.section.items : [],
  );
  const faq = faqJsonLd(questions);
  return (
    <>
      {resolved.map((block) => {
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
