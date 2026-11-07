// Ours (T82, SETUP.md "Content and promotion block variants (T82)"; M5 plan §1a, D99, D103). The
// seventeen members of the content and promotion blocks, in Testing Library and happy-dom: each
// draws its section with its `data-variant` and its heading, and what each adds over the first
// member (the full-bleed bands under the header, the popup's slot and in-place card, the pick, the
// cards, the one quote, the named strip, the featured post).
import { sectionFixtures } from "@shopblok/fixtures";
import { catalogs } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComparisonSection } from "./comparison";
import { EditorialListSection } from "./editorial-list";
import { FaqSection } from "./faq";
import { LogoCloudSection } from "./logo-cloud";
import { MediaWithTextSection } from "./media-with-text";
import { NewsletterSection } from "./newsletter";
import { PromoBannerSection } from "./promo-banner";
import { sectionsCopy } from "./section-copy";
import { TestimonialsSection } from "./testimonials";
import { UspBarSection } from "./usp-bar";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) => (
    <a {...props}>{children}</a>
  ),
}));

const f = sectionFixtures.en;
const copy = sectionsCopy(catalogs.en);
const root = (container: HTMLElement, family: string) =>
  container.querySelector(`[data-slot=${family}-section]`) as HTMLElement;

describe("the content blocks' members (T82)", () => {
  it.each(["overlap", "full-bleed"] as const)(
    "media with text, %s: says so, with the picture and the words",
    (variant) => {
      const { container } = render(
        <MediaWithTextSection {...f.mediaWithText.section} variant={variant} copy={copy}>
          <p>Body</p>
        </MediaWithTextSection>,
      );
      expect(root(container, "media-with-text").getAttribute("data-variant")).toBe(variant);
      expect(
        screen.getByRole("heading", { level: 2, name: f.mediaWithText.section.heading }),
      ).toBeTruthy();
      expect(screen.getByRole("img", { name: f.mediaWithText.section.image.alt })).toBeTruthy();
      expect(screen.getByText("Body")).toBeTruthy();
    },
  );

  it("media with text, full-bleed: its picture is under the header and the words on the scrim (D103)", () => {
    const { container } = render(
      <MediaWithTextSection {...f.mediaWithText.section} variant="full-bleed" copy={copy} />,
    );
    expect(root(container, "media-with-text").hasAttribute("data-under-header")).toBe(true);
    expect(container.querySelector("[data-slot=media-with-text-scrim]")).not.toBeNull();
  });

  it("media with text, overlap: is not under the header", () => {
    const { container } = render(
      <MediaWithTextSection {...f.mediaWithText.section} variant="overlap" copy={copy} />,
    );
    expect(root(container, "media-with-text").hasAttribute("data-under-header")).toBe(false);
    expect(container.querySelector("[data-slot=media-with-text-card]")).not.toBeNull();
  });

  it("USP bar, strip: one named list of every promise, reachable by Tab to scroll it", () => {
    const { container } = render(
      <UspBarSection {...f.uspBar.section} variant="strip" copy={copy} />,
    );
    expect(root(container, "usp-bar").getAttribute("data-variant")).toBe("strip");
    const list = screen.getByRole("list", { name: copy.uspBar.label });
    expect(list.getAttribute("tabindex")).toBe("0");
    expect(within(list).getAllByRole("listitem")).toHaveLength(f.uspBar.section.items.length);
  });

  it("logo cloud, grid: every logo in its cell", () => {
    const { container } = render(
      <LogoCloudSection {...f.logoCloud.section} variant="grid" copy={copy} />,
    );
    expect(root(container, "logo-cloud").getAttribute("data-variant")).toBe("grid");
    expect(container.querySelectorAll("[data-slot=logo]")).toHaveLength(
      f.logoCloud.section.logos.length,
    );
  });

  it("FAQ, side-heading: the heading and every question as a disclosure", () => {
    const { container } = render(<FaqSection {...f.faq.section} variant="side-heading" />);
    expect(root(container, "faq").getAttribute("data-variant")).toBe("side-heading");
    expect(screen.getByRole("heading", { level: 2, name: f.faq.section.heading })).toBeTruthy();
    expect(container.querySelectorAll("details")).toHaveLength(f.faq.section.items.length);
  });

  it("testimonials, single: the first quote alone", () => {
    const { section } = f.testimonials;
    const { container } = render(
      <TestimonialsSection {...section} variant="single" copy={copy} locale="en-US" />,
    );
    expect(root(container, "testimonials").getAttribute("data-variant")).toBe("single");
    expect(container.querySelectorAll("[data-slot=testimonial]")).toHaveLength(1);
    expect(container.textContent).toContain(section.quotes[0]?.quote);
  });

  it("testimonials, carousel: a carousel named by its heading, a slide per quote", () => {
    const { section } = f.testimonials;
    const { container } = render(
      <TestimonialsSection {...section} variant="carousel" copy={copy} locale="en-US" />,
    );
    expect(root(container, "testimonials").getAttribute("data-variant")).toBe("carousel");
    expect(screen.getByRole("region", { name: section.heading })).toBeTruthy();
    expect(container.querySelectorAll("[data-slot=testimonial]")).toHaveLength(
      section.quotes.length,
    );
  });

  it("testimonials, wall: every quote in the columns", () => {
    const { wall } = f.testimonials;
    const { container } = render(
      <TestimonialsSection {...wall} variant="wall" copy={copy} locale="en-US" />,
    );
    expect(root(container, "testimonials").getAttribute("data-variant")).toBe("wall");
    const list = container.querySelector("[data-slot=testimonials-wall]") as HTMLElement;
    expect(within(list).getAllByRole("listitem")).toHaveLength(wall.quotes.length);
  });

  it("newsletter, split: the editor's picture beside the signup", () => {
    const { split } = f.newsletter;
    const { container } = render(<NewsletterSection {...split} copy={copy} locale="en-US" />);
    expect(root(container, "newsletter").getAttribute("data-variant")).toBe("split");
    expect(screen.getByRole("img", { name: split.image?.alt })).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("editorial list, featured: the first post large, the others as rows", () => {
    const { featured } = f.editorialList;
    const { container } = render(
      <EditorialListSection {...featured} copy={copy} locale="en-US" timeZone="UTC" />,
    );
    expect(root(container, "editorial-list").getAttribute("data-variant")).toBe("featured");
    expect(container.querySelectorAll("[data-slot=post-row]")).toHaveLength(
      featured.posts.length - 1,
    );
    for (const post of featured.posts)
      expect(screen.getByRole("link", { name: post.title })).toBeTruthy();
  });
});

describe("the promotion blocks' members (T82)", () => {
  const promo = f.promoBanner.section;
  const draw = (section: typeof promo, over: Record<string, unknown> = {}) =>
    render(
      <PromoBannerSection
        {...section}
        copy={copy}
        locale="en-US"
        timeZone="UTC"
        frozen
        {...over}
      />,
    ).container;

  it.each(["strip", "ticket", "full-bleed", "countdown", "popup"] as const)(
    "promo banner, %s: says so, with the heading and the code",
    (variant) => {
      const section = variant === "countdown" ? f.promoBanner.countdown : { ...promo, variant };
      const container = draw(section);
      expect(root(container, "promo-banner").getAttribute("data-variant")).toBe(variant);
      expect(screen.getByRole("heading", { level: 2, name: promo.heading })).toBeTruthy();
      expect(container.textContent).toContain(promo.code);
    },
  );

  it("full-bleed: under the header with a picture (D103), not without one", () => {
    expect(
      root(draw({ ...promo, variant: "full-bleed" }), "promo-banner").hasAttribute(
        "data-under-header",
      ),
    ).toBe(true);
    document.body.innerHTML = "";
    expect(
      root(
        draw({ ...promo, variant: "full-bleed", image: undefined }),
        "promo-banner",
      ).hasAttribute("data-under-header"),
    ).toBe(false);
  });

  it("no other promo member is under the header", () => {
    for (const variant of ["standard", "strip", "ticket", "popup"] as const) {
      expect(
        root(draw({ ...promo, variant }), "promo-banner").hasAttribute("data-under-header"),
        variant,
      ).toBe(false);
      document.body.innerHTML = "";
    }
  });

  it("countdown: the clock to the offer's end", () => {
    const container = draw(f.promoBanner.countdown);
    expect(container.querySelector("[data-slot=promo-banner-countdown]")).not.toBeNull();
    expect(container.querySelector("[data-slot=countdown-timer]")).not.toBeNull();
  });

  it("popup without the shop's island (the design system): the card in place, named by its heading, with its close button", () => {
    const container = draw({ ...promo, variant: "popup" });
    const card = container.querySelector("[data-slot=promo-popup]") as HTMLElement;
    const heading = within(card).getByRole("heading", { level: 2, name: promo.heading });
    expect(card.getAttribute("aria-labelledby")).toBe(heading.id);
    expect(within(card).getByRole("button", { name: copy.promoBanner.close })).toBeTruthy();
    expect(card.className).not.toContain("fixed");
  });

  it("popup with the island: the first member's look only without scripts, and the card's body for the island", () => {
    const popup = vi.fn(({ body }: { body: React.ReactNode; labelledBy: string }) => (
      <div data-testid="island">{body}</div>
    ));
    const container = draw({ ...promo, variant: "popup" }, { popup });
    const section = root(container, "promo-banner");
    expect(section.className).toContain("[@media(scripting:enabled)]:hidden");
    expect(popup).toHaveBeenCalledTimes(1);
    const island = screen.getByTestId("island");
    const heading = within(island).getByRole("heading", { level: 2, name: promo.heading });
    expect(popup.mock.calls[0]?.[0].labelledBy).toBe(heading.id);
    expect(container.querySelector("[data-slot=promo-popup]")).toBeNull();
  });

  it("no other member calls the popup's slot", () => {
    const popup = vi.fn(() => null);
    for (const variant of ["standard", "strip", "ticket", "full-bleed"] as const) {
      draw({ ...promo, variant }, { popup });
      document.body.innerHTML = "";
    }
    expect(popup).not.toHaveBeenCalled();
  });

  it("comparison, highlight: the pick's column marked and named", () => {
    const { highlight } = f.comparison;
    const { container } = render(
      <ComparisonSection {...highlight} copy={copy} locale="en-US" prefetch={false} />,
    );
    expect(root(container, "comparison").getAttribute("data-variant")).toBe("highlight");
    const badge = container.querySelector("[data-slot=comparison-pick]") as HTMLElement;
    expect(badge.textContent).toBe(copy.comparison.pick);
    const pick = highlight.products.find((product) => product.id === highlight.pick);
    expect(badge.closest("th")?.textContent).toContain(pick?.title);
  });

  it("comparison, cards: a card per product, its name a link one level down", () => {
    const { section } = f.comparison;
    const { container } = render(
      <ComparisonSection
        {...section}
        variant="cards"
        copy={copy}
        locale="en-US"
        prefetch={false}
      />,
    );
    expect(root(container, "comparison").getAttribute("data-variant")).toBe("cards");
    expect(container.querySelectorAll("[data-slot=comparison-card]")).toHaveLength(
      section.products.length,
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(section.products.length);
    expect(container.querySelector("table")).toBeNull();
  });

  it("comparison, standard: no pick, even one given", () => {
    const { highlight } = f.comparison;
    const { container } = render(
      <ComparisonSection
        {...highlight}
        variant="standard"
        copy={copy}
        locale="en-US"
        prefetch={false}
      />,
    );
    expect(container.querySelector("[data-slot=comparison-pick]")).toBeNull();
  });
});
