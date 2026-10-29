// Ours (T65, SETUP.md "Pages and the homepage (T65)"). The CMS page template, in Testing Library and
// happy-dom: the page's one `<main>` and `<h1>`, the breadcrumbs of a page with parents, and a hero
// that takes the heading.
import { catalogs } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CmsPageTemplate } from "./cms-page";

const copy = catalogs.en.molecules.breadcrumbs;
const breadcrumbs = {
  trail: [
    { label: "Home", href: "/us" },
    { label: "About us", href: "/us/about" },
  ],
  current: "Our team",
};

describe("CmsPageTemplate", () => {
  it("is the page's main, its title the one heading, its blocks under it", () => {
    render(
      <CmsPageTemplate title="Our team" heading="title" copy={copy}>
        <section data-testid="block">
          <h2>Who we are</h2>
        </section>
      </CmsPageTemplate>,
    );
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Our team");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const title = screen.getByRole("heading", { level: 1 });
    const block = screen.getByTestId("block");
    expect(title.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("draws the breadcrumbs of a page with parents, ending on the page as text", () => {
    render(
      <CmsPageTemplate title="Our team" heading="title" breadcrumbs={breadcrumbs} copy={copy} />,
    );
    const nav = screen.getByRole("navigation", { name: copy.label });
    expect(screen.getByRole("link", { name: "About us" }).getAttribute("href")).toBe("/us/about");
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe("Our team");
  });

  it("leaves the heading to a hero that opens the page", () => {
    render(
      <CmsPageTemplate title="Home" heading="hero" copy={copy} as="div" mainId="ds-main">
        <h1>Made to last</h1>
      </CmsPageTemplate>,
    );
    expect(screen.queryByRole("main")).toBeNull();
    expect(document.getElementById("ds-main")?.getAttribute("data-heading")).toBe("hero");
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual([
      "Made to last",
    ]);
    expect(document.querySelector('[data-slot="cms-page-head"]')).toBeNull();
  });
});
