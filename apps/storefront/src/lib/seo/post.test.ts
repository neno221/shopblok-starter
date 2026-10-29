// T66: a post's BlogPosting and a journal page's Blog, each with the BreadcrumbList (SPEC §12, D80).
import { pageFixtures } from "@shopblok/fixtures";
import { describe, expect, it } from "vitest";
import { journalJsonLd, postJsonLd } from "./post";

const base = new URL("https://shop.example");
const { page: post } = pageFixtures.en.post;
const journal = pageFixtures.en.journal.first;

type Graph = { "@graph": Record<string, unknown>[] };

describe("postJsonLd", () => {
  const graph = postJsonLd(
    {
      post: { ...post, image: { ...post.image!, src: "/api/media/file/hero.webp" } },
      href: "/us/journal/autumn-layers",
      language: "en-US",
    },
    base,
  ) as Graph;

  it("is a BlogPosting with the headline, the date, the author, the summary and the picture", () => {
    expect(graph["@graph"][0]).toEqual({
      "@type": "BlogPosting",
      "@id": "https://shop.example/us/journal/autumn-layers#post",
      headline: post.title,
      url: "https://shop.example/us/journal/autumn-layers",
      mainEntityOfPage: "https://shop.example/us/journal/autumn-layers",
      datePublished: post.publishedAt,
      inLanguage: "en-US",
      author: { "@type": "Person", name: post.author },
      description: post.excerpt,
      image: "https://shop.example/api/media/file/hero.webp",
    });
  });

  it("lists Home, the journal and the post as its BreadcrumbList, with absolute URLs", () => {
    const list = graph["@graph"][1] as { itemListElement: { name: string; item: string }[] };
    expect(list["@type" as never]).toBe("BreadcrumbList");
    expect(list.itemListElement.map((step) => step.name)).toEqual([
      ...post.breadcrumbs.trail.map((step) => step.label),
      post.title,
    ]);
    expect(list.itemListElement.at(-1)?.item).toBe("https://shop.example/us/journal/autumn-layers");
  });

  it("leaves a data-URI picture out (a crawler cannot fetch it)", () => {
    const fixture = postJsonLd({ post, href: "/journal/x", language: "en-US" }, base) as Graph;
    expect(fixture["@graph"][0]).not.toHaveProperty("image");
  });
});

describe("journalJsonLd", () => {
  it("is a Blog listing the page's posts, and the page's BreadcrumbList", () => {
    const graph = journalJsonLd({ journal, href: "/us/journal", language: "en-US" }, base) as Graph;
    const blog = graph["@graph"][0] as { blogPost: { headline: string; url: string }[] };
    expect(blog["@type" as never]).toBe("Blog");
    expect(blog.blogPost.map((each) => each.headline)).toEqual(
      journal.posts.map((each) => each.title),
    );
    expect(blog.blogPost[0]?.url).toMatch(/^https:\/\/shop\.example\//);
    expect((graph["@graph"][1] as { "@type": string })["@type"]).toBe("BreadcrumbList");
  });
});
