// @vitest-environment happy-dom
// Ours (T38, SETUP.md "Product-page organisms (T38)"). The stories of ProductGallery,
// ProductInfoAccordions, ReviewsSection and SizeGuideDialog, rendered the way the design-system
// page renders them: in a browser DOM (happy-dom, driven with react-dom and `act`, as
// `organisms-search-filters.dom.test.tsx` does). `organisms-product-page.test.tsx` reads what each
// story gives the component; this file checks what comes out: that the drawn-open dialogs really
// are open, each in its own box (a portal that `renderToStaticMarkup` does not draw), that each
// state's landmarks are named apart, that the answers the fixtures hold are on screen, and that a
// page with the live render and every state has no id twice (axe's `duplicate-id-aria`, and a
// label that points at another state's box). Pixels (the sizes, the clipping, the scrolling boxes)
// and axe are the design-system job's browser check, not this one; the sizes of the boxes were
// measured in headless Chromium (the report of T38).
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createContext } from "../context";
import { productPageOrganismStories } from "./organisms-product-page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Id = keyof typeof productPageOrganismStories;

/** Stands in for IntersectionObserver: embla asks it which slides are in view, and happy-dom never answers. */
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const roots: { root: Root; container: HTMLElement }[] = [];
/** What a page logs: the design-system job fails on a console error or warning (D34), so a story must log none. */
const logged: string[] = [];

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", Observer);
  logged.length = 0;
  for (const kind of ["error", "warn"] as const) {
    vi.spyOn(console, kind).mockImplementation((...args: unknown[]) => {
      const text = args.map(String).join(" ");
      // next/image's development check of a `fill` picture reads its parent's computed style, and
      // this DOM has no stylesheet: the position is empty and the height is 0 for every picture.
      // The browser check (Chromium with the stylesheet) is where those two checks mean something.
      if (/has "fill" and (parent element with invalid "position"|a height value of 0)/.test(text))
        return;
      logged.push(`${kind}: ${text.slice(0, 300)}`);
    });
  }
});

/** Lets Base UI open a dialog: it waits for animation frames. */
const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });

/** Renders the live render and every state of an entry, as a page puts them one under another. */
async function mount(id: Id, locale: Locale) {
  const ctx = createContext(locale);
  const story = productPageOrganismStories[id];
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push({ root, container });
  await act(async () =>
    root.render(
      <div>
        <section data-live="">{story.live(ctx)}</section>
        {story.states.map((part) => (
          <section key={part.id} data-state={part.id}>
            {part.render(ctx)}
          </section>
        ))}
      </div>,
    ),
  );
  await settle();
  return container;
}

afterEach(async () => {
  for (const { root, container } of roots.splice(0)) {
    await act(async () => root.unmount());
    container.remove();
  }
  document.body.innerHTML = "";
  const messages = [...logged];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  expect(messages).toEqual([]);
});

