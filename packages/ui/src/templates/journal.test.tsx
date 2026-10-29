// Ours (T66, SETUP.md "Posts and the journal (T66)"). The journal template, in Testing Library and
// happy-dom: the page's one `<main>` and `<h1>`, the breadcrumbs, the posts as `<h2>` cards, the
// pager's links by path, and the empty journal.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JournalTemplate, journalCopy } from "./journal";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const hrefFor = (page: number) => (page === 1 ? "/us/journal" : `/us/journal/page/${page}`);

describe("JournalTemplate", () => {
  it.each(LOCALES)("is the page's main with the journal's name and its posts, in %s", (locale) => {
    const journal = pageFixtures[locale].journal.first;
    const copy = journalCopy(catalogs[locale]);
    render(
      <JournalTemplate
        {...journal}
        copy={copy}
        locale={htmlLang[locale]}
        timeZone="UTC"
        hrefFor={hrefFor}
        prefetch={false}
      />,
    );
    expect(screen.getByRole("main").id).toBe("main");
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual([
      journal.title,
    ]);
    expect(journal.title).toBe(catalogs[locale].templates.journal.title);
    const crumbs = screen.getByRole("navigation", { name: copy.breadcrumbs.label });
    expect(crumbs.querySelector('[aria-current="page"]')?.textContent).toBe(journal.title);
    const titles = screen.getAllByRole("heading", { level: 2 });
    expect(titles.map((h) => h.textContent)).toEqual(journal.posts.map((post) => post.title));
    const pager = screen.getByRole("navigation", { name: copy.pagination.label });
    // The pager has a window for phones and one for wider screens; each links page 2 by path.
    const second = within(pager)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/us/journal/page/2");
    expect(second.length).toBeGreaterThan(0);
  });

  it("preloads the first picture, the largest paint, and loads the others lazily", () => {
    // A data URI is never lazy in next/image: the pictures at an address, as the shop's are.
    const journal = pageFixtures.en.journal.first;
    const posts = journal.posts.map((post, index) =>
      post.image === undefined
        ? post
        : { ...post, image: { ...post.image, src: `/api/media/file/post-${index}.webp` } },
    );
    const { container } = render(
      <JournalTemplate
        {...journal}
        posts={posts}
        copy={journalCopy(catalogs.en)}
        locale="en-US"
        hrefFor={hrefFor}
      />,
    );
    const loading = [...container.querySelectorAll("img")].map((img) =>
      img.getAttribute("loading"),
    );
    expect(loading[0]).not.toBe("lazy");
    expect(loading.slice(1).every((value) => value === "lazy")).toBe(true);
    expect(loading.length).toBeGreaterThan(1);
  });

  it("says there is nothing yet and points at the shop, with no pager, when the journal is empty", () => {
    const journal = pageFixtures.en.journal.empty;
    const copy = journalCopy(catalogs.en);
    render(<JournalTemplate {...journal} copy={copy} locale="en-US" hrefFor={hrefFor} as="div" />);
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(copy.journal.empty.title);
    expect(screen.getByRole("link", { name: copy.journal.empty.action }).getAttribute("href")).toBe(
      journal.shopHref,
    );
    expect(screen.queryByRole("navigation", { name: copy.pagination.label })).toBeNull();
    expect(screen.queryByRole("article")).toBeNull();
  });
});
