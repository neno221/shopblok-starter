import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewsletterSection } from "./newsletter";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => (
    <a {...props}>{children}</a>
  ),
}));

const htmlLang = {
  en: "en-US",
  el: "el-CY",
  de: "de-DE",
  fr: "fr-CH",
} as const;

describe("NewsletterSection", () => {
  it.each(LOCALES)("is the signup under the editor's heading and line, an h2, in %s", (locale) => {
    const { section } = sectionFixtures[locale].newsletter;
    const copy = { newsletter: catalogs[locale].molecules.newsletterForm };
    const { container } = render(
      <NewsletterSection {...section} copy={copy} locale={htmlLang[locale]} />,
    );
    const heading = screen.getByRole("heading", {
      level: 2,
      name: section.heading,
    });
    expect(screen.getByRole("form", { name: section.heading }).contains(heading)).toBe(true);
    expect(container.textContent).toContain(section.text);
    expect(container.querySelector("[data-slot=newsletter-section]")?.tagName).toBe("SECTION");
    expect(screen.getByRole("button").textContent).toBe(copy.newsletter.submit);
  });

  it("falls back to the catalog's heading and line, and sits in the narrow column", () => {
    const { section } = sectionFixtures.en.newsletter;
    const copy = { newsletter: catalogs.en.molecules.newsletterForm };
    const { container } = render(
      <NewsletterSection
        newsletter={section.newsletter}
        settings={{ anchor: "join" }}
        copy={copy}
        locale="en-US"
      />,
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(copy.newsletter.title);
    expect(container.textContent).toContain(copy.newsletter.description);
    expect(container.querySelector("section")?.id).toBe("join");
    expect(container.querySelector("section > div")?.className).toContain("max-w-3xl");
  });

  it("posts the address under the form's own field name, with the shop's hidden inputs and id", () => {
    const { section } = sectionFixtures.en.newsletter;
    const { container } = render(
      <NewsletterSection
        {...section}
        copy={{ newsletter: catalogs.en.molecules.newsletterForm }}
        locale="en-US"
        fieldName="address"
        formId="newsletter-1"
        hiddenFields={<input type="hidden" name="trap" />}
      />,
    );
    const form = container.querySelector("form");
    expect(form?.id).toBe("newsletter-1");
    expect(screen.getByRole("textbox").getAttribute("name")).toBe("address");
    expect(form?.querySelector("input[name=trap]")).not.toBeNull();
  });
});
