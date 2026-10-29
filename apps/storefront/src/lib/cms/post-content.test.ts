// T66: posts as their cards, a page of the journal and a post's page (D80, D59).
import { describe, expect, it } from "vitest";
import { journalContent, postCard, postContent } from "./post-content";
import type { CmsPost, CmsPostSummary } from "./posts";

const url = (path: string) => `/us${path === "/" ? "" : path}`;

const summary = (over: Partial<CmsPostSummary> = {}): CmsPostSummary => ({
  id: 7,
  title: "How to care for your knitwear",
  slug: "knitwear-care",
  excerpt: "Cold water and a flat dry.",
  author: "Maria Ioannou",
  publishedAt: "2026-10-20T08:00:00.000Z",
  hero: {
    id: 1,
    alt: "Folded knitwear",
    url: "/api/media/file/hero.webp",
    width: 1600,
    height: 900,
    updatedAt: "",
    createdAt: "",
  },
  ...over,
});

describe("postCard", () => {
  it("links the post at /journal/<slug> in the market, with its picture, date, author and summary", () => {
    expect(postCard(summary(), url)).toEqual({
      id: "7",
      title: "How to care for your knitwear",
      href: "/us/journal/knitwear-care",
      excerpt: "Cold water and a flat dry.",
      image: { src: "/api/media/file/hero.webp", alt: "Folded knitwear", width: 1600, height: 900 },
      publishedAt: "2026-10-20T08:00:00.000Z",
      author: "Maria Ioannou",
    });
  });

  it("encodes a slug in another script, and leaves out what the post has not got", () => {
    const card = postCard(
      summary({ slug: "φροντίδα", excerpt: null, author: "", hero: null }),
      url,
    );
    expect(card?.href).toBe("/us/journal/%CF%86%CF%81%CE%BF%CE%BD%CF%84%CE%AF%CE%B4%CE%B1");
    expect(card).not.toHaveProperty("excerpt");
    expect(card).not.toHaveProperty("author");
    expect(card).not.toHaveProperty("image");
  });

  it("is null for a post with no slug yet or no title (a draft saved half-done)", () => {
    expect(postCard(summary({ slug: "" }), url)).toBeNull();
    expect(postCard(summary({ title: "" }), url)).toBeNull();
  });
});

describe("journalContent", () => {
  const copy = { title: "Journal", home: "Home", url };

  it("draws a page's posts under Home, with the pager and the store as the way on", () => {
    const journal = journalContent({ posts: [summary()], totalPages: 2 }, 2, copy);
    expect(journal?.breadcrumbs).toEqual({
      trail: [{ label: "Home", href: "/us" }],
      current: "Journal",
    });
    expect(journal?.page).toEqual({ page: 2, pageCount: 2 });
    expect(journal?.posts.map((post) => post.href)).toEqual(["/us/journal/knitwear-care"]);
    expect(journal?.shopHref).toBe("/us/store");
  });

  it("draws the first page with no post, and no page after the last (a 404)", () => {
    expect(journalContent({ posts: [], totalPages: 1 }, 1, copy)?.posts).toEqual([]);
    expect(journalContent({ posts: [], totalPages: 1 }, 2, copy)).toBeNull();
    expect(journalContent({ posts: [summary()], totalPages: 2 }, 3, copy)).toBeNull();
  });
});

describe("postContent", () => {
  const post: CmsPost = { ...summary(), content: null, meta: {} };

  it("puts the post under Home and the journal, with its picture's own alternative text", () => {
    expect(postContent(post, { journal: "Journal", home: "Home", url })).toEqual({
      title: post.title,
      breadcrumbs: {
        trail: [
          { label: "Home", href: "/us" },
          { label: "Journal", href: "/us/journal" },
        ],
        current: post.title,
      },
      publishedAt: post.publishedAt,
      author: "Maria Ioannou",
      excerpt: "Cold water and a flat dry.",
      image: { src: "/api/media/file/hero.webp", alt: "Folded knitwear", width: 1600, height: 900 },
    });
  });
});
