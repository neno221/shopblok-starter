import type { Breadcrumbs, JournalPage, PostPage } from "@shopblok/registry/contracts";
import { absolute, breadcrumbList, shareableImage, siteBase } from "./product";

// The journal's structured data (SPEC §12, D80, T66): a post is a `BlogPosting` (its headline,
// date, author, picture and summary, in the market's language), the journal a `Blog` listing the
// page's posts, each with the page's `BreadcrumbList`, as one `@graph`. URLs are absolute, from
// `NEXT_PUBLIC_BASE_URL`.

/** A page's breadcrumbs, the page itself last at `href`, as its `BreadcrumbList`. */
const pageBreadcrumbs = (breadcrumbs: Breadcrumbs, href: string, base: URL) =>
  breadcrumbList([...breadcrumbs.trail, { label: breadcrumbs.current, href }], base);

export type PostJsonLdInput = {
  post: PostPage;
  /** The post's own URL, its canonical. */
  href: string;
  /** The market's `<html lang>` (`el-CY`). */
  language: string;
};

/** A post's `BlogPosting` and its `BreadcrumbList`. */
export function postJsonLd(input: PostJsonLdInput, base: URL = siteBase()): object {
  const { post } = input;
  const url = absolute(input.href, base);
  const image = post.image === undefined ? undefined : shareableImage(post.image.src, base);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#post`,
        headline: post.title,
        url,
        mainEntityOfPage: url,
        datePublished: post.publishedAt,
        inLanguage: input.language,
        ...(post.author === undefined ? {} : { author: { "@type": "Person", name: post.author } }),
        ...(post.excerpt === undefined ? {} : { description: post.excerpt }),
        ...(image === undefined ? {} : { image }),
      },
      pageBreadcrumbs(post.breadcrumbs, input.href, base),
    ],
  };
}

/** A page of the journal: a `Blog` with the page's posts, and its `BreadcrumbList`. */
export function journalJsonLd(
  input: { journal: JournalPage; href: string; language: string },
  base: URL = siteBase(),
): object {
  const { journal } = input;
  const url = absolute(input.href, base);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${url}#blog`,
        name: journal.title,
        url,
        inLanguage: input.language,
        blogPost: journal.posts.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          url: absolute(post.href, base),
          datePublished: post.publishedAt,
          ...(post.author === undefined
            ? {}
            : { author: { "@type": "Person", name: post.author } }),
        })),
      },
      pageBreadcrumbs(journal.breadcrumbs, input.href, base),
    ],
  };
}
