import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionFrame, SectionHeading, sectionFrameClasses } from "./section-frame";

describe("SectionFrame", () => {
  it("is a section with the anchor as its id, its heading an h2, and no region of its name", () => {
    const { container } = render(
      <SectionFrame settings={{ anchor: "care" }} slot="test-section">
        <SectionHeading>Care</SectionHeading>
      </SectionFrame>,
    );
    const section = container.querySelector("section");
    expect(section?.id).toBe("care");
    expect(section?.dataset["slot"]).toBe("test-section");
    expect(screen.getByRole("heading", { level: 2, name: "Care" })).toBeTruthy();
    // Two FAQs with one heading would be two regions of one name (axe's `landmark-unique`).
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("applies the defaults of `sectionSettings`: medium spacing, default surface and width, everywhere", () => {
    const { outer, inner } = sectionFrameClasses();
    expect(outer).toContain("py-10");
    expect(outer).toContain("bg-background");
    expect(outer).not.toMatch(/hidden/);
    expect(inner).toContain("max-w-7xl");
  });

  it("maps each setting to its classes", () => {
    expect(sectionFrameClasses({ spacing: "none" }).outer).toContain("py-0");
    expect(sectionFrameClasses({ spacing: "large" }).outer).toContain("py-16");
    expect(sectionFrameClasses({ surface: "muted" }).outer).toContain("bg-muted");
    expect(sectionFrameClasses({ container: "narrow" }).inner).toContain("max-w-3xl");
    expect(sectionFrameClasses({ container: "full" }).inner).toContain("max-w-none");
    expect(sectionFrameClasses({ visibility: "mobile" }).outer).toContain("lg:hidden");
    expect(sectionFrameClasses({ visibility: "desktop" }).outer).toContain("max-lg:hidden");
  });

  it("turns the theme over on the inverse surface, from the neutral scale's ends", () => {
    const { outer } = sectionFrameClasses({ surface: "inverse" });
    expect(outer).toContain("[--background:var(--neutral-950)]");
    expect(outer).toContain("[--foreground:var(--neutral-50)]");
    expect(outer).toContain("[--primary:var(--neutral-50)]");
    expect(outer).toContain("[--primary-foreground:var(--neutral-950)]");
    // No token is set from another token it sets itself (that would be a cycle, and invalid).
    const set = [...outer.matchAll(/\[--([a-z-]+):var\(--([a-z0-9-]+)\)\]/g)];
    const names = new Set(set.map((match) => match[1]));
    for (const [, , source] of set) expect(names.has(source)).toBe(false);
  });

  it("is a plain element without a heading, and a div when asked", () => {
    const { container } = render(
      <SectionFrame as="div" slot="spacer-section">
        <span />
      </SectionFrame>,
    );
    expect(screen.queryByRole("region")).toBeNull();
    expect(container.firstElementChild?.tagName).toBe("DIV");
    expect(container.firstElementChild?.getAttribute("data-surface")).toBe("default");
  });
});
