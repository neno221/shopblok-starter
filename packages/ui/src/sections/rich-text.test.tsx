import { sectionFixtures } from "@shopblok/fixtures";
import { LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichTextSection } from "./rich-text";

describe("RichTextSection", () => {
  it.each(LOCALES)("draws its children as prose in the page's column, in %s", (locale) => {
    const { section, body } = sectionFixtures[locale].richText;
    const { container } = render(
      <RichTextSection {...section}>
        <h2>{body.heading}</h2>
        <p>
          {body.paragraphs[0]} <a href={body.link.href}>{body.link.label}</a>
        </p>
      </RichTextSection>,
    );
    expect(screen.getByRole("heading", { level: 2, name: body.heading })).toBeTruthy();
    expect(screen.getByRole("link", { name: body.link.label }).getAttribute("href")).toBe(
      body.link.href,
    );
    expect(container.querySelector("[data-slot=rich-text-section] [data-slot=prose]")).toBeTruthy();
  });

  it("applies its settings: the anchor and the surface", () => {
    const { container } = render(
      <RichTextSection settings={{ anchor: "story", surface: "muted" }}>
        <p>Text</p>
      </RichTextSection>,
    );
    const section = container.querySelector("#story");
    expect(section?.getAttribute("data-surface")).toBe("muted");
  });
});
