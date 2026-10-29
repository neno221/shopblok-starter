import { sectionFixtures } from "@shopblok/fixtures";
import { LOCALES } from "@shopblok/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FaqSection } from "./faq";

describe("FaqSection", () => {
  it.each(LOCALES)("asks every question as a disclosure, all closed, in %s", (locale) => {
    const { section } = sectionFixtures[locale].faq;
    const { container } = render(<FaqSection {...section} />);
    expect(screen.getByRole("heading", { level: 2, name: section.heading })).toBeTruthy();
    const items = container.querySelectorAll("details");
    expect(items).toHaveLength(section.items.length);
    section.items.forEach((item, index) => {
      const details = items[index];
      expect(details?.open).toBe(false);
      expect(details?.querySelector("summary")?.textContent).toBe(item.title);
      expect([...(details?.querySelectorAll("p") ?? [])].map((p) => p.textContent)).toEqual(
        item.answer,
      );
    });
  });

  it("opens the questions it is told to, and any number at once", async () => {
    const { section } = sectionFixtures.en.faq;
    const [first, second] = section.items;
    const { container } = render(<FaqSection {...section} defaultOpen={[first?.value ?? ""]} />);
    const items = container.querySelectorAll("details");
    expect(items[0]?.open).toBe(true);
    await userEvent.click(items[1]?.querySelector("summary") as HTMLElement);
    expect(items[1]?.open).toBe(true);
    expect(items[0]?.open).toBe(true);
    expect(second).toBeDefined();
  });

  it("is a narrow column unless its settings say otherwise, and keeps the summary 44 px tall", () => {
    const { section } = sectionFixtures.en.faq;
    const { container, rerender } = render(<FaqSection {...section} />);
    expect(container.querySelector(".max-w-3xl")).toBeTruthy();
    expect(container.querySelector("summary")?.className).toContain("min-h-11");
    // A key present but unset (a resolver's) keeps the default too.
    rerender(<FaqSection {...section} settings={{ container: undefined, surface: "muted" }} />);
    expect(container.querySelector(".max-w-3xl")).toBeTruthy();
    rerender(<FaqSection {...section} settings={{ container: "wide" }} />);
    expect(container.querySelector(".max-w-3xl")).toBeNull();
  });
});
