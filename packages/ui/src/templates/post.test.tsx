// Ours (T66, SETUP.md "Posts and the journal (T66)"). The post template, in Testing Library and
// happy-dom: the page's one `<main>` and `<h1>` in an `<article>`, the breadcrumbs to the journal,
// the date and the author, the lead, the picture with its own text, and the post's text.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostTemplate, postCopy } from "./post";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("PostTemplate", () => {
  it.each(LOCALES)("draws the post as an article in the page's main, in %s", (locale) => {
    const { page, body } = pageFixtures[locale].post;
    const copy = postCopy(catalogs[locale]);
    render(
      <PostTemplate {...page} copy={copy} locale={htmlLang[locale]} timeZone="UTC">
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </PostTemplate>,
    );
    const main = screen.getByRole("main");
    const article = screen.getByRole("article");
    expect(main.contains(article)).toBe(true);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual([
      page.title,
    ]);
    const crumbs = screen.getByRole("navigation", { name: copy.breadcrumbs.label });
    const journal = page.breadcrumbs.trail.at(-1);
    expect(screen.getByRole("link", { name: journal?.label }).getAttribute("href")).toBe(
      journal?.href,
    );
    expect(crumbs.querySelector('[aria-current="page"]')?.textContent).toBe(page.title);
    expect(article.querySelector("time")?.getAttribute("dateTime")).toBe(page.publishedAt);
    expect(article.textContent).toContain(page.author);
    expect(article.querySelector('[data-slot="post-lead"]')?.textContent).toBe(page.excerpt);
    expect(screen.getByRole("img", { name: page.image?.alt })).toBeTruthy();
    expect(article.querySelector('[data-slot="prose"]')?.textContent).toContain(body[0]);
  });

  it("leaves out what the post has not got: no picture, no lead, no author", () => {
    const { long } = pageFixtures.en.post;
    const { author: _, ...post } = long;
    render(<PostTemplate {...post} copy={postCopy(catalogs.en)} locale="en-US" as="div" />);
    expect(screen.queryByRole("main")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector('[data-slot="post-lead"]')).toBeNull();
    expect(document.querySelector('[data-slot="prose"]')).toBeNull();
    expect(document.body.textContent).not.toContain("By ");
  });
});
