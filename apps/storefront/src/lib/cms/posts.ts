import "server-only";
import type { Media, Post } from "../../payload-types";
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

/** A post as its page shows it: the summary and the text. */
export type CmsPost = CmsPostSummary & { content: Post["content"] };

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
  Partial<Pick<Post, "excerpt" | "author" | "hero" | "content">>;

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
 * Every readable post's slug in the market's language (its own, or English's), newest first: the
 * route, the static params, hreflang and the lists' links read it. Of two posts with one slug (a
 * post without a Greek slug reads English's, which a Greek post may have taken) the older keeps it.
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

/** The journal's `page` (from 1) of `limit` posts, newest `publishedAt` first. */
export const readPostList = cmsRead(
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

/** The posts of `ids` a visitor can read, in the order given (an editorial list's picks). */
export const readPostsByIds = cmsRead(
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

/** One post by its id, in the market's language, with its text (read at depth 1). */
export const readPostById = cmsRead(
  async (payload, query, id: number): Promise<CmsPost | null> => {
    const { docs } = await payload.find({
      collection: "posts",
      ...query,
      locale: query.locale as never,
      where: { id: { equals: id } },
      depth: 1,
      select: { ...SUMMARY_SELECT, content: true },
      limit: 1,
      pagination: false,
    });
    const post = docs[0] as StoredPost | undefined;
    return post === undefined ? null : { ...toSummary(post), content: post.content ?? null };
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
