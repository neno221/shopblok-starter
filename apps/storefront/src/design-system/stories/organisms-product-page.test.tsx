// Ours (T38, SETUP.md "Product-page organisms (T38)").
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { ProductGallery } from "@shopblok/ui/organisms/product-gallery";
import { ProductInfoAccordions } from "@shopblok/ui/organisms/product-info-accordions";
import { ReviewsSection } from "@shopblok/ui/organisms/reviews-section";
import { SizeGuideDialog } from "@shopblok/ui/organisms/size-guide-dialog";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverlayBox } from "../components/overlay-box";
import { createContext } from "../context";
import { productPageOrganismStories } from "./organisms-product-page";

// The stories of ProductGallery, ProductInfoAccordions, ReviewsSection and SizeGuideDialog (T38;
// D40, D41, D45, D46): the states the task lists are there, each gives its component what its
// description says in every locale, every landmark of the page is named apart, the dialogs are
// drawn open in boxes of their own and take no focus, every link is told not to prefetch, and the
// props that reach a client part serialize, because a story renders on the server. A story renders
// to static markup here (the storefront's tests have no DOM), so what the components do when they
// are used is the ui package's tests (embla, the dialogs, the toggle, the focus), and the open
// states, which a server does not draw, are read in `organisms-product-page.dom.test.tsx`. The
// layout at 375, 768 and 1440 px in the four languages was checked in headless Chromium, and the
// design system's own browser checks are the lead's.

/** The one character the house style leaves out of every sentence. */
const EM_DASH = String.fromCharCode(0x2014);

type Id = keyof typeof productPageOrganismStories;

const gallery = "organisms/product-gallery" as const;
const info = "organisms/product-info-accordions" as const;
const reviews = "organisms/reviews-section" as const;
const guide = "organisms/size-guide-dialog" as const;

const story = (id: Id) => productPageOrganismStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
const live = (id: Id, locale: Locale) =>
  renderToStaticMarkup(story(id).live(createContext(locale)));
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)].length;
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const page = (locale: Locale) => commerceFixtures[locale].productPage;
const organisms = (locale: Locale) => catalogs[locale].organisms;
/** Intl and the catalogs may write a no-break space or a word joiner. */
const plain = (text: string) => text.replace(/[\s⁠]+/g, " ");
/** What React writes for a text node, so a French apostrophe can be looked up in the markup. */
const escaped = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");

/** The element of this type that a story's node holds, however deep: the components are the props' owners. */
function find<Props>(node: ReactNode, type: unknown): ReactElement<Props> | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === type) return node as ReactElement<Props>;
  for (const child of Children.toArray(node.props.children)) {
    const found = find<Props>(child, type);
    if (found !== undefined) return found;
  }
  return undefined;
}
function propsOf<Props>(node: ReactNode, type: unknown): Props {
  const found = find<Props>(node, type);
  if (found === undefined) throw new Error("the story does not draw the component");
  return found.props;
}

const nodeOf = (id: Id, stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  return stateId === undefined ? story(id).live(ctx) : state(id, stateId).render(ctx);
};
const galleryProps = (stateId: string | undefined, locale: Locale) =>
  propsOf<ComponentProps<typeof ProductGallery>>(nodeOf(gallery, stateId, locale), ProductGallery);
const infoProps = (stateId: string | undefined, locale: Locale) =>
  propsOf<ComponentProps<typeof ProductInfoAccordions>>(
    nodeOf(info, stateId, locale),
    ProductInfoAccordions,
  );
const reviewsProps = (stateId: string | undefined, locale: Locale) =>
  propsOf<ComponentProps<typeof ReviewsSection>>(nodeOf(reviews, stateId, locale), ReviewsSection);
const guideProps = (stateId: string | undefined, locale: Locale) =>
  propsOf<ComponentProps<typeof SizeGuideDialog>>(nodeOf(guide, stateId, locale), SizeGuideDialog);
/** The overlay box a state draws, and what is in it. */
const boxOf = (id: Id, stateId: string, locale: Locale) =>
  find<ComponentProps<typeof OverlayBox>>(nodeOf(id, stateId, locale), OverlayBox);

const galleryStateIds = [
  "thumbnails-side",
  "many-pictures",
  "thumbnails-below",
  "colour-chosen",
  "single",
  "no-zoom",
  "zoom-open",
  "long-labels",
];
const infoStateIds = ["first-open", "all-open", "all-closed", "long-title"];
const reviewsStateIds = [
  "first-page",
  "later-page",
  "last-page",
  "none",
  "no-write-link",
  "long-review",
];
const guideStateIds = ["button", "open-cm", "open-in", "open-long"];
const guideOpenIds = guideStateIds.filter((stateId) => stateId !== "button");

