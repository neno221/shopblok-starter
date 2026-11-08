import type { Messages } from "@shopblok/i18n";
import type * as React from "react";
import { OWN_SECTIONS } from "../../lib/cms/catalog";
import { chooseSections, SECTIONS_PAGE } from "../../lib/cms/catalog-sections";
import { cmsOrNull } from "../../lib/cms/read";
import { commerceContext } from "../../lib/cms/resolve/market";
import { resolveLayout, type ResolveContext } from "../../lib/cms/resolve/sections";
import { shellPaths } from "../../lib/cms/shell";
import type { CatalogContentSlug } from "../../lib/cms/tags";
import { readTemplateSections } from "../../lib/cms/templates";
import type { MarketContext } from "../../lib/market-context";
import { getShellData } from "../shell/shell-data";
import { SectionBlocks } from "./section-blocks";

/**
 * A product's, a category's or a collection's sections, drawn for the market (D104, T87), or
 * `undefined` when it shows none: its own (`sectionsMode: own`), the `templates` global's for its
 * page (`default`, also a document the sync has not written yet), or none. The blocks resolve as a
 * page's do (`resolveLayout`: the links in the shell's paths, the commerce blocks in the market's
 * region through the catalog's cached reads and tags) and are drawn by `SectionBlocks`
 * (`section-blocks.tsx`, which leaves out the three blocks the sections cannot hold, so their code
 * is not in these pages' first load), with every heading an `<h2>` (the page's `<h1>` is the product's or the listing's name). Both reads are
 * cached entries with the document's or the global's tags, so the route stays in the static shell;
 * a failed read draws no sections rather than taking the page down. In Draft Mode (the `templates`
 * global's live preview) the global is read as its draft, and a `tabs` collection's other tabs come
 * with the page; otherwise `/next/block-tab` reads them from the published document.
 */
export async function catalogSections({
  owner,
  context,
  messages,
  draft,
}: {
  owner: { kind: CatalogContentSlug; handle: string };
  context: MarketContext;
  messages: Messages;
  draft: boolean;
}): Promise<React.ReactNode | undefined> {
  const { market } = context;
  const reader = { market, draft };
  const [stored, defaults, shell] = await Promise.all([
    cmsOrNull(OWN_SECTIONS[owner.kind](reader, owner.handle), "catalog sections: none shown"),
    cmsOrNull(
      readTemplateSections(reader, SECTIONS_PAGE[owner.kind]),
      "catalog sections: no default sections",
    ),
    getShellData(),
  ]);
  const chosen = chooseSections(stored, defaults, owner);
  if (chosen === null) return undefined;
  const resolveContext: ResolveContext = {
    market,
    map: context.map,
    paths: shellPaths(shell.categories, shell.pages),
    commerce: await commerceContext(context, messages),
    ...(draft ? {} : { document: chosen.document }),
  };
  const blocks = await resolveLayout(chosen.blocks, resolveContext);
  if (blocks.length === 0) return undefined;
  return <SectionBlocks resolved={blocks} context={resolveContext} messages={messages} />;
}
