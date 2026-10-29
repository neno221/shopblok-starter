import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogoCloudSection } from "./logo-cloud";

describe("LogoCloudSection", () => {
  it.each(LOCALES)("names each logo by its brand, under its heading, in %s", (locale) => {
    const { section } = sectionFixtures[locale].logoCloud;
    render(<LogoCloudSection {...section} copy={{ newTab: catalogs[locale].atoms.link.newTab }} />);
    const region = screen
      .getByRole("heading", { level: 2, name: section.heading })
      .closest("section") as HTMLElement;
    for (const logo of section.logos)
      expect(within(region).getByRole("img", { name: logo.name })).toBeTruthy();
  });

  it("opens a logo's link in a new tab, says so, and makes it a 44 px target", () => {
    const { section } = sectionFixtures.en.logoCloud;
    render(<LogoCloudSection {...section} copy={{ newTab: "Opens in a new tab" }} />);
    const linked = section.logos.filter((logo) => logo.href !== undefined);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(linked.length);
    for (const [index, link] of links.entries()) {
      expect(link.getAttribute("href")).toBe(linked[index]?.href);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
      expect(link.textContent).toContain("Opens in a new tab");
      expect(link.className).toContain("min-h-11");
    }
  });
});
