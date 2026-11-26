import type { JournalPage, PostPage } from "@shopblok/registry/contracts";
import type { Blog, BlogPosting, Graph } from "schema-dts";
import { absolute, pageBreadcrumbs, shareableImage, siteBase } from "./product";

// The journal's structured data (SPEC §12, D80, T66): a post is a `BlogPosting` (its headline,
// date, author, picture and summary, in the market's language), the journal a `Blog` listing the
// page's posts, each with the page's `BreadcrumbList`, as one `@graph`. URLs are absolute, from
// `NEXT_PUBLIC_BASE_URL`.

export type PostJsonLdInput = {
  post: PostPage;
  /** The post's own URL, its canonical. */
  href: string;
  /** The market's `<html lang>` (`el-CY`). */
  language: string;
};

/** A post's `BlogPosting` and its `BreadcrumbList`. */
export function postJsonLd(input: PostJsonLdInput, base: URL = siteBase()): Graph {
  const { post } = input;
  const url = absolute(input.href, base);
  const image = post.image === undefined ? undefined : shareableImage(post.image.src, base);
  const posting: BlogPosting = {
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
  };
  return {
    "@context": "https://schema.org",
    "@graph": [posting, pageBreadcrumbs(post.breadcrumbs, input.href, base)],
  };
}

/** A page of the journal: a `Blog` with the page's posts, and its `BreadcrumbList`. */
export function journalJsonLd(
  input: { journal: JournalPage; href: string; language: string },
  base: URL = siteBase(),
): Graph {
  const { journal } = input;
  const url = absolute(input.href, base);
  const blog: Blog = {
    "@type": "Blog",
    "@id": `${url}#blog`,
    name: journal.title,
    url,
    inLanguage: input.language,
    blogPost: journal.posts.map((post): BlogPosting => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: absolute(post.href, base),
      datePublished: post.publishedAt,
      ...(post.author === undefined ? {} : { author: { "@type": "Person", name: post.author } }),
    })),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [blog, pageBreadcrumbs(journal.breadcrumbs, input.href, base)],
  };
}
