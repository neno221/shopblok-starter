import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getMessages } from "next-intl/server";
import { RefreshOnSave } from "../../../../../components/cms/refresh-on-save";
import { RenderBlocks } from "../../../../../components/cms/render-blocks";
import { readPageBySlug } from "../../../../../lib/cms/pages";
import { commerceContext } from "../../../../../lib/cms/resolve/market";
import { getCurrentMarket } from "../../../../../lib/current-market";
import { e2eRoutesEnabled } from "../../../../../lib/env";
import { getMarketContext } from "../../../../../lib/market-context";
import { siteOrigin } from "../../../../../lib/site-origin";

// Test-only (404 unless E2E_TEST_ROUTES=true; T59): a CMS page read the way the shop's pages read
// one (D73), for `cms-preview.spec.ts` until T65's `[...slug]` route takes over. Draft Mode is read
// outside the cached read and passed in; the live-preview island renders only in Draft Mode.
// Dynamic and blocking (`instant = false`, as the cart page): the gate is read per request. The
// commerce blocks (T64) are resolved with the market's catalog: its region's prices, its language.

export const instant = false;
export default async function E2eCmsPage({ params }: PageProps<"/[market]/e2e-cms/[slug]">) {
  await connection();
  if (!e2eRoutesEnabled()) notFound();
  const [{ slug }, market, { isEnabled: draft }, messages] = await Promise.all([
    params,
    getCurrentMarket(),
    draftMode(),
    getMessages(),
  ]);
  const [page, context] = await Promise.all([
    readPageBySlug({ market, draft }, slug),
    getMarketContext(market.key),
  ]);
  if (page === null || context === null) notFound();
  const commerce = await commerceContext(context, messages);
  return (
    <main id="main" className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <h1 data-testid="cms-title" className="text-3xl">
          {page.title}
        </h1>
        <p data-testid="cms-draft">{draft ? "draft" : "published"}</p>
      </div>
      <RenderBlocks
        blocks={page.layout}
        context={{ market, map: context.map, commerce }}
        messages={messages}
      />
      {/* `siteOrigin()`, Payload's `serverURL`: the island ignores a message from any other origin. */}
      {draft ? <RefreshOnSave serverURL={siteOrigin()} /> : null}
    </main>
  );
}
