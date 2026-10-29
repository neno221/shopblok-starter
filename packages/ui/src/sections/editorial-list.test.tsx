// Ours (T66, SETUP.md "Posts and the journal (T66)"). The editorial list, in Testing Library and
// happy-dom: each post a card whose title is its one link, the date in the market's time zone, the
// author line, the heading levels under and without the section's heading, and the journal's link.
import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorialListSection } from "./editorial-list";
import { sectionsCopy } from "./section-copy";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;

describe("EditorialListSection", () => {
  it.each(LOCALES)("draws each post as a card under the heading, in %s", (locale) => {
    const { section } = sectionFixtures[locale].editorialList;
    render(
      <EditorialListSection
        {...section}
        copy={sectionsCopy(catalogs[locale])}
        locale={htmlLang[locale]}
        timeZone="UTC"
        prefetch={false}
      />,
    );
    const heading = screen.getByRole("heading", { level: 2, name: section.heading });
    const root = heading.closest("section") as HTMLElement;
    const cards = within(root).getAllByRole("article");
    expect(cards).toHaveLength(section.posts.length);
    section.posts.forEach((post, index) => {
      const card = cards[index] as HTMLElement;
      const title = within(card).getByRole("heading", { level: 3 });
      expect(title.textContent).toBe(post.title);
      expect(within(card).getAllByRole("link")).toHaveLength(1);
      expect(within(title).getByRole("link").getAttribute("href")).toBe(post.href);
      expect(card.querySelector("time")?.getAttribute("dateTime")).toBe(post.publishedAt);
      if (post.author !== undefined) expect(card.textContent).toContain(post.author);
      if (post.excerpt !== undefined) expect(card.textContent).toContain(post.excerpt);
      // The picture is decoration: the title beside it names the post.
      expect(card.querySelector("img")?.getAttribute("alt") ?? "").toBe("");
    });
    const all = within(root).getByRole("link", { name: section.link?.label });
    expect(all.getAttribute("href")).toBe(section.link?.href);
  });

  it("dates a post in the market's time zone", () => {
    const post = {
      id: "late",
      title: "Late news",
      href: "/journal/late-news",
      publishedAt: "2026-09-30T22:30:00.000Z",
    };
    const copy = sectionsCopy(catalogs.en);
    const { unmount } = render(
      <EditorialListSection posts={[post]} copy={copy} locale="en-US" timeZone="UTC" />,
    );
    expect(document.querySelector("time")?.textContent).toBe("September 30, 2026");
    unmount();
    render(
      <EditorialListSection posts={[post]} copy={copy} locale="en-US" timeZone="Asia/Nicosia" />,
    );
    expect(document.querySelector("time")?.textContent).toBe("October 1, 2026");
  });

  it("gives the titles the h2 without a heading of its own, and draws no link or author when there is none", () => {
    const { long } = sectionFixtures.en.editorialList;
    render(
      <EditorialListSection
        {...long}
        posts={long.posts.map(({ author: _, ...post }) => post)}
        copy={sectionsCopy(catalogs.en)}
        locale="en-US"
      />,
    );
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      long.posts[0]?.title,
    ]);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(document.querySelector("img")).toBeNull();
    expect(document.body.textContent).not.toContain("By ");
  });
});