describe("the product-page organisms' stories", () => {
  it("are one for each of the four entries, each with a summary and a11y notes", () => {
    expect(Object.keys(productPageOrganismStories).sort()).toEqual(
      [gallery, info, reviews, guide].sort(),
    );
    for (const [id, each] of Object.entries(productPageOrganismStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.summary.trim().endsWith("."), id).toBe(true);
      expect(each.a11y.length, id).toBeGreaterThan(0);
      for (const note of each.a11y) {
        expect(note.trim().endsWith("."), `${id}: ${note.slice(0, 30)}`).toBe(true);
        // Full sentences: more than a label's worth of words.
        expect(note.trim().split(/\s+/).length, `${id}: ${note.slice(0, 30)}`).toBeGreaterThan(8);
      }
    }
  });

  it("have the states the task lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(gallery)).toEqual(galleryStateIds);
    expect(ids(info)).toEqual(infoStateIds);
    expect(ids(reviews)).toEqual(reviewsStateIds);
    expect(ids(guide)).toEqual(guideStateIds);
  });

  it("give each state a distinct id, a label and a description", () => {
    for (const [id, each] of Object.entries(productPageOrganismStories)) {
      const ids = (each.states ?? []).map((part) => part.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      const labels = (each.states ?? []).map((part) => part.label);
      expect(new Set(labels).size, id).toBe(labels.length);
      for (const part of each.states ?? []) {
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
        expect(part.description?.trim() ?? "", `${id} ${part.id}`).not.toBe("");
        expect(part.description?.trim().endsWith("."), `${id} ${part.id}`).toBe(true);
      }
    }
  });

  it("keep every state's label free of the characters an ICU message reads as syntax", () => {
    // The gallery's label is an ICU message with the state's label added to it.
    for (const [id, each] of Object.entries(productPageOrganismStories)) {
      for (const part of each.states ?? []) {
        expect(part.label, `${id} ${part.id}`).not.toMatch(/['{}#]/);
      }
    }
  });

  it("lay the states out one under another: a column of a product page is not a card", () => {
    for (const each of Object.values(productPageOrganismStories)) {
      expect(each.statesLayout).toBe("stack");
    }
  });

  it("use no em dash anywhere in their words", () => {
    for (const [id, each] of Object.entries(productPageOrganismStories)) {
      const words = [
        each.summary,
        ...each.a11y,
        ...(each.states ?? []).flatMap((part) => [part.label, part.description ?? ""]),
      ];
      for (const text of words) expect(text, id).not.toContain(EM_DASH);
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(productPageOrganismStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(300);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(300);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
        expect(markup, `${id} ${part.id}`).not.toContain(EM_DASH);
      }
    }
  });

  it("tell every link not to prefetch, in the live renders and every state", () => {
    for (const locale of LOCALES) {
      const every = [
        infoProps(undefined, locale),
        ...infoStateIds.map((stateId) => infoProps(stateId, locale)),
        reviewsProps(undefined, locale),
        ...reviewsStateIds.map((stateId) => reviewsProps(stateId, locale)),
      ];
      for (const props of every) expect(props.prefetch).toBe(false);
    }
  });

  it("give the components props that serialize, but for the reviews' `hrefFor` (a story renders on the server)", () => {
    for (const locale of LOCALES) {
      const every = [
        galleryProps(undefined, locale),
        ...galleryStateIds.map((stateId) => galleryProps(stateId, locale)),
        infoProps(undefined, locale),
        ...infoStateIds.map((stateId) => infoProps(stateId, locale)),
        guideProps(undefined, locale),
        ...guideStateIds.map((stateId) => guideProps(stateId, locale)),
      ];
      for (const props of every) {
        expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
        expect(JSON.parse(JSON.stringify(props))).toEqual(props);
      }
      // The server component takes its contract's one function and nothing else.
      for (const props of [
        reviewsProps(undefined, locale),
        ...reviewsStateIds.map((stateId) => reviewsProps(stateId, locale)),
      ]) {
        const { hrefFor, ...data } = props;
        expect(typeof hrefFor).toBe("function");
        expect(Object.values(data).filter((value) => typeof value === "function")).toEqual([]);
        expect(JSON.parse(JSON.stringify(data))).toEqual(data);
      }
    }
  });

  it("draw every drawn-open state in an overlay box, with the page behind it usable", () => {
    for (const locale of LOCALES) {
      const open: { id: Id; stateId: string; props: object }[] = [
        { id: gallery, stateId: "zoom-open", props: galleryProps("zoom-open", locale) },
        ...guideOpenIds.map((stateId) => ({
          id: guide,
          stateId,
          props: guideProps(stateId, locale),
        })),
      ];
      for (const { id, stateId, props } of open) {
        expect(boxOf(id, stateId, locale), `${id} ${stateId}`).toBeDefined();
        expect("modal" in props ? props.modal : undefined, `${id} ${stateId}`).toBe(false);
      }
    }
  });
});

describe("ProductGallery's stories", () => {
  it("say what the notes of the task ask: the carousel, the status, no autoplay, thumbnails, colour, zoom", () => {
    const notes = story(gallery).a11y.join("\n");
    expect(notes).toContain(`“${organisms("en").productGallery.label.replace(" {title}", "")}”`);
    expect(notes).toMatch(/“carousel”/);
    expect(notes).toMatch(/“Image 2 of 4”/);
    expect(notes).toMatch(/polite status/i);
    expect(notes).toMatch(/aria-disabled but stays focusable/i);
    expect(notes).toMatch(/never moves on its own/i);
    expect(notes).toMatch(/2\.2\.2/);
    expect(notes).toMatch(/reduced motion/i);
    expect(notes).toMatch(/aria-current/);
    expect(notes).toContain(`“${organisms("en").productGallery.zoom}”`);
    expect(notes).toMatch(/Escape/);
    expect(notes).toMatch(/44 px/);
  });

  describe("the live render", () => {
    it.each(LOCALES)(
      "is the fixture's four pictures with the enlarge button, in a product page's column, in %s",
      (locale) => {
        const props = galleryProps(undefined, locale);
        expect(props.title).toBe(page(locale).gallery.all.title);
        expect(props.media).toEqual(page(locale).gallery.all.media);
        expect(props.media).toHaveLength(4);
        expect(props.selectedValueIds).toEqual([]);
        expect(props.locale).toBe(htmlLang(locale));
        expect(props.copy).toEqual(organisms(locale).productGallery);
        expect(props.zoom).toBeUndefined();
        expect(props.defaultZoomOpen).toBeUndefined();
        expect(props.priority).toBeUndefined();
        expect(props.modal).toBeUndefined();
      },
    );

    it.each(LOCALES)(
      "draws one carousel named by the catalog and the zoom button, closed, in %s",
      (locale) => {
        const markup = live(gallery, locale);
        expect(count(markup, /role="region"/g)).toBe(1);
        expect(markup).toContain(
          `aria-roledescription="${organisms(locale).productGallery.carousel}"`,
        );
        expect(count(markup, /data-slot="carousel-item"/g)).toBe(4);
        expect(count(markup, /data-slot="product-gallery-thumbnail"/g)).toBe(4);
        expect(markup).toContain('data-slot="product-gallery-zoom-trigger"');
        expect(markup).toContain('aria-expanded="false"');
        expect(markup).not.toContain('data-slot="product-gallery-zoom"');
      },
    );

    it("does not preload a picture: a design-system page holds several galleries", () => {
      for (const locale of LOCALES) {
        expect(galleryProps(undefined, locale).priority).toBeFalsy();
        for (const stateId of galleryStateIds) {
          expect(galleryProps(stateId, locale).priority, stateId).toBeFalsy();
        }
      }
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("draw the thumbnails beside the picture by default, in %s", (locale) => {
      const props = galleryProps("thumbnails-side", locale);
      expect(props.thumbnails).toBeUndefined();
      expect(props.media).toEqual(page(locale).gallery.all.media);
      const markup = html(gallery, "thumbnails-side", locale);
      expect(markup).toContain('data-layout="side"');
      expect(markup).toContain("md:grid-cols-[4.5rem_minmax(0,1fr)]");
    });

    it.each(LOCALES)(
      "draw twelve pictures, each with a name of its own, in a column that scrolls, in %s",
      (locale) => {
        const props = galleryProps("many-pictures", locale);
        const fixture = page(locale).gallery.all.media;
        expect(props.media).toHaveLength(fixture.length * 3);
        expect(props.thumbnails).toBeUndefined();
        expect(new Set(props.media.map((item) => item.alt)).size).toBe(props.media.length);
        for (const [index, item] of props.media.entries()) {
          expect(item.src).toBe(fixture[index % fixture.length]?.src);
          expect(item.alt.endsWith(`(${index + 1})`)).toBe(true);
        }
        const markup = html(gallery, "many-pictures", locale);
        expect(count(markup, /data-slot="product-gallery-thumbnail"/g)).toBe(props.media.length);
        expect(markup).toContain('data-layout="side"');
      },
    );

    it.each(LOCALES)("draw the thumbnails below the picture, in %s", (locale) => {
      expect(galleryProps("thumbnails-below", locale).thumbnails).toBe("below");
      const markup = html(gallery, "thumbnails-below", locale);
      expect(markup).toContain('data-layout="below"');
      expect(markup).not.toContain("md:grid-cols-[4.5rem_minmax(0,1fr)]");
    });

    it.each(LOCALES)(
      "start on the colour chosen, in the markup the server sends, in %s",
      (locale) => {
        const props = galleryProps("colour-chosen", locale);
        expect(props.selectedValueIds).toEqual(page(locale).gallery.chosen.selectedValueIds);
        expect(props.selectedValueIds.length).toBeGreaterThan(0);
        const markup = html(gallery, "colour-chosen", locale);
        expect(markup).toContain("translate3d(-300%, 0, 0)");
        expect(markup).toContain('aria-current="true"');
        expect(plain(markup)).toContain(
          plain(
            organisms(locale)
              .productGallery.position.replace("{index, number}", "4")
              .replace("{count, number}", "4"),
          ),
        );
      },
    );

    it.each(LOCALES)(
      "draw one picture with no buttons, position or thumbnails, in %s",
      (locale) => {
        expect(galleryProps("single", locale).media).toHaveLength(1);
        const markup = html(gallery, "single", locale);
        expect(markup).not.toContain('data-slot="carousel-previous"');
        expect(markup).not.toContain('data-slot="carousel-next"');
        expect(markup).not.toContain("product-gallery-position");
        expect(markup).not.toContain("product-gallery-thumbnails");
        expect(markup).toContain('data-slot="product-gallery-zoom-trigger"');
      },
    );

    it.each(LOCALES)(
      "draw the gallery with no enlarge button and thumbnails below, in %s",
      (locale) => {
        const props = galleryProps("no-zoom", locale);
        expect(props.zoom).toBe(false);
        expect(props.thumbnails).toBe("below");
        expect(html(gallery, "no-zoom", locale)).not.toContain("product-gallery-zoom");
      },
    );

    it.each(LOCALES)(
      "draw the enlarge dialog open in a box, taking no focus, over a usable page, in %s",
      (locale) => {
        const box = boxOf(gallery, "zoom-open", locale);
        expect(box?.props.name).toBe("Enlarged picture");
        expect(box?.props.height).toBeGreaterThanOrEqual(600);
        const props = galleryProps("zoom-open", locale);
        expect(props.defaultZoomOpen).toBe(true);
        expect(props.modal).toBe(false);
        expect(props.zoom).toBeUndefined();
        // The popup is capped to its box and still: the window's height means nothing in a box.
        expect(props.zoomPopupClassName).toContain("h-[calc(100%-2rem)]");
        expect(props.zoomPopupClassName).toContain("max-h-[calc(100%-2rem)]");
        expect(props.zoomPopupClassName).toContain("duration-0");
        expect(props.zoomPopupClassName).not.toMatch(/dvh|vh\b/);
        // Only this state is open.
        for (const stateId of galleryStateIds.filter((each) => each !== "zoom-open")) {
          expect(galleryProps(stateId, locale).defaultZoomOpen, stateId).toBeUndefined();
        }
      },
    );

    it.each(LOCALES)(
      "lead with the longest name and picture description the copy allows, in %s",
      (locale) => {
        const long = createContext(locale).fixture.long;
        const props = galleryProps("long-labels", locale);
        expect(props.title).toBe(long.productName);
        expect(props.media).toHaveLength(4);
        for (const item of props.media) expect(item.alt).toBe(long.imageAlt);
        // The pictures and their sizes are the fixture's.
        expect(props.media.map((item) => item.src)).toEqual(
          page(locale).gallery.all.media.map((item) => item.src),
        );
      },
    );
  });

  describe("the landmarks", () => {
    it.each(LOCALES)("name each carousel apart: the state's label in brackets, in %s", (locale) => {
      const label = (stateId: string | undefined) => galleryProps(stateId, locale).copy.label;
      const names = [undefined, ...galleryStateIds].map(label);
      expect(new Set(names).size).toBe(names.length);
      expect(names[0]).toBe(organisms(locale).productGallery.label);
      for (const [index, stateId] of galleryStateIds.entries()) {
        expect(names[index + 1], stateId).toBe(
          `${organisms(locale).productGallery.label} (${state(gallery, stateId).label})`,
        );
      }
    });

    it("write the region's name with the product's name, once for each state", () => {
      for (const stateId of galleryStateIds.filter((each) => each !== "zoom-open")) {
        const markup = html(gallery, stateId, "en");
        expect(markup, stateId).toContain(
          `aria-label="Images of ${galleryProps(stateId, "en").title} (${state(gallery, stateId).label})"`,
        );
      }
    });
  });
});

describe("ProductInfoAccordions' stories", () => {
  it("say what the notes of the task ask: region, headings, why accordions, keepMounted, 44 px, keyboard", () => {
    const notes = story(info).a11y.join("\n");
    expect(notes).toContain(`“${organisms("en").productInfoAccordions.label}”`);
    expect(notes).toMatch(/inside a heading/i);
    expect(notes).toMatch(/tabs would show one section/i);
    expect(notes).toMatch(/find-in-page/i);
    expect(notes).toMatch(/several sections can be open at once/i);
    expect(notes).toMatch(/hidden=until-found/);
    expect(notes).toMatch(/44 px/);
    expect(notes).toMatch(/Enter or Space/);
  });

  describe("the live render", () => {
    it.each(LOCALES)("is the fixture's four sections, under the section's h2, in %s", (locale) => {
      const props = infoProps(undefined, locale);
      expect(props.sections).toEqual(page(locale).info.sections);
      expect(props.sections).toHaveLength(4);
      expect(props.headingLevel).toBe(3);
      expect(props.defaultOpen).toBeUndefined();
      expect(props.copy).toEqual(organisms(locale).productInfoAccordions);
      expect(props.locale).toBe(htmlLang(locale));
    });

    it.each(LOCALES)("draws the first section open and the rest shut, in %s", (locale) => {
      const markup = live(info, locale);
      expect(count(markup, /aria-expanded="true"/g)).toBe(1);
      expect(count(markup, /aria-expanded="false"/g)).toBe(3);
      expect(count(markup, /<h3/g)).toBe(4);
      for (const section of page(locale).info.sections) expect(markup).toContain(section.title);
    });
  });

  describe("the states", () => {
    it("sit under their own label: the sections' headings are h4", () => {
      for (const stateId of infoStateIds) {
        expect(infoProps(stateId, "en").headingLevel, stateId).toBe(4);
      }
      expect(html(info, "first-open", "en")).toContain("<h4");
      expect(html(info, "first-open", "en")).not.toContain("<h3");
    });

    it.each(LOCALES)("open the sections each state is named for, in %s", (locale) => {
      const ids = page(locale).info.sections.map((section) => section.id);
      expect(infoProps("first-open", locale).defaultOpen).toBeUndefined();
      expect(infoProps("all-open", locale).defaultOpen).toEqual(ids);
      expect(infoProps("all-closed", locale).defaultOpen).toEqual([]);
      expect(infoProps("long-title", locale).defaultOpen).toEqual(["long"]);
      const opened = (stateId: string) =>
        count(html(info, stateId, locale), /aria-expanded="true"/g);
      expect(opened("first-open")).toBe(1);
      expect(opened("all-open")).toBe(4);
      expect(opened("all-closed")).toBe(0);
      expect(opened("long-title")).toBe(1);
    });

    it.each(LOCALES)("draw every kind of block when every section is open, in %s", (locale) => {
      const markup = html(info, "all-open", locale);
      expect(markup).toContain('data-slot="product-info-text"');
      expect(markup).toContain('data-slot="product-info-facts"');
      expect(markup).toContain('data-slot="product-info-list"');
      expect(markup).toContain('data-slot="product-info-link"');
    });

    it.each(LOCALES)("keep the text of a shut section in the page, in %s", (locale) => {
      const markup = html(info, "all-closed", locale);
      const delivery = page(locale).info.sections.find((section) => section.id === "delivery");
      const block = delivery?.blocks[0];
      if (block?.kind !== "text") throw new Error("delivery is text");
      expect(markup).toContain(block.paragraphs[0]);
    });

    it.each(LOCALES)(
      "lead with a section whose title and words are the longest the copy allows, in %s",
      (locale) => {
        const long = createContext(locale).fixture.long;
        const props = infoProps("long-title", locale);
        expect(props.sections).toHaveLength(4);
        expect(props.sections[0]?.title).toBe(long.productName);
        expect(props.sections.slice(1)).toEqual(page(locale).info.sections.slice(1));
        const markup = html(info, "long-title", locale);
        for (const text of [long.productName, long.productDescription, long.linkLabel]) {
          expect(markup).toContain(escaped(text));
        }
        expect(markup).toContain(`href="${commerceFixtures[locale].prefix}/returns"`);
      },
    );
  });

  describe("the landmarks", () => {
    it.each(LOCALES)("name each region apart: the state's label in brackets, in %s", (locale) => {
      const names = [undefined, ...infoStateIds].map(
        (stateId) => infoProps(stateId, locale).copy.label,
      );
      expect(new Set(names).size).toBe(names.length);
      expect(names[0]).toBe(organisms(locale).productInfoAccordions.label);
      for (const [index, stateId] of infoStateIds.entries()) {
        expect(names[index + 1], stateId).toBe(
          `${organisms(locale).productInfoAccordions.label} (${state(info, stateId).label})`,
        );
      }
    });
  });
});

describe("ReviewsSection's stories", () => {
  it("say what the notes of the task ask: region, order, text as well as bars, list, pager, none, wrapping", () => {
    const notes = story(reviews).a11y.join("\n");
    expect(notes).toMatch(/region named by its own heading/i);
    expect(notes).toMatch(/1024 px/);
    expect(notes).toMatch(/“5 stars, 94 reviews”/);
    expect(notes).toMatch(/1\.4\.1/);
    expect(notes).toContain(`“${organisms("en").reviewsSection.list}”`);
    expect(notes).toMatch(/“Showing 1 to 6 of 128 reviews”/);
    expect(notes).toMatch(/plain links/i);
    expect(notes).toMatch(/no row of empty stars/i);
    expect(notes).toMatch(/44 px/);
  });

  describe("the live render", () => {
    it.each(LOCALES)(
      "is the fixture's first page of 128 reviews, under the section's h2, in %s",
      (locale) => {
        const props = reviewsProps(undefined, locale);
        const first = page(locale).reviews.first;
        expect(props.summary).toEqual(first.summary);
        expect(props.reviews).toEqual(first.reviews);
        expect(props.reviews).toHaveLength(6);
        expect(props.page).toEqual({ page: 1, pageCount: 22 });
        expect(props.writeHref).toBe(first.writeHref);
        expect(props.headingLevel).toBe(3);
        // The id is the default, "reviews": the buy box's rating links to it.
        expect(props.id).toBeUndefined();
        expect(props.copy.reviewsSection).toEqual(organisms(locale).reviewsSection);
        expect(props.copy.pagination).toEqual(catalogs[locale].molecules.pagination);
        expect(props.locale).toBe(htmlLang(locale));
      },
    );

    it.each(LOCALES)(
      "draws the section, the ratings, six reviews and the pager, in %s",
      (locale) => {
        const markup = live(reviews, locale);
        expect(markup).toContain(`<section id="reviews"`);
        expect(markup).toContain(`aria-labelledby="reviews-title"`);
        expect(count(markup, /<article[^>]*data-slot="review-item"/g)).toBe(6);
        expect(markup).toContain('data-slot="rating-summary"');
        expect(markup).toContain('data-slot="reviews-section-write"');
        expect(markup).toContain('data-slot="reviews-section-showing"');
        expect(markup).toContain(`aria-label="${catalogs[locale].molecules.pagination.label}"`);
        expect(count(markup, /<h3/g)).toBe(1);
        expect(count(markup, /<h4/g)).toBe(6);
      },
    );
  });

  describe("the states", () => {
    it("sit under their own label: the section's heading is h4 and the reviews' h5", () => {
      for (const stateId of reviewsStateIds) {
        expect(reviewsProps(stateId, "en").headingLevel, stateId).toBe(4);
      }
      const markup = html(reviews, "first-page", "en");
      expect(markup).toContain("<h4");
      expect(count(markup, /<h5/g)).toBe(6);
    });

    it("give each state its own id, so that no two sections of the page share one", () => {
      for (const locale of LOCALES) {
        const ids = reviewsStateIds.map((stateId) => reviewsProps(stateId, locale).id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const [index, stateId] of reviewsStateIds.entries()) {
          expect(ids[index], stateId).toBe(`reviews-${stateId}`);
        }
        // And none of them is the live render's, which the buy box's rating links to.
        expect(ids).not.toContain(reviewsProps(undefined, locale).id ?? "reviews");
      }
    });

    it.each(LOCALES)(
      "name each section and pager apart: the state's label in brackets, in %s",
      (locale) => {
        const titles = [undefined, ...reviewsStateIds].map(
          (stateId) => reviewsProps(stateId, locale).copy.reviewsSection.title,
        );
        const pagers = [undefined, ...reviewsStateIds].map(
          (stateId) => reviewsProps(stateId, locale).copy.pagination.label,
        );
        expect(new Set(titles).size).toBe(titles.length);
        expect(new Set(pagers).size).toBe(pagers.length);
        for (const [index, stateId] of reviewsStateIds.entries()) {
          const label = state(reviews, stateId).label;
          expect(titles[index + 1], stateId).toBe(
            `${organisms(locale).reviewsSection.title} (${label})`,
          );
          expect(pagers[index + 1], stateId).toBe(
            `${catalogs[locale].molecules.pagination.label} (${label})`,
          );
        }
      },
    );

    it("say which reviews the page holds, from the page and the count", () => {
      expect(plain(html(reviews, "first-page", "en"))).toContain("Showing 1 to 6 of 128 reviews");
      expect(plain(html(reviews, "later-page", "en"))).toContain("Showing 43 to 48 of 128 reviews");
      expect(plain(html(reviews, "last-page", "en"))).toContain(
        "Showing 127 to 128 of 128 reviews",
      );
      expect(reviewsProps("later-page", "en").page).toEqual({ page: 8, pageCount: 22 });
      expect(reviewsProps("last-page", "en").page).toEqual({ page: 22, pageCount: 22 });
      expect(reviewsProps("last-page", "en").reviews).toHaveLength(2);
    });

    it.each(LOCALES)("draw the later and the last page with their pagers, in %s", (locale) => {
      const later = html(reviews, "later-page", locale);
      expect(later).toContain('aria-current="page"');
      expect(later).toContain(`?page=7#reviews`);
      expect(later).toContain(`?page=9#reviews`);
      const last = html(reviews, "last-page", locale);
      expect(last).toContain(`?page=21#reviews`);
      expect(last).not.toContain(`?page=23#reviews`);
    });

    it.each(LOCALES)(
      "draw no stars, no list and no pager when there are no reviews, in %s",
      (locale) => {
        const props = reviewsProps("none", locale);
        expect(props.summary.count).toBe(0);
        expect(props.reviews).toEqual([]);
        const markup = html(reviews, "none", locale);
        expect(markup).toContain('data-slot="reviews-section-empty"');
        expect(markup).toContain(organisms(locale).reviewsSection.empty);
        expect(markup).toContain(organisms(locale).reviewsSection.emptyHint);
        expect(markup).toContain('data-slot="reviews-section-write"');
        expect(markup).not.toContain("rating-summary");
        expect(markup).not.toContain("<ul");
        expect(markup).not.toContain("<nav");
        expect(markup).not.toContain("reviews-section-showing");
      },
    );

    it.each(LOCALES)(
      "draw no write link when the page has nowhere to send a reviewer, in %s",
      (locale) => {
        expect(reviewsProps("no-write-link", locale).writeHref).toBeUndefined();
        const markup = html(reviews, "no-write-link", locale);
        expect(markup).not.toContain("reviews-section-write");
        expect(markup).toContain('data-slot="rating-summary"');
      },
    );

    it.each(LOCALES)("lead with the longest review the copy allows, in %s", (locale) => {
      const long = commerceFixtures[locale].long.review;
      const props = reviewsProps("long-review", locale);
      expect(props.reviews[0]).toEqual(long);
      expect(props.reviews).toHaveLength(6);
      expect(props.reviews.slice(1)).toEqual(page(locale).reviews.first.reviews.slice(1));
      expect(html(reviews, "long-review", locale)).toContain(long.author);
    });
  });

  describe("the pager's addresses", () => {
    it.each(LOCALES)(
      "are the market's product page, the page number and the section's anchor, in %s",
      (locale) => {
        const { hrefFor } = reviewsProps(undefined, locale);
        const product = commerceFixtures[locale].product;
        expect(hrefFor(1)).toBe(
          `${commerceFixtures[locale].prefix}/products/${product.handle}?page=1#reviews`,
        );
        expect(hrefFor(7)).toBe(
          `${commerceFixtures[locale].prefix}/products/${product.handle}?page=7#reviews`,
        );
      },
    );
  });
});

describe("SizeGuideDialog's stories", () => {
  it("say what the notes of the task ask: the button, the dialog, the table, the units, the numbers, the box", () => {
    const notes = story(guide).a11y.join("\n");
    expect(notes).toContain(`“${organisms("en").sizeGuideDialog.open}”`);
    expect(notes).toMatch(/Shift\+Tab stay inside/);
    expect(notes).toMatch(/row headers/i);
    expect(notes).toMatch(/scope/);
    expect(notes).toContain(`“${organisms("en").sizeGuideDialog.captionIn}”`);
    expect(notes).toContain(`“${organisms("en").sizeGuideDialog.units}”`);
    expect(notes).toMatch(/2\.5\.3/);
    expect(notes).toMatch(/pressing the chosen one again does nothing/i);
    expect(notes).toMatch(/2\.54/);
    expect(notes).toMatch(/31,5/);
    expect(notes).toMatch(/scrollable-region-focusable/);
    expect(notes).toMatch(/44 px/);
    expect(notes).toMatch(/reduced motion/i);
  });

  describe("the live render", () => {
    it.each(LOCALES)("is the closed button with the fixture's guide, in %s", (locale) => {
      const props = guideProps(undefined, locale);
      const fixture = page(locale).sizeGuide;
      expect(props.title).toBe(fixture.title);
      expect(props.sizes).toEqual(fixture.sizes);
      expect(props.rows).toEqual(fixture.rows);
      expect(props.unit).toBe(fixture.unit);
      expect(props.note).toBe(fixture.note);
      expect(props.copy).toEqual(organisms(locale).sizeGuideDialog);
      expect(props.locale).toBe(htmlLang(locale));
      expect(props.defaultOpen).toBeUndefined();
      expect(props.modal).toBeUndefined();
    });

    it.each(LOCALES)("draws the button and nothing else on the server, in %s", (locale) => {
      const markup = live(guide, locale);
      expect(markup).toContain('data-slot="size-guide-trigger"');
      expect(markup).toContain(organisms(locale).sizeGuideDialog.open);
      expect(markup).not.toContain("<table");
      expect(markup).not.toContain('role="dialog"');
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("draw the button alone, closed, in %s", (locale) => {
      const props = guideProps("button", locale);
      expect(props.defaultOpen).toBeUndefined();
      expect(html(guide, "button", locale)).toContain('data-slot="size-guide-trigger"');
      expect(boxOf(guide, "button", locale)).toBeUndefined();
    });

    it.each(LOCALES)(
      "draw the dialog open in a box in the unit the state is named for, in %s",
      (locale) => {
        for (const [stateId, unit] of [
          ["open-cm", "cm"],
          ["open-in", "in"],
        ] as const) {
          const props = guideProps(stateId, locale);
          expect(props.unit, stateId).toBe(unit);
          expect(props.defaultOpen, stateId).toBe(true);
          expect(props.modal, stateId).toBe(false);
          expect(props.sizes, stateId).toEqual(page(locale).sizeGuide.sizes);
          expect(props.rows, stateId).toEqual(page(locale).sizeGuide.rows);
          expect(boxOf(guide, stateId, locale)?.props.height, stateId).toBeGreaterThanOrEqual(700);
        }
      },
    );

    it("cap each popup to its box and keep it still: the window's height means nothing in a box", () => {
      for (const locale of LOCALES) {
        for (const stateId of guideOpenIds) {
          const className = guideProps(stateId, locale).popupClassName ?? "";
          expect(className, stateId).toContain("max-h-[calc(100%-2rem)]");
          expect(className, stateId).toContain("duration-0");
          expect(className, stateId).not.toMatch(/dvh|vh\b/);
        }
      }
    });

    it.each(LOCALES)(
      "lead with labels as long as the locale writes them, in centimetres, in %s",
      (locale) => {
        const long = createContext(locale).fixture.long;
        const props = guideProps("open-long", locale);
        expect(props.unit).toBe("cm");
        expect(props.title).toBe(long.productName);
        expect(props.note).toBe(long.helpText);
        expect(props.rows.map((row) => row.label)).toEqual([
          long.fieldLabel,
          long.optionLabel,
          long.chipLabel,
          long.badge,
        ]);
        // The measurements are the fixture's.
        expect(props.rows.map((row) => row.cm)).toEqual(
          page(locale).sizeGuide.rows.map((row) => row.cm),
        );
      },
    );

    it("open only the states that are named for it", () => {
      for (const locale of LOCALES) {
        for (const stateId of guideOpenIds) {
          expect(guideProps(stateId, locale).defaultOpen, stateId).toBe(true);
        }
        expect(guideProps(undefined, locale).defaultOpen).toBeUndefined();
        expect(guideProps("button", locale).defaultOpen).toBeUndefined();
      }
    });
  });

  describe("the landmarks", () => {
    it.each(LOCALES)("name each dialog apart: the state's label in brackets, in %s", (locale) => {
      const titles = [undefined, ...guideStateIds].map(
        (stateId) => guideProps(stateId, locale).copy.title,
      );
      expect(new Set(titles).size).toBe(titles.length);
      expect(titles[0]).toBe(organisms(locale).sizeGuideDialog.title);
      for (const [index, stateId] of guideStateIds.entries()) {
        expect(titles[index + 1], stateId).toBe(
          `${organisms(locale).sizeGuideDialog.title} (${state(guide, stateId).label})`,
        );
      }
    });
  });
});
