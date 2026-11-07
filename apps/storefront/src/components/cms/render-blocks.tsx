import type { Messages } from "@shopblok/i18n";
import { EditorialListSection } from "@shopblok/ui/sections/editorial-list";
import { HeroSection } from "@shopblok/ui/sections/hero";
import type { Page } from "../../payload-types";
import {
  resolveLayout,
  type ResolveContext,
  type ResolvedBlock,
} from "../../lib/cms/resolve/sections";
import { RecentlyViewedBlock } from "./lazy-islands";
import { BlocksFaqJsonLd, blockEnv, sectionBlock } from "./section-blocks";

type RenderBlocksProps = {
  /** The page's `layout`, read at depth 1 (uploads and references populated). */
  blocks?: Page["layout"] | undefined;
  /** The layout resolved already (`resolveLayout`), in place of `blocks`. */
  resolved?: ResolvedBlock[];
  context: ResolveContext;
  /** The market's whole catalog (`getMessages()`), for the sections' fixed words. */
  messages: Messages;
  /**
   * The page has no `<h1>` of its own: a hero that opens it takes the page's heading (and its
   * picture is preloaded), as does a full-bleed band that opens it (T82, `pageHeading`). Otherwise
   * every hero's heading is an `<h2>`.
   */
  heroTitle?: boolean;
};

/**
 * A page's blocks (D70, T63): each block resolved for the market (`resolveLayout`: its links, its
 * uploads, its contract) and drawn by its section in `@shopblok/ui/sections`, which applies the
 * block's `sectionSettings`. A block that cannot be drawn is left out. The page's FAQs together
 * are one `FAQPage` JSON-LD, after the blocks. A server component; its islands are a video embed's
 * play button, a promo code's copy button, a carousel's buttons, the visitor's recently viewed
 * products and the forms (T67, D81), each posting to `submitForm` bound to the market and its
 * form, with the spam trap, and an `id` from the block's, so the answer to a post without scripts
 * scrolls back to it. The commerce blocks (T64) are drawn only with `context.commerce`, the
 * market's catalog, the editorial lists (T66) only with `context.posts`, the journal's reads. The
 * blocks a catalog document's sections may hold too are drawn by `section-blocks.tsx` (T87); this
 * adds the hero, the recently viewed row and the journal's list.
 */
export async function RenderBlocks({
  blocks,
  resolved: given,
  context,
  messages,
  heroTitle = false,
}: RenderBlocksProps) {
  const resolved = given ?? (await resolveLayout(blocks, context));
  const env = blockEnv(context, messages, heroTitle);
  const { copy, locale, timeZone, prefetch } = env;
  return (
    <>
      {resolved.map((block, index) => {
        switch (block.blockType) {
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
          case "editorialList":
            return (
              <EditorialListSection
                key={block.key}
                {...block.section}
                copy={copy}
                locale={locale}
                timeZone={timeZone}
                prefetch={prefetch}
              />
            );
          default:
            return sectionBlock(block, index, env);
        }
      })}
      <BlocksFaqJsonLd resolved={resolved} />
    </>
  );
}
