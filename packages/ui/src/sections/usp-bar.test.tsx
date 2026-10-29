import { sectionFixtures } from "@shopblok/fixtures";
import { LOCALES } from "@shopblok/i18n";
import { USP_ICONS } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UspBarSection, uspIcons } from "./usp-bar";

describe("UspBarSection", () => {
  it.each(LOCALES)("lists the promises with their titles and lines, in %s", (locale) => {
    const { section } = sectionFixtures[locale].uspBar;
    render(<UspBarSection {...section} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(section.items.length);
    section.items.forEach((item, index) => {
      expect(items[index]?.textContent).toContain(item.title);
      if (item.text !== undefined) expect(items[index]?.textContent).toContain(item.text);
    });
  });

  it("draws an icon for every USP icon, hidden from assistive technology", () => {
    expect(Object.keys(uspIcons).sort()).toEqual([...USP_ICONS].sort());
    const { container } = render(
      <UspBarSection items={USP_ICONS.slice(0, 6).map((icon) => ({ icon, title: icon }))} />,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(6);
    for (const svg of svgs) expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes as many columns as it has items from lg up, at most four", () => {
    const columns = (count: number) => {
      const { container, unmount } = render(
        <UspBarSection items={USP_ICONS.slice(0, count).map((icon) => ({ icon, title: icon }))} />,
      );
      const list = container.querySelector("ul")?.className ?? "";
      unmount();
      return list.match(/lg:grid-cols-(\d)/)?.[1];
    };
    expect([1, 2, 3, 4, 6].map(columns)).toEqual(["1", "2", "3", "4", "4"]);
  });
});
