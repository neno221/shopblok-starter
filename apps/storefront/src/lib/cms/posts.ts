import "server-only";
import type { Media, Post } from "../../payload-types";
import type { SeoFields } from "../seo/meta";
import { metaOf } from "./meta";
import { cmsRead, type CmsReader } from "./read";
import { postTags } from "./tags";

// D80's posts (T66): every read of the journal through `cmsRead`, tagged `posts:<locale>`, so a
// publish refreshes the journal, the posts and every page whose `editorialList` lists them. A
// language without a post's own texts reads English's (Payload's fallback), so an untranslated post
// keeps its English address in every market, as an untranslated page does (T65).

/** A post as its lists show it: the card's fields, the hero picture populated. */
export type CmsPostSummary = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  author: string | null;
  publishedAt: string;
  hero: Media | null;
};

/** A post as its page shows it: the summary, the text and its SEO fields (T68). */
export type CmsPost = CmsPostSummary & { content: Post["content"]; meta: SeoFields };

/** The fields a list selects (the text is the post page's only). */
const SUMMARY_SELECT = {
  title: true,
  slug: true,
  excerpt: true,
  author: true,
  publishedAt: true,
  hero: true,
} as const;

type StoredPost = Pick<Post, "id" | "title" | "slug" | "publishedAt"> &
  Partial<Pick<Post, "excerpt" | "author" | "hero" | "content" | "meta">>;

const mediaOf = (value: unknown): Media | null =>
  value !== null && typeof value === "object" ? (value as Media) : null;

const toSummary = (post: StoredPost): CmsPostSummary => ({
  id: post.id,
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt ?? null,
  author: post.author ?? null,
  publishedAt: post.publishedAt,
  hero: mediaOf(post.hero),
});

/** The posts' addresses in one language: each post's slug, and the post each slug names. */
export type PostSlugs = { byId: Record<string, string>; bySlug: Record<string, number> };

/**
 * Every readable post's slug in the market's language (its own, or English's): the route, hreflang
 * and the lists' links read it (`withAddresses`). Of two posts with one slug (a post without a
 * Greek slug reads English's, which a Greek post may have taken) the older keeps it, so the read
 * is oldest first.
 */
export const readPostSlugs = cmsRead(
  async (payload, query): Promise<PostSlugs> => {
    const { docs } = await payload.find({
      collection: "posts",
      ...query,
      locale: query.locale as never,
      depth: 0,
      select: { slug: true },
      limit: 0,
      pagination: false,
      sort: "createdAt",
    });
    const slugs: PostSlugs = { byId: {}, bySlug: {} };
    for (const doc of docs) {
      const slug = doc.slug;
      if (typeof slug !== "string" || slug === "" || slug in slugs.bySlug) continue;
      slugs.bySlug[slug] = doc.id;
      slugs.byId[String(doc.id)] = slug;
    }
    return slugs;
  },
  { name: "cms:post-slugs", tags: (locale) => postTags(locale) },
);

/** A page of the journal: its posts, newest first, and how many pages there are. */
export type PostList = { posts: CmsPostSummary[]; totalPages: number };

/**
 * `posts` with the slugs `readPostSlugs` gives them (PR 100 review, item 1): a list's post reads
 * its own slug, which may be the one an older post keeps, so its link is the shared map's; a post
 * with no address in the language is left out.
 */
async function withAddresses(
  reader: CmsReader,
  posts: readonly CmsPostSummary[],
): Promise<CmsPostSummary[]> {
  const slugs = await readPostSlugs(reader);
  return posts.flatMap((post) => {
    const slug = slugs?.byId[String(post.id)];
    return slug === undefined ? [] : [{ ...post, slug }];
  });
}

/** A page of the journal as stored, newest `publishedAt` first (`readPostList` adds the links). */
const readPostPage = cmsRead(
  async (payload, query, page: number, limit: number): Promise<PostList> => {
    const result = await payload.find({
      collection: "posts",
      ...query,
      locale: query.locale as never,
      depth: 1,
      select: SUMMARY_SELECT,
      sort: ["-publishedAt", "-id"],
      page,
      limit,
    });
    return {
      posts: result.docs.map((doc) => toSummary(doc as StoredPost)),
      totalPages: Math.max(result.totalPages, 1),
    };
  },
  { name: "cms:post-list", tags: (locale) => postTags(locale) },
);

/**
 * The journal's `page` (from 1) of `limit` posts, newest `publishedAt` first, each at its address
 * in the language; `null` with no database.
 */
export async function readPostList(
  reader: CmsReader,
  page: number,
  limit: number,
): Promise<PostList | null> {
  const list = await readPostPage(reader, page, limit);
  return list === null ? null : { ...list, posts: await withAddresses(reader, list.posts) };
}

/** The posts of `ids` as stored, in the order given (`readPostsByIds` adds the links). */
const readPostsWithIds = cmsRead(
  async (payload, query, ids: readonly number[]): Promise<CmsPostSummary[]> => {
    if (ids.length === 0) return [];
    const { docs } = await payload.find({
      collection: "posts",
      ...query,
      locale: query.locale as never,
      where: { id: { in: [...ids] } },
      depth: 1,
      select: SUMMARY_SELECT,
      limit: ids.length,
      pagination: false,
    });
    const byId = new Map(docs.map((doc) => [doc.id, toSummary(doc as StoredPost)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  },
  { name: "cms:posts-by-id", tags: (locale) => postTags(locale) },
);

/**
 * The posts of `ids` a visitor can read, in the order given (an editorial list's picks), each at
 * its address in the language; `null` with no database.
 */
export async function readPostsByIds(
  reader: CmsReader,
  ids: readonly number[],
): Promise<CmsPostSummary[] | null> {
  const posts = await readPostsWithIds(reader, ids);
  return posts === null ? null : withAddresses(reader, posts);
}

/** One post by its id, in the market's language, with its text (read at depth 1). */
export const readPostById = cmsRead(
  async (payload, query, id: number): Promise<CmsPost | null> => {
    const { docs } = await payload.find({
      collection: "posts",
      ...query,
      locale: query.locale as never,
      where: { id: { equals: id } },
      depth: 1,
      select: { ...SUMMARY_SELECT, content: true, meta: true },
      limit: 1,
      pagination: false,
    });
    const post = docs[0] as StoredPost | undefined;
    return post === undefined
      ? null
      : { ...toSummary(post), content: post.content ?? null, meta: metaOf(post.meta) };
  },
  { name: "cms:post-by-id", tags: (locale) => postTags(locale) },
);

/**
 * The post at `/journal/<slug>` in the market's language (D80's route), or `null` when no post a
 * visitor (or, in Draft Mode, the editor) can read has that slug there, or with no database.
 */
export async function readPostBySlug(reader: CmsReader, slug: string): Promise<CmsPost | null> {
  const id = (await readPostSlugs(reader))?.bySlug[slug];
  return id === undefined ? null : readPostById(reader, id);
}

/**
 * A post's slug in each of `languages` (published, D80's hreflang): English's where a language has
 * none of its own. A language where the post has no address is left out.
 */
export async function postSlugsIn(
  id: number,
  languages: readonly string[],
): Promise<Record<string, string>> {
  const found = await Promise.all(
    languages.map(async (language) => {
      const slugs = await readPostSlugs({ market: { language }, draft: false });
      return [language, slugs?.byId[String(id)]] as const;
    }),
  );
  return Object.fromEntries(
    found.filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}
