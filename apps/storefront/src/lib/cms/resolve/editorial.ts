import { EDITORIAL_LIST_MAX, EditorialListSection } from "@shopblok/registry/contracts";
import { buildPublicUrl } from "../../markets/url";
import { pageIdOf } from "../page-path";
import { journalPath } from "../paths";
import { postCard } from "../post-content";
import type { CmsPostSummary } from "../posts";
import { parsed, settingsOf, text } from "./shared";
import type { LayoutBlock, ResolveContext } from "./sections";

// The `editorialList` block (T66, D79): the journal's posts in the market's language, the newest or
// the editor's picks, resolved through the posts' cached reads (`lib/cms/posts.ts`, `posts:<locale>`)
// rather than the page's own read, so a post's publish refreshes every page that lists it. The
// reads come in `context.posts` (`postsContext`), which the page builds with its Draft Mode: an
// editor's preview lists the drafts it may see.

/** How a page's blocks read the journal: the newest posts and the editor's picks. */
export type PostsContext = {
  newest: (limit: number) => Promise<readonly CmsPostSummary[]>;
  byIds: (ids: readonly number[]) => Promise<readonly CmsPostSummary[]>;
  /** The journal's link's label, the catalog's `sections.editorialList.all`. */
  journalLabel: string;
};

type EditorialListBlock = Extract<LayoutBlock, { blockType: "editorialList" }>;

export type ResolvedEditorialList = {
  key: string;
  blockType: "editorialList";
  section: EditorialListSection;
};

/** The ids of the posts a block names, populated or not, in the editor's order. */
const idsOf = (value: unknown): number[] =>
  (Array.isArray(value) ? value : []).flatMap((each) => pageIdOf(each) ?? []);

/**
 * An editorial list as its section's view model, or `null` when nothing is left to list (no post
 * published in the language, every pick gone). A read that fails throws: `resolveLayout` leaves
 * the block out, never the page.
 */
export async function resolveEditorialList(
  block: EditorialListBlock,
  context: ResolveContext,
  posts: PostsContext,
): Promise<ResolvedEditorialList | null> {
  const found =
    block.source === "handpicked"
      ? await posts.byIds(idsOf(block.posts).slice(0, EDITORIAL_LIST_MAX))
      : await posts.newest(Math.min(Math.max(Math.trunc(block.limit ?? 3), 1), EDITORIAL_LIST_MAX));
  const url = (path: string) => buildPublicUrl(context.market, path, context.map);
  const heading = text(block.heading);
  const section = parsed(EditorialListSection, {
    settings: settingsOf(block),
    ...(heading === undefined ? {} : { heading }),
    posts: found.flatMap((post) => postCard(post, url) ?? []),
    ...(block.showLink === false
      ? {}
      : { link: { label: posts.journalLabel, href: url(journalPath()), appearance: "outline" } }),
  });
  return section === undefined
    ? null
    : { key: block.id ?? "editorialList", blockType: "editorialList", section };
}
