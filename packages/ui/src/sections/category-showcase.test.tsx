import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryShowcaseSection } from "./category-showcase";
import { sectionsCopy } from "./section-copy";

describe("CategoryShowcaseSection", () => {
  it.each(LOCALES)(
    "draws a tile per category, each one link named by the category, in %s",
    (locale) => {
      const { section } = sectionFixtures[locale].categoryShowcase;
      const { container } = render(
        <CategoryShowcaseSection {...section} copy={sectionsCopy(catalogs[locale])} />,
      );
      expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
      expect(container.textContent).toContain(section.intro);
      const list = screen.getAllByRole("list")[0] as HTMLElement;
      const links = within(list).getAllByRole("link");
      expect(links.map((link) => link.textContent)).toEqual(
        section.tiles.map((tile) => tile.label),
      );
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        section.tiles.map((tile) => tile.href),
      );
      // The pictures are decoration: the name says where the tile goes.
      for (const image of container.querySelectorAll("[data-slot=category-tile] img"))
        expect(image.getAttribute("alt")).toBe("");
      expect(screen.getByRole("link", { name: section.link?.label })).toBeTruthy();
    },
  );

  it("draws an editor's label instead of the category's name", () => {
    const { edited } = sectionFixtures.en.categoryShowcase;
    render(<CategoryShowcaseSection {...edited} copy={sectionsCopy(catalogs.en)} />);
    expect(screen.getByRole("link", { name: edited.tiles[2]?.label })).toBeTruthy();
  });
});