const stateOf = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-state="${id}"]`) as HTMLElement;
const liveOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-live]") as HTMLElement;
const slot = (root: ParentNode, name: string) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const slots = (root: ParentNode, name: string) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const box = (root: ParentNode) =>
  root.querySelector<HTMLElement>("[data-overlay-box]") as HTMLElement;
/** The text of the element an `aria-labelledby` points at. */
const nameOf = (element: HTMLElement) =>
  (element.getAttribute("aria-labelledby") ?? "")
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();
const duplicateIds = (root: ParentNode) => {
  const seen = new Map<string, number>();
  for (const element of root.querySelectorAll("[id]")) {
    seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
  }
  return [...seen].filter(([, times]) => times > 1).map(([id]) => id);
};
/** The text with every kind of space as one plain space: Intl and the catalogs write no-break spaces. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s⁠]+/g, " ").trim();
const page = (locale: Locale) => commerceFixtures[locale].productPage;
const words = (locale: Locale) => catalogs[locale].organisms;
const stateIds = (id: Id) => productPageOrganismStories[id].states.map((part) => part.id);

describe("ProductGallery's stories, rendered", () => {
  it.each(LOCALES)(
    "draw the enlarged picture open in its own box, with the gallery behind it, in %s",
    async (locale) => {
      const container = await mount("organisms/product-gallery", locale);
      const section = stateOf(container, "zoom-open");
      const popup = slot(section, "product-gallery-zoom");
      expect(popup).not.toBeNull();
      // The portal's container is the state's box, so the popup is inside it.
      expect(box(section).contains(popup)).toBe(true);
      expect(popup?.getAttribute("role")).toBe("dialog");
      expect(popup?.getAttribute("aria-modal")).not.toBe("true");
      expect(plain(popup?.querySelector("[data-slot=dialog-title]")?.textContent)).toBe(
        plain(
          formatMessage(
            words(locale).productGallery.zoomTitle,
            { title: page(locale).gallery.all.title },
            createContext(locale).fixture.market.htmlLang,
          ),
        ),
      );
      // Drawn open takes no focus (D45), and its buttons are all there: close, previous, next.
      expect(popup?.contains(document.activeElement)).toBe(false);
      expect(slot(popup as HTMLElement, "product-gallery-zoom-close")).not.toBeNull();
      expect(slot(popup as HTMLElement, "product-gallery-zoom-previous")).not.toBeNull();
      expect(slot(popup as HTMLElement, "product-gallery-zoom-next")).not.toBeNull();
      // The dialog is the only one on the page, and the other states and the live render draw none.
      expect(slots(container, "product-gallery-zoom")).toHaveLength(1);
      for (const part of stateIds("organisms/product-gallery")) {
        if (part === "zoom-open") continue;
        expect(slot(stateOf(container, part), "product-gallery-zoom"), part).toBeNull();
      }
      expect(slot(liveOf(container), "product-gallery-zoom")).toBeNull();
      expect(duplicateIds(document)).toEqual([]);
    },
  );

  it.each(LOCALES)("name each state's carousel apart, in %s", async (locale) => {
    const container = await mount("organisms/product-gallery", locale);
    const names = [
      liveOf(container),
      ...stateIds("organisms/product-gallery").map((id) => stateOf(container, id)),
    ]
      .flatMap((section) => slots(section, "product-gallery-carousel"))
      .map((each) => each.getAttribute("aria-label") ?? "");
    // Seven states draw one carousel each, and so does the live render.
    expect(names.length).toBeGreaterThanOrEqual(stateIds("organisms/product-gallery").length);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(LOCALES)("draw the fixtures' pictures, in %s", async (locale) => {
    const container = await mount("organisms/product-gallery", locale);
    const { all, chosen, single } = page(locale).gallery;
    const slides = (id: string) => slots(stateOf(container, id), "carousel-item").length;
    expect(slides("thumbnails-side")).toBe(all.media.length);
    expect(slides("colour-chosen")).toBe(chosen.media.length);
    // A single picture is not a carousel: no slides, no buttons, no position and no thumbnails, and
    // still its enlarge button.
    const one = stateOf(container, "single");
    expect(slides("single")).toBe(0);
    expect(slots(one, "product-gallery-picture")).toHaveLength(single.media.length);
    expect(slot(one, "carousel-previous")).toBeNull();
    expect(slot(one, "carousel-next")).toBeNull();
    expect(slot(one, "product-gallery-position")).toBeNull();
    expect(slot(one, "product-gallery-thumbnails")).toBeNull();
    expect(slot(one, "product-gallery-zoom-trigger")).not.toBeNull();
    // The thumbnails: one button for each picture, the first marked as the current one.
    const thumbnails = slots(stateOf(container, "thumbnails-side"), "product-gallery-thumbnail");
    expect(thumbnails).toHaveLength(all.media.length);
    expect(thumbnails.map((each) => each.getAttribute("aria-current"))).toEqual(
      all.media.map((_, index) => (index === 0 ? "true" : null)),
    );
    // Twelve pictures give twelve thumbnails, and one of them is the current one.
    const many = slots(stateOf(container, "many-pictures"), "product-gallery-thumbnail");
    expect(many).toHaveLength(all.media.length * 3);
    expect(many.filter((each) => each.getAttribute("aria-current") === "true")).toHaveLength(1);
    // The last colour starts on the last picture, and the position under the picture says so.
    const position = slot(stateOf(container, "colour-chosen"), "product-gallery-position");
    expect(plain(position?.textContent)).toBe(
      plain(
        formatMessage(
          words(locale).productGallery.position,
          { index: chosen.media.length, count: chosen.media.length },
          createContext(locale).fixture.market.htmlLang,
        ),
      ),
    );
    // No enlarge button in the state that leaves it out.
    expect(slot(stateOf(container, "no-zoom"), "product-gallery-zoom-trigger")).toBeNull();
  });
});

describe("ProductInfoAccordions' stories, rendered", () => {
  it.each(LOCALES)(
    "open what each state says and keep every text in the page, in %s",
    async (locale) => {
      const container = await mount("organisms/product-info-accordions", locale);
      const sections = page(locale).info.sections;
      const open = (id: string) =>
        stateOf(container, id).querySelectorAll(
          '[data-slot="accordion-trigger"][aria-expanded="true"]',
        ).length;
      expect(open("first-open")).toBe(1);
      expect(open("all-open")).toBe(sections.length);
      expect(open("all-closed")).toBe(0);
      expect(open("long-title")).toBe(1);
      // A shut section's text is still in the page (keepMounted), hidden.
      const shut = stateOf(container, "all-closed");
      expect(slots(shut, "accordion-trigger")).toHaveLength(sections.length);
      expect(shut.textContent).toContain(sections[0]?.title);
      const delivery = sections.find((section) => section.id === "delivery")?.blocks[0];
      if (delivery?.kind !== "text") throw new Error("delivery is text");
      expect(plain(shut.textContent)).toContain(plain(delivery.paragraphs[0]));
      // Each state's region has its own name.
      const names = [
        liveOf(container),
        ...stateIds("organisms/product-info-accordions").map((id) => stateOf(container, id)),
      ].map(
        (section) => slot(section, "product-info-accordions")?.getAttribute("aria-label") ?? "",
      );
      expect(new Set(names).size).toBe(names.length);
      expect(duplicateIds(document)).toEqual([]);
    },
  );
});

describe("ReviewsSection's stories, rendered", () => {
  it.each(LOCALES)(
    "name each state's section apart and draw its reviews, in %s",
    async (locale) => {
      const container = await mount("organisms/reviews-section", locale);
      const { first, none } = page(locale).reviews;
      const sections = [
        liveOf(container),
        ...stateIds("organisms/reviews-section").map((id) => stateOf(container, id)),
      ];
      const names = sections.map((section) =>
        nameOf(slot(section, "reviews-section") as HTMLElement),
      );
      expect(names.every((name) => name !== "")).toBe(true);
      expect(new Set(names).size).toBe(names.length);
      const reviews = (id: string) => stateOf(container, id).querySelectorAll("article").length;
      expect(reviews("first-page")).toBe(first.reviews.length);
      expect(reviews("later-page")).toBe(first.reviews.length);
      expect(reviews("last-page")).toBe(2);
      expect(reviews("none")).toBe(0);
      expect(slot(stateOf(container, "none"), "reviews-section-empty")).not.toBeNull();
      expect(slot(stateOf(container, "none"), "reviews-section-write")).not.toBeNull();
      expect(slot(stateOf(container, "no-write-link"), "reviews-section-write")).toBeNull();
      // The line that says which reviews these are.
      const showing = (id: string) =>
        plain(slot(stateOf(container, id), "reviews-section-showing")?.textContent);
      expect(showing("first-page")).toContain("128");
      expect(showing("last-page")).toContain("127");
      expect(slot(stateOf(container, "none"), "reviews-section-showing")).toBeNull();
      expect(none.reviews).toHaveLength(0);
      expect(duplicateIds(document)).toEqual([]);
    },
  );
});

describe("SizeGuideDialog's stories, rendered", () => {
  it.each(LOCALES)("draw each open state in its own box, named apart, in %s", async (locale) => {
    const container = await mount("organisms/size-guide-dialog", locale);
    const names: string[] = [];
    for (const id of ["open-cm", "open-in", "open-long"]) {
      const section = stateOf(container, id);
      const popup = slot(section, "size-guide");
      expect(popup, id).not.toBeNull();
      expect(box(section).contains(popup), id).toBe(true);
      expect(popup?.getAttribute("role"), id).toBe("dialog");
      expect(popup?.getAttribute("aria-modal"), id).not.toBe("true");
      expect(popup?.contains(document.activeElement), id).toBe(false);
      names.push(nameOf(popup as HTMLElement) || (popup?.getAttribute("aria-label") ?? ""));
      // The box that scrolls sideways when it must is a focusable, named region.
      const table = slot(popup as HTMLElement, "table-container");
      expect(table?.getAttribute("role"), id).toBe("region");
      expect(table?.getAttribute("tabindex"), id).toBe("0");
      expect(nameOf(table as HTMLElement), id).not.toBe("");
    }
    expect(new Set(names).size).toBe(names.length);
    // The button alone, and the live render: a button and no popup.
    expect(slot(stateOf(container, "button"), "size-guide-trigger")).not.toBeNull();
    expect(slot(stateOf(container, "button"), "size-guide")).toBeNull();
    expect(slot(liveOf(container), "size-guide-trigger")).not.toBeNull();
    expect(slot(liveOf(container), "size-guide")).toBeNull();
    expect(duplicateIds(document)).toEqual([]);
  });

  it.each(LOCALES)("write the same table in centimetres and in inches, in %s", async (locale) => {
    const container = await mount("organisms/size-guide-dialog", locale);
    const guide = page(locale).sizeGuide;
    const chest = guide.rows[0];
    const first = (id: string) =>
      slot(stateOf(container, id), "table-container")?.querySelectorAll("tbody tr")[0] ?? null;
    const cm = plain(first("open-cm")?.textContent);
    const inches = plain(first("open-in")?.textContent);
    expect(first("open-cm")).not.toBeNull();
    // Six sizes in both, and the first row's chest as the contract's centimetres and as inches.
    expect(
      slot(stateOf(container, "open-cm"), "table-container")?.querySelectorAll("tbody tr"),
    ).toHaveLength(guide.sizes.length);
    const chestStart = chest?.cm[0];
    expect(cm).toContain(String(typeof chestStart === "object" ? chestStart.from : chestStart));
    expect(inches).not.toBe(cm);
    // Greek writes the decimal comma, the other three a point.
    expect(inches).toMatch(
      locale === "el" || locale === "de" || locale === "fr" ? /\d,\d/ : /\d\.\d/,
    );
    // One unit is pressed in each state: the one the state shows.
    const pressed = (id: string) =>
      slots(stateOf(container, id), "size-guide-units")
        .flatMap((group) => [...group.querySelectorAll('[aria-pressed="true"]')])
        .map((each) => each.getAttribute("data-slot"));
    expect(pressed("open-cm")).toEqual(["size-guide-unit-cm"]);
    expect(pressed("open-in")).toEqual(["size-guide-unit-in"]);
    expect(pressed("open-long")).toEqual(["size-guide-unit-cm"]);
  });
});
