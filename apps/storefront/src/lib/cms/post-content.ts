import {
  JournalPage,
  PostCard,
  PostPage,
  type Breadcrumbs,
  type Link,
} from "@shopblok/registry/contracts";
import { text } from "../text";
import { journalPath, postPath } from "./paths";
import type { CmsPost, CmsPostSummary } from "./posts";
import { parsed } from "./resolve/shared";
import { mediaImage } from "./shell";

// D80's posts as their templates and the `editorialList` block draw them (T66): a post's card (its
// address in the market, its hero picture, its date, author and summary), a page of the journal
// and a post's page, each parsed with its contract, so a post saved half-done (a draft's autosave
// before its slug) is left out of a list rather than drawn broken.

/** The market's links: a path in the market (`/journal/…`) as its public URL (`/us/journal/…`). */
type Url = (path: string) => string;

/** A post as a card, or `null` when it has no address or does not parse. */
export function postCard(post: CmsPostSummary, url: Url): PostCard | null {
  const path = postPath(post.slug);
  if (path === null) return null;
  const image = mediaImage(post.hero);
  const excerpt = text(post.excerpt);
  const author = text(post.author);
  return (
    parsed(PostCard, {
      id: String(post.id),
      title: post.title,
      href: url(path),
      ...(excerpt === undefined ? {} : { excerpt }),
      ...(image === undefined ? {} : { image }),
      publishedAt: post.publishedAt,
      ...(author === undefined ? {} : { author }),
    }) ?? null
  );
}

/** The journal's breadcrumbs' trail: Home. */
const homeTrail = (home: string, url: Url): Link[] => [{ label: home, href: url("/") }];

/**
 * A page of the journal (D59): its posts as cards, newest first, and the pager; `null` for a page
 * after the last, which the route answers with a 404. The first page is drawn even with no post.
 */
export function journalContent(
  list: { posts: readonly CmsPostSummary[]; totalPages: number },
  page: number,
  { title, home, url }: { title: string; home: string; url: Url },
): JournalPage | null {
  if (page > list.totalPages && page > 1) return null;
  const breadcrumbs: Breadcrumbs = { trail: homeTrail(home, url), current: title };
  return (
    parsed(JournalPage, {
      title,
      breadcrumbs,
      posts: list.posts.flatMap((post) => postCard(post, url) ?? []),
      page: { page, pageCount: Math.max(list.totalPages, page) },
      shopHref: url("/store"),
    }) ?? null
  );
}

/** A post's page: Home and the journal as its breadcrumbs, its picture with the editor's alt. */
export function postContent(
  post: CmsPost,
  { journal, home, url }: { journal: string; home: string; url: Url },
): PostPage | null {
  const image = mediaImage(post.hero);
  const excerpt = text(post.excerpt);
  const author = text(post.author);
  return (
    parsed(PostPage, {
      title: post.title,
      breadcrumbs: {
        trail: [...homeTrail(home, url), { label: journal, href: url(journalPath()) }],
        current: post.title,
      },
      publishedAt: post.publishedAt,
      ...(author === undefined ? {} : { author }),
      ...(excerpt === undefined ? {} : { excerpt }),
      ...(image === undefined ? {} : { image }),
    }) ?? null
  );
}
