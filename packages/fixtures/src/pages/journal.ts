import type { PostCard } from "@shopblok/registry/contracts";
import { commerceFixtures } from "../commerce";
import { copies } from "../commerce/copy";
import { fixtureImage } from "../commerce/images";
import type { DesignSystemLocale } from "../design-system";

// The journal's posts (T66): the four posts the journal's page, the post's page and the
// `editorialList` section draw, newest first, each at `/journal/<slug>` under the DS market's
// prefix, dated before the fixtures' `now`. The slugs are the same in every locale; the words are
// each locale's own (`commerce/copy`).

/** The posts' slugs, newest first. */
export const JOURNAL_SLUGS = [
  "autumn-layers",
  "organic-cotton-care",
  "behind-the-seams",
  "studio-notes",
] as const;

/** When each post was published: a fortnight apart, all before `fixtureNow`. */
const PUBLISHED = [
  "2026-09-28T07:30:00.000Z",
  "2026-09-14T07:30:00.000Z",
  "2026-08-31T07:30:00.000Z",
  "2026-08-17T07:30:00.000Z",
] as const;

/** The journal's home in the DS market: `/journal` under its prefix. */
export const journalHref = (locale: DesignSystemLocale) =>
  `${commerceFixtures[locale].header.content.homeHref.replace(/\/$/, "")}/journal`;

/** The four posts as cards, in `locale`; the last has no picture. */
export function journalPosts(locale: DesignSystemLocale): PostCard[] {
  const { posts } = copies[locale].journal;
  return posts.map((post, index) => ({
    id: `post-${index + 1}`,
    title: post.title,
    href: `${journalHref(locale)}/${JOURNAL_SLUGS[index]}`,
    excerpt: post.excerpt,
    ...(index === posts.length - 1
      ? {}
      : { image: fixtureImage({ seed: 30 + index, ratio: "4:3", alt: post.alt }) }),
    publishedAt: PUBLISHED[index] ?? PUBLISHED[0],
    author: post.author,
  }));
}
