import type { CmsPage as CmsPageContent } from "@shopblok/registry/contracts";
import { CmsPageTemplate } from "@shopblok/ui/templates/cms-page";
import { getMessages } from "next-intl/server";
import { pageHeading } from "../../lib/cms/page-content";
import type { PagePaths } from "../../lib/cms/page-path";
import type { CmsPage } from "../../lib/cms/pages";
import { commerceContext } from "../../lib/cms/resolve/market";
import { resolveLayout, type ResolveContext } from "../../lib/cms/resolve/sections";
import { shellPaths } from "../../lib/cms/shell";
import type { CurrentMarket } from "../../lib/market-locale";
import { getMarketContext } from "../../lib/market-context";
import { buildReadsMedusa } from "../../lib/prerender";
import { siteOrigin } from "../../lib/site-origin";
import { getShellData } from "../shell/shell-data";
import { RefreshOnSave } from "./refresh-on-save";
import { RenderBlocks } from "./render-blocks";

type CmsPageViewProps = {
  page: CmsPage;
  /** What the template draws above the blocks (`cmsPageContent`); the heading follows the blocks. */
  content: Omit<CmsPageContent, "heading">;
  market: CurrentMarket;
  /** The pages' addresses, for links to pages when the shell has none. */
  paths?: PagePaths | null;
  /** Draft Mode is on (live preview): the island that redraws the frame on save is rendered. */
  draft: boolean;
};

/**
 * A CMS page drawn for a market (D80, T65): the CMS page template with the page's blocks, by
 * `{m}/[...slug]` and by `{m}/` for the homepage. The links resolve with the shell's paths (a child
 * category's whole path, a page's address in this language); the commerce blocks with the market's
 * catalog, or, without Medusa or a region for the market, not at all, so the content blocks still
 * draw (PR 97 review, item 6) instead of a 404.
 */
export async function CmsPageView({ page, content, market, paths, draft }: CmsPageViewProps) {
  const [messages, shell] = await Promise.all([getMessages(), getShellData()]);
  const context = buildReadsMedusa() ? await getMarketContext(market.key) : null;
  const commerce = context === null ? undefined : await commerceContext(context, messages);
  const resolveContext: ResolveContext = {
    market,
    map: shell.map,
    paths: shellPaths(shell.categories, shell.pages ?? paths),
    ...(commerce === undefined ? {} : { commerce }),
  };
  const blocks = await resolveLayout(page.layout, resolveContext);
  const heading = pageHeading(blocks);
  return (
    <>
      <CmsPageTemplate {...content} heading={heading} copy={messages.molecules.breadcrumbs}>
        <RenderBlocks
          resolved={blocks}
          context={resolveContext}
          messages={messages}
          heroTitle={heading === "hero"}
        />
      </CmsPageTemplate>
      {/* `siteOrigin()`, Payload's `serverURL`: the island ignores a message from any other origin. */}
      {draft ? <RefreshOnSave serverURL={siteOrigin()} /> : null}
    </>
  );
}
