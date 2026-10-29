import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaWithTextSection } from "./media-with-text";

describe("MediaWithTextSection", () => {
  it.each(LOCALES)(
    "is a region named by its heading, with the picture, the text and its links, in %s",
    (locale) => {
      const { section, body } = sectionFixtures[locale].mediaWithText;
      render(
        <MediaWithTextSection {...section} copy={{ newTab: catalogs[locale].atoms.link.newTab }}>
          {body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </MediaWithTextSection>,
      );
      const region = screen
        .getByRole("heading", { level: 2, name: section.heading })
        .closest("section") as HTMLElement;
      expect(within(region).getByRole("img", { name: section.image.alt })).toBeTruthy();
      expect(within(region).getByText(body[0] ?? "")).toBeTruthy();
      const links = within(region).getAllByRole("link");
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        section.links.map((link) => link.href),
      );
    },
  );

  it("puts the picture after the text from lg up when its side is the end, and first when it is the start", () => {
    const { section, long } = sectionFixtures.en.mediaWithText;
    const copy = { newTab: "Opens in a new tab" };
    const { container, rerender } = render(<MediaWithTextSection {...section} copy={copy} />);
    const frame = () => container.querySelector("[data-slot=media-with-text-section]");
    expect(frame()?.getAttribute("data-image-side")).toBe("end");
    expect(frame()?.querySelector(".lg\\:order-last")).toBeTruthy();
    rerender(<MediaWithTextSection {...long} copy={copy} />);
    expect(frame()?.getAttribute("data-image-side")).toBe("start");
    expect(frame()?.querySelector(".lg\\:order-last")).toBeNull();
  });

  it("draws an outline link as an outline button, an external one in a new tab, and a text link at 44 px", () => {
    const { section } = sectionFixtures.en.mediaWithText;
    render(
      <MediaWithTextSection
        {...section}
        links={[
          { label: "Shop", href: "/us/collections/heritage", appearance: "outline" },
          { label: "Press", href: "https://press.example/", external: true },
        ]}
        copy={{ newTab: "Opens in a new tab" }}
      />,
    );
    const outline = screen.getByRole("link", { name: "Shop" });
    expect(outline.className).toContain("border-border");
    const press = screen.getByRole("link", { name: "Press (Opens in a new tab)" });
    expect(press.getAttribute("target")).toBe("_blank");
    expect(press.getAttribute("rel")).toBe("noopener noreferrer");
    expect(press.className).toContain("min-h-11");
  });

  it("has no heading, and no list, without a heading or links", () => {
    const { section } = sectionFixtures.en.mediaWithText;
    render(
      <MediaWithTextSection
        image={section.image}
        imageSide="end"
        links={[]}
        copy={{ newTab: "Opens in a new tab" }}
      />,
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
