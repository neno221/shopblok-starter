// Ours (T38, SETUP.md "Product-page organisms (T38)"). The tests of ProductGallery and its zoom
// dialog, in happy-dom with Testing Library: the carousel as a region of slides that say where they
// are, in the four catalogs; the buttons (44 px, off by `aria-disabled` at the ends so they keep
// focus), the position as a status; the thumbnails (named, current by `aria-current`, a click moves
// the carousel, hidden below `md`, beside or under the picture); the picture a chosen colour starts
// on, in the server's markup and in embla, and how a later change moves (a glide, or a jump under
// reduced motion); one picture; the zoom dialog (opening, the arrows, the position, closing by
// Escape and by the button, the focus going back, the carousel ending on the picture the dialog
// ended on, Tab kept inside); the dialog drawn open for the design system; right to left; a long
// German and Greek name; and the files' rules.
// - Embla measures with `offsetWidth`, `offsetLeft` and the rest, which happy-dom answers with 0, so
//   `layout()` gives the viewport 400 px and each slide 400 px: one picture to a page, four pages.
//   The motion is the real one: fake timers run embla's animation frames, so a glide and a jump
//   differ in the `transform` of the track one frame after the click.
// - `next/image` drops `sizes` for a data URI (the fixtures' pictures are data URIs), so the tests of
//   `sizes` and `priority` give the pictures a path.
// - Pixels are not measurable here: the layout at 375, 768 and 1440 px, the thumbnail column's
//   height, the zoom popup's fit in the window, axe and the 44 px rule in the browser are the design
//   system's own checks, which are the lead's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { ProductGallery as ProductGalleryContent } from "@shopblok/registry/contracts";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { ProductGallery, type ProductGalleryProps } from "./product-gallery";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);

const copyOf = (locale: Locale): ProductGalleryProps["copy"] =>
  catalogs[locale].organisms.productGallery;
const words = copyOf;
const sample = (locale: Locale, name: "all" | "chosen" | "single" = "all") =>
  commerceFixtures[locale].productPage.gallery[name];

function element(
  locale: Locale = "en",
  name: "all" | "chosen" | "single" = "all",
  props: Partial<ProductGalleryProps> = {},
) {
  return (
    <ProductGallery
      {...sample(locale, name)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}
const setup = (
  locale: Locale = "en",
  name: "all" | "chosen" | "single" = "all",
  props?: Partial<ProductGalleryProps>,
) => render(element(locale, name, props));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const all = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const tokens = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
/** Intl and Base UI may write a no-break space or a word joiner. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s⁠]+/g, " ").trim();

const placeOf = (locale: Locale, index: number, count = 4) =>
  formatMessage(words(locale).position, { index, count }, htmlLang[locale]);
const labelOf = (locale: Locale, title = sample(locale).title) =>
  formatMessage(words(locale).label, { title }, htmlLang[locale]);

const previousOf = (locale: Locale = "en") =>
  screen.getByRole("button", { name: words(locale).previous });
const nextOf = (locale: Locale = "en") => screen.getByRole("button", { name: words(locale).next });
/** A button that is off: `aria-disabled="true"` (Base UI writes "false" when it is on). */
const off = (button: HTMLElement) => button.getAttribute("aria-disabled") === "true";
const track = () => slot("carousel-content")?.firstElementChild as HTMLElement;
const slides = () => all("carousel-item");
const status = () => plain(slot("product-gallery-position")?.textContent);
const thumbnails = () => all("product-gallery-thumbnail");
const currentThumbnail = () =>
  thumbnails().findIndex((button) => button.getAttribute("aria-current") === "true");
const trigger = () => slot("product-gallery-zoom-trigger") as HTMLButtonElement;
const zoomDialog = () => slot("product-gallery-zoom");
const zoomStatus = () => plain(slot("product-gallery-zoom-position")?.textContent);
const zoomPicture = () => zoomDialog()?.querySelector("img") as HTMLImageElement;

/** The measures embla reads, as they were, so a test can put them back. */
const MEASURES = ["offsetWidth", "offsetHeight", "offsetLeft", "offsetTop"] as const;
const originals = new Map<string, PropertyDescriptor | undefined>();

/**
 * Gives the carousel a size: a viewport of 400 px, a slide of 400 px each side by side. Embla reads
 * these with `offset*` (the size of the view from the track, which is a flex box as wide as the
 * viewport), and the margin of the last slide from the computed style (which happy-dom leaves
 * empty, and embla turns into NaN).
 */
function layout() {
  const inViewport = (node: HTMLElement) => node.matches('[data-slot="carousel-content"]');
  const isTrack = (node: HTMLElement) =>
    node.parentElement?.matches('[data-slot="carousel-content"]') === true;
  const isSlide = (node: HTMLElement) => node.matches('[data-slot="carousel-item"]');
  const position = (node: HTMLElement) =>
    node.parentElement ? [...node.parentElement.children].indexOf(node) : 0;
  const measure = (name: (typeof MEASURES)[number], get: (node: HTMLElement) => number) => {
    originals.set(name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name));
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get() {
        return get(this as HTMLElement);
      },
    });
  };
  // The track is a flex box as wide as the viewport; its slides overflow it, as in a browser.
  measure("offsetWidth", (node) => (inViewport(node) || isTrack(node) || isSlide(node) ? 400 : 0));
  measure("offsetHeight", (node) => (inViewport(node) || isTrack(node) || isSlide(node) ? 533 : 0));
  measure("offsetLeft", (node) => (isSlide(node) ? position(node) * 400 : 0));
  measure("offsetTop", () => 0);
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((node, pseudo) => {
    const style = real(node, pseudo);
    return new Proxy(style, {
      get(target, key) {
        if (key === "getPropertyValue") {
          return (name: string) =>
            name.startsWith("margin-") ? "0px" : target.getPropertyValue(name);
        }
        const value = Reflect.get(target, key) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
}

function unlayout() {
  for (const name of MEASURES) {
    const original = originals.get(name);
    if (original) Object.defineProperty(HTMLElement.prototype, name, original);
    else Reflect.deleteProperty(HTMLElement.prototype, name);
  }
  originals.clear();
}

/** `prefers-reduced-motion`, as the visitor set it. */
function motion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
}

/** Stands in for IntersectionObserver: embla asks it which slides are in view, and happy-dom never answers. */
class Observer {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** Renders the gallery with a size, an observer and a motion setting. */
function setupMoving({
  reduce = true,
  locale = "en" as Locale,
  name = "all" as "all" | "chosen" | "single",
  props = {} as Partial<ProductGalleryProps>,
  fake = false,
} = {}) {
  layout();
  motion(reduce);
  vi.stubGlobal("IntersectionObserver", Observer);
  if (fake) vi.useFakeTimers();
  return setup(locale, name, props);
}

/** Lets time pass: the timers and the animation frames run, and React takes what they set. */
const pass = (milliseconds: number) => act(() => void vi.advanceTimersByTime(milliseconds));
const click = (button: HTMLElement) => act(() => void fireEvent.click(button));
const transformOf = () => track().style.transform;

/** The products with a path for a picture: next/image drops `sizes` for a data URI. */
const withPaths = (content: ProductGalleryContent): ProductGalleryContent => ({
  ...content,
  media: content.media.map((item, index) => ({ ...item, src: `/media/hoodie-${index}.png` })),
});

async function openZoom(
  locale: Locale = "en",
  name: "all" | "chosen" | "single" = "all",
  props: Partial<ProductGalleryProps> = {},
) {
  const view = setup(locale, name, props);
  const user = userEvent.setup();
  const opener = trigger();
  await user.click(opener);
  await waitFor(() => expect(zoomDialog()).not.toBeNull());
  return { user, opener, view };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  unlayout();
});

describe("ProductGallery", () => {
  describe.each(LOCALES)("the region and its slides · %s", (locale) => {
    it("is one region named by the catalog's label and the product, called a carousel", () => {
      setup(locale);
      const region = screen.getByRole("region", { name: labelOf(locale) });
      expect(region).toBe(slot("product-gallery-carousel"));
      expect(region.getAttribute("aria-roledescription")).toBe(words(locale).carousel);
      expect(screen.getAllByRole("region")).toHaveLength(1);
    });

    it("makes each picture a slide that says where it is, and shows its alternative text", () => {
      setup(locale);
      const media = sample(locale).media;
      expect(slides()).toHaveLength(media.length);
      for (const [index, slide] of slides().entries()) {
        expect(slide.getAttribute("role")).toBe("group");
        expect(slide.getAttribute("aria-roledescription")).toBe(words(locale).slide);
        expect(slide.getAttribute("aria-label")).toBe(placeOf(locale, index + 1, media.length));
        expect(slide.querySelector("img")?.getAttribute("alt")).toBe(media[index]?.alt);
        expect(slide.querySelectorAll("img")).toHaveLength(1);
      }
    });

    it("hides the slides that are out of view and shows the one in view", () => {
      setup(locale);
      expect(slides().map((slide) => slide.getAttribute("aria-hidden"))).toEqual([
        null,
        "true",
        "true",
        "true",
      ]);
      expect(screen.getAllByRole("group", { name: placeOf(locale, 1) })).toHaveLength(1);
    });

    it("says the place as text, in a status that is in the markup from the first render", () => {
      setup(locale);
      const region = slot("product-gallery-position") as HTMLElement;
      expect(region.getAttribute("role")).toBe("status");
      expect(screen.getByRole("status")).toBe(region);
      expect(plain(region.textContent)).toBe(placeOf(locale, 1));
      // Inside the carousel's region, so that it is named by being in it.
      expect(slot("product-gallery-carousel")?.contains(region)).toBe(true);
    });

    it("has two buttons and a zoom button named by the catalog", () => {
      setup(locale);
      expect(previousOf(locale)).toBe(slot("carousel-previous"));
      expect(nextOf(locale)).toBe(slot("carousel-next"));
      expect(screen.getByRole("button", { name: words(locale).zoom })).toBe(trigger());
      expect(trigger().getAttribute("aria-haspopup")).toBe("dialog");
      expect(trigger().getAttribute("aria-expanded")).toBe("false");
    });

    it("names every thumbnail by its picture's alternative text", () => {
      setup(locale);
      const media = sample(locale).media;
      expect(thumbnails().map((button) => button.getAttribute("aria-label"))).toEqual(
        media.map((item) => item.alt),
      );
      for (const button of thumbnails()) {
        expect(button.getAttribute("type")).toBe("button");
        expect(button.querySelector("img")?.getAttribute("alt")).toBe("");
        expect(button.querySelector("[aria-hidden=true] img")).not.toBeNull();
      }
    });
  });

  describe("the pictures", () => {
    it("keep their own aspect ratio, so that nothing shifts while they load", () => {
      setup("en");
      const media = sample("en").media;
      for (const [index, picture] of all("product-gallery-picture").entries()) {
        const item = media[index];
        expect(picture.style.aspectRatio.replace(/\s+/g, "")).toBe(
          `${item?.width}/${item?.height}`,
        );
        expect(tokens(picture)).toContain("relative");
        // The image fills the frame the ratio makes, and keeps no ratio of its own.
        const frame = picture.querySelector<HTMLElement>("[data-slot=image]");
        expect(tokens(frame)).toEqual(
          expect.arrayContaining(["absolute", "inset-0", "h-full", "aspect-auto"]),
        );
      }
    });

    it("take the page's column as their width, and a `sizes` the page passes", () => {
      render(<ProductGallery {...withPaths(sample("en"))} copy={copyOf("en")} locale="en-US" />);
      const mains = slides().map((slide) => slide.querySelector("img"));
      expect(mains).toHaveLength(4);
      for (const image of mains) {
        expect(image?.getAttribute("sizes")).toBe("(min-width: 768px) 50vw, 100vw");
      }
      for (const button of thumbnails()) {
        expect(button.querySelector("img")?.getAttribute("sizes")).toBe("80px");
      }
      cleanup();
      render(
        <ProductGallery
          {...withPaths(sample("en"))}
          copy={copyOf("en")}
          locale="en-US"
          sizes="(min-width: 1024px) 33vw, 100vw"
        />,
      );
      for (const slide of slides()) {
        expect(slide.querySelector("img")?.getAttribute("sizes")).toBe(
          "(min-width: 1024px) 33vw, 100vw",
        );
      }
    });

    it("preload the picture shown first and no other, and only when the page says so", () => {
      // next/image leaves `loading="lazy"` off the picture it preloads (and adds a <link rel=preload>).
      const loadings = () =>
        slides().map((slide) => slide.querySelector("img")?.getAttribute("loading"));
      const preloads = () => document.head.querySelectorAll('link[rel="preload"][as="image"]');
      const draw = (name: "all" | "chosen", priority: boolean) =>
        render(
          <ProductGallery
            {...withPaths(sample("en", name))}
            copy={copyOf("en")}
            locale="en-US"
            priority={priority}
          />,
        );
      draw("all", true);
      expect(loadings()).toEqual([null, "lazy", "lazy", "lazy"]);
      expect(preloads().length).toBeGreaterThan(0);
      cleanup();
      draw("all", false);
      expect(loadings()).toEqual(["lazy", "lazy", "lazy", "lazy"]);
      cleanup();
      // The picture shown first is the colour's, and that is the one that is preloaded.
      draw("chosen", true);
      expect(loadings()).toEqual(["lazy", "lazy", "lazy", null]);
    });
  });

  describe("the buttons", () => {
    it("are 44 px, inside the picture's box, and dimmed by aria-disabled", () => {
      setup("en");
      for (const button of [previousOf(), nextOf(), trigger()]) {
        expect(tokens(button)).toContain("size-11");
        expect(slot("product-gallery-stage")?.contains(button)).toBe(true);
        expect(tokens(button)).toContain("z-10");
      }
      for (const button of [previousOf(), nextOf()]) {
        expect(tokens(button)).toContain("aria-disabled:pointer-events-none");
        expect(tokens(button)).toContain("aria-disabled:opacity-50");
      }
      // On the logical sides, not the physical ones.
      expect(tokens(previousOf())).toContain("start-2");
      expect(tokens(nextOf())).toContain("end-2");
      expect(tokens(trigger())).toContain("end-2");
      expect(tokens(trigger())).toContain("top-2");
    });

    it("start with Previous off and Next on, off by aria-disabled so that they keep focus", () => {
      setupMoving();
      expect(off(previousOf())).toBe(true);
      expect(previousOf().hasAttribute("disabled")).toBe(false);
      expect(off(nextOf())).toBe(false);
      previousOf().focus();
      expect(document.activeElement).toBe(previousOf());
      click(previousOf());
      expect(transformOf()).toBe("translate3d(0px,0px,0px)");
      expect(status()).toBe(placeOf("en", 1));
    });

    it("move one picture at a time, turn off at the ends, and say the new place", () => {
      setupMoving();
      click(nextOf());
      expect(transformOf()).toBe("translate3d(-400px,0px,0px)");
      expect(status()).toBe(placeOf("en", 2));
      expect(off(previousOf())).toBe(false);
      click(nextOf());
      click(nextOf());
      expect(transformOf()).toBe("translate3d(-1200px,0px,0px)");
      expect(status()).toBe(placeOf("en", 4));
      expect(off(nextOf())).toBe(true);
      nextOf().focus();
      expect(document.activeElement).toBe(nextOf());
      click(nextOf());
      expect(transformOf()).toBe("translate3d(-1200px,0px,0px)");
      click(previousOf());
      expect(status()).toBe(placeOf("en", 3));
      expect(off(nextOf())).toBe(false);
    });

    it("show only the picture in view to a screen reader, after each move", () => {
      setupMoving();
      click(nextOf());
      expect(slides().map((slide) => slide.getAttribute("aria-hidden"))).toEqual([
        "true",
        null,
        "true",
        "true",
      ]);
      expect(screen.getByRole("group", { name: placeOf("en", 2) })).toBe(slides()[1]);
    });

    it("answer the arrow keys the primitive gives", () => {
      setupMoving();
      const region = slot("product-gallery-carousel") as HTMLElement;
      act(() => void fireEvent.keyDown(region, { key: "ArrowRight" }));
      expect(transformOf()).toBe("translate3d(-400px,0px,0px)");
      act(() => void fireEvent.keyDown(region, { key: "ArrowLeft" }));
      expect(transformOf()).toBe("translate3d(0px,0px,0px)");
    });

    it("leave a slide with nothing to focus, so that Tab never scrolls the track by itself", () => {
      setupMoving();
      for (const slide of slides()) {
        expect(slide.querySelectorAll("a, button, input, [tabindex]")).toHaveLength(0);
      }
      // The zoom button and the thumbnails are outside the slides, where embla's watchFocus is not.
      for (const control of [trigger(), ...thumbnails()]) {
        expect(slides().some((slide) => slide.contains(control))).toBe(false);
      }
    });
  });

  describe("the thumbnails", () => {
    it("mark the current picture with aria-current, a heavier border and full opacity", () => {
      setupMoving();
      expect(currentThumbnail()).toBe(0);
      expect(thumbnails().filter((button) => button.hasAttribute("aria-current"))).toHaveLength(1);
      expect(tokens(thumbnails()[0] ?? null)).toContain("border-foreground");
      expect(tokens(thumbnails()[0] ?? null)).not.toContain("opacity-70");
      // The others are dimmer and have no border: a shape and a weight, not a colour alone.
      for (const button of thumbnails().slice(1)) {
        expect(tokens(button)).toContain("border-transparent");
        expect(tokens(button)).toContain("opacity-70");
        expect(tokens(button)).not.toContain("border-foreground");
      }
      click(nextOf());
      expect(currentThumbnail()).toBe(1);
      expect(tokens(thumbnails()[1] ?? null)).toContain("border-foreground");
      expect(tokens(thumbnails()[0] ?? null)).toContain("border-transparent");
    });

    it("move the carousel when pressed, with a pointer or a key, and mark themselves", async () => {
      setupMoving();
      const user = userEvent.setup();
      await user.click(thumbnails()[2] as HTMLElement);
      expect(transformOf()).toBe("translate3d(-800px,0px,0px)");
      expect(status()).toBe(placeOf("en", 3));
      expect(currentThumbnail()).toBe(2);
      thumbnails()[3]?.focus();
      await user.keyboard("{Enter}");
      expect(transformOf()).toBe("translate3d(-1200px,0px,0px)");
      expect(currentThumbnail()).toBe(3);
      thumbnails()[1]?.focus();
      await user.keyboard(" ");
      expect(transformOf()).toBe("translate3d(-400px,0px,0px)");
      expect(currentThumbnail()).toBe(1);
      expect(off(previousOf())).toBe(false);
    });

    it("are named by their place when a picture has no alternative text", () => {
      const content = sample("en");
      render(
        <ProductGallery
          {...content}
          media={content.media.map((item, index) => (index === 1 ? { ...item, alt: "" } : item))}
          copy={copyOf("en")}
          locale="en-US"
        />,
      );
      expect(thumbnails()[1]?.getAttribute("aria-label")).toBe("Image 2 of 4");
      expect(thumbnails()[0]?.getAttribute("aria-label")).toBe(content.media[0]?.alt);
    });

    it("are in the page from `md` and gone from the tab order and the tree below it", () => {
      setup("en");
      const box = thumbnails()[0]?.closest("div") as HTMLElement;
      expect(tokens(box)).toContain("hidden");
      expect(tokens(box)).toContain("md:block");
      expect(box.contains(slot("product-gallery-thumbnails"))).toBe(true);
    });

    it("stand before the picture, in a column that scrolls, by default", () => {
      setup("en");
      const root = slot("product-gallery") as HTMLElement;
      const list = slot("product-gallery-thumbnails") as HTMLElement;
      expect(list.getAttribute("data-layout")).toBe("side");
      expect(root.firstElementChild?.contains(list)).toBe(true);
      expect(root.lastElementChild).toBe(slot("product-gallery-carousel"));
      expect(tokens(root)).toContain("md:grid-cols-[4.5rem_minmax(0,1fr)]");
      expect(tokens(list)).toEqual(
        expect.arrayContaining(["absolute", "inset-0", "flex-col", "overflow-y-auto"]),
      );
      expect(tokens(list)).not.toContain("overflow-x-auto");
      expect(tokens(list.parentElement)).toContain("relative");
    });

    it("stand under the picture and wrap, with thumbnails: below", () => {
      setup("en", "all", { thumbnails: "below" });
      const root = slot("product-gallery") as HTMLElement;
      const list = slot("product-gallery-thumbnails") as HTMLElement;
      expect(list.getAttribute("data-layout")).toBe("below");
      expect(root.firstElementChild).toBe(slot("product-gallery-carousel"));
      expect(root.lastElementChild?.contains(list)).toBe(true);
      expect(tokens(root)).not.toContain("md:grid-cols-[4.5rem_minmax(0,1fr)]");
      expect(tokens(list)).toContain("flex-wrap");
      // A box that scrolls sideways fails the design system's check: this one wraps.
      for (const name of tokens(list)) expect(name).not.toMatch(/^overflow-/);
    });

    it("fill the column when it is beside the picture and are 4 rem wide when they are under it", () => {
      const view = setup("en");
      for (const button of thumbnails()) {
        expect(tokens(button)).toContain("w-full");
        expect(tokens(button)).not.toContain("w-16");
      }
      view.unmount();
      setup("en", "all", { thumbnails: "below" });
      for (const button of thumbnails()) {
        expect(tokens(button)).toContain("w-16");
        expect(tokens(button)).not.toContain("w-full");
      }
    });

    it("are 44 px tall at least and focus with a ring at full strength", () => {
      setup("en");
      for (const button of thumbnails()) {
        expect(tokens(button)).toContain("min-h-11");
        expect(tokens(button)).toContain("focus-visible:ring-ring");
        expect(button.className).not.toMatch(/ring-ring\//);
        expect(tokens(button.firstElementChild)).toContain("min-h-11");
      }
    });
  });

  describe("the first picture", () => {
    it("is the first, with nothing chosen or a value no picture shows", () => {
      setupMoving({ props: { selectedValueIds: ["colour-unknown"] } });
      expect(status()).toBe(placeOf("en", 1));
      expect(currentThumbnail()).toBe(0);
      expect(transformOf()).toBe("translate3d(0px,0px,0px)");
    });

    it("is the picture of the colour chosen, in embla and in the carousel's own words", () => {
      setupMoving({ name: "chosen" });
      expect(transformOf()).toBe("translate3d(-1200px,0px,0px)");
      expect(status()).toBe(placeOf("en", 4));
      expect(currentThumbnail()).toBe(3);
      expect(slides().map((slide) => slide.getAttribute("aria-hidden"))).toEqual([
        "true",
        "true",
        "true",
        null,
      ]);
      expect(off(previousOf())).toBe(false);
      expect(off(nextOf())).toBe(true);
    });

    it.each(LOCALES)("is in the server's markup before any script runs, in %s", (locale) => {
      const html = renderToString(element(locale, "chosen"));
      // The track starts on the fourth picture: three widths back, as embla will write in pixels.
      expect(html).toContain("translate3d(-300%, 0, 0)");
      expect(html).toContain(`aria-label="${placeOf(locale, 4)}"`);
      expect(html).toContain('aria-current="true"');
      expect(html).toContain(placeOf(locale, 4));
      // Previous is on, Next is off, as they will be once the script has run.
      const buttons = [...html.matchAll(/<button[^>]*data-slot="carousel-(previous|next)"[^>]*>/g)];
      expect(buttons.map((match) => /aria-disabled="true"/.test(match[0]))).toEqual([true, true]);
    });

    it("starts the track at the beginning when nothing is chosen, with no inline position", () => {
      const html = renderToString(element("en", "all"));
      expect(html).not.toContain("translate3d");
      expect(html).not.toContain("-0%");
    });

    it("is mirrored in right-to-left: the track starts on the other side", () => {
      const html = renderToString(
        <DirectionProvider direction="rtl">{element("en", "chosen")}</DirectionProvider>,
      );
      expect(html).toContain("translate3d(300%, 0, 0)");
      expect(html).not.toContain("translate3d(-300%");
    });

    it("never rewrites the position React drew, so that embla alone moves the track", () => {
      const view = setupMoving({ name: "chosen" });
      click(previousOf());
      expect(transformOf()).toBe("translate3d(-800px,0px,0px)");
      view.rerender(element("en", "chosen"));
      expect(transformOf()).toBe("translate3d(-800px,0px,0px)");
    });
  });

  describe("a colour chosen later", () => {
    const chosen = (colour: string) => ({ selectedValueIds: [`colour-${colour}`] });

    it("takes the carousel to its picture, and the thumbnails and the status follow", () => {
      const view = setupMoving({ reduce: true });
      expect(status()).toBe(placeOf("en", 1));
      view.rerender(element("en", "all", chosen("oatmeal")));
      expect(transformOf()).toBe("translate3d(-800px,0px,0px)");
      expect(status()).toBe(placeOf("en", 3));
      expect(currentThumbnail()).toBe(2);
      view.rerender(element("en", "all", chosen("black")));
      expect(transformOf()).toBe("translate3d(-400px,0px,0px)");
      expect(status()).toBe(placeOf("en", 2));
    });

    it("jumps under prefers-reduced-motion: the track is in place at once", () => {
      const view = setupMoving({ reduce: true, fake: true });
      view.rerender(element("en", "all", chosen("forest")));
      expect(transformOf()).toBe("translate3d(-1200px,0px,0px)");
      pass(16);
      expect(transformOf()).toBe("translate3d(-1200px,0px,0px)");
    });

    it("glides otherwise: a frame later the track is on its way, and it arrives", () => {
      const view = setupMoving({ reduce: false, fake: true });
      view.rerender(element("en", "all", chosen("forest")));
      pass(16);
      const x = Number.parseFloat(/translate3d\((-?[\d.]+)px/.exec(transformOf())?.[1] ?? "");
      expect(x).toBeLessThan(0);
      expect(x).toBeGreaterThan(-1200);
      pass(2000);
      expect(transformOf()).toBe("translate3d(-1200px,0px,0px)");
    });

    it("leaves the carousel where the shopper put it when the choice is the same picture", () => {
      const view = setupMoving({ reduce: true, name: "chosen" });
      click(previousOf());
      expect(status()).toBe(placeOf("en", 3));
      // A new array with the same colour, and another value the gallery has no picture for.
      view.rerender(element("en", "chosen", { selectedValueIds: ["colour-forest"] }));
      view.rerender(element("en", "chosen", { selectedValueIds: ["colour-forest", "size-m"] }));
      expect(transformOf()).toBe("translate3d(-800px,0px,0px)");
      expect(status()).toBe(placeOf("en", 3));
    });

    it("goes back to the first picture when the colour is cleared", () => {
      const view = setupMoving({ reduce: true, name: "chosen" });
      view.rerender(element("en", "all"));
      expect(transformOf()).toBe("translate3d(0px,0px,0px)");
      expect(status()).toBe(placeOf("en", 1));
    });
  });

  describe("one picture", () => {
    it("is a group named by the label, with the picture and the zoom button and nothing else", () => {
      setup("en", "single");
      const region = slot("product-gallery-carousel") as HTMLElement;
      expect(region.getAttribute("role")).toBe("group");
      expect(region.getAttribute("aria-label")).toBe(labelOf("en"));
      expect(region.hasAttribute("aria-roledescription")).toBe(false);
      expect(screen.getAllByRole("img")).toHaveLength(1);
      expect(trigger()).not.toBeNull();
      expect(screen.queryByRole("button", { name: words("en").previous })).toBeNull();
      expect(screen.queryByRole("button", { name: words("en").next })).toBeNull();
      expect(slot("product-gallery-position")).toBeNull();
      expect(slot("product-gallery-thumbnails")).toBeNull();
      expect(slot("carousel-content")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("draws its picture at its own ratio, with the page's sizes and priority", () => {
      render(
        <ProductGallery
          {...withPaths(sample("en", "single"))}
          copy={copyOf("en")}
          locale="en-US"
          priority
        />,
      );
      const image = slot("product-gallery-picture")?.querySelector("img");
      expect(image?.getAttribute("sizes")).toBe("(min-width: 768px) 50vw, 100vw");
      expect(image?.hasAttribute("loading")).toBe(false);
      expect(
        (slot("product-gallery-picture") as HTMLElement).style.aspectRatio.replace(/\s+/g, ""),
      ).toBe("600/800");
    });

    it("zooms all the same, to the one picture, with no buttons and no position", async () => {
      const { user } = await openZoom("en", "single");
      expect(zoomPicture().getAttribute("alt")).toBe(sample("en", "single").media[0]?.alt);
      expect(slot("product-gallery-zoom-controls")).toBeNull();
      expect(slot("product-gallery-zoom-position")).toBeNull();
      await user.keyboard("{ArrowRight}");
      expect(zoomPicture().getAttribute("alt")).toBe(sample("en", "single").media[0]?.alt);
    });

    it("is in the server's markup the same way", () => {
      const html = renderToString(element("en", "single"));
      expect(html).not.toContain("carousel-content");
      expect(html).toContain('role="group"');
    });
  });

  describe("the zoom", () => {
    it.each(LOCALES)(
      "opens a dialog named by the product, with the large picture, in %s",
      async (locale) => {
        const { opener } = await openZoom(locale);
        const media = sample(locale).media;
        const popup = screen.getByRole("dialog", {
          name: formatMessage(
            words(locale).zoomTitle,
            { title: sample(locale).title },
            htmlLang[locale],
          ),
        });
        expect(popup).toBe(zoomDialog());
        expect(opener.getAttribute("aria-expanded")).toBe("true");
        expect(zoomPicture().getAttribute("alt")).toBe(media[0]?.alt);
        expect(zoomStatus()).toBe(placeOf(locale, 1));
        expect(within(popup).getByRole("button", { name: words(locale).close })).toBe(
          slot("product-gallery-zoom-close"),
        );
        expect(within(popup).getByRole("button", { name: words(locale).next })).toBe(
          slot("product-gallery-zoom-next"),
        );
        expect(within(popup).getByRole("button", { name: words(locale).previous })).toBe(
          slot("product-gallery-zoom-previous"),
        );
      },
    );

    it("is a modal dialog: one close button, the page behind it out of the tree", async () => {
      await openZoom("en");
      expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      // The primitive's own close button is not drawn: the header holds the one.
      expect(
        within(zoomDialog() as HTMLElement).getAllByRole("button", { name: "Close" }),
      ).toHaveLength(1);
      expect(screen.queryByRole("button", { name: "Enlarge image" })).toBeNull();
      expect(screen.getByRole("button", { name: "Enlarge image", hidden: true })).toBeTruthy();
    });

    it("puts the focus on the close button first, which is also the first Tab stop", async () => {
      const { user } = await openZoom("en");
      const popup = zoomDialog() as HTMLElement;
      const stops = [...popup.querySelectorAll<HTMLElement>("button")];
      expect(stops.map((stop) => stop.getAttribute("data-slot"))).toEqual([
        "product-gallery-zoom-close",
        "product-gallery-zoom-previous",
        "product-gallery-zoom-next",
      ]);
      expect(popup.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(slot("product-gallery-zoom-previous"));
      await user.tab();
      expect(popup.contains(document.activeElement)).toBe(true);
    });

    it("shows the picture the carousel is on", async () => {
      const content = sample("en", "chosen");
      const { user } = await openZoom("en", "chosen");
      expect(zoomPicture().getAttribute("alt")).toBe(content.media[3]?.alt);
      expect(zoomStatus()).toBe(placeOf("en", 4));
      expect(off(slot("product-gallery-zoom-next") as HTMLElement)).toBe(true);
      expect(off(slot("product-gallery-zoom-previous") as HTMLElement)).toBe(false);
      await user.click(slot("product-gallery-zoom-previous") as HTMLElement);
      expect(zoomStatus()).toBe(placeOf("en", 3));
    });

    it("fits the picture whole in a box that takes the room left, never cutting it", async () => {
      await openZoom("en");
      const stage = slot("product-gallery-zoom-stage") as HTMLElement;
      expect(tokens(stage)).toEqual(expect.arrayContaining(["relative", "min-h-0", "flex-1"]));
      expect(tokens(zoomPicture().closest("[data-slot=image]") ?? zoomPicture())).not.toContain(
        "object-cover",
      );
      expect(stage.contains(zoomPicture())).toBe(true);
      expect(tokens(zoomPicture())).toContain("object-contain");
    });

    it("moves with the buttons, says the new place, and dims the button that cannot move", async () => {
      const { user } = await openZoom("en");
      const previous = slot("product-gallery-zoom-previous") as HTMLElement;
      const next = slot("product-gallery-zoom-next") as HTMLElement;
      expect(off(previous)).toBe(true);
      expect(previous.hasAttribute("disabled")).toBe(false);
      expect(tokens(previous)).toContain("aria-disabled:opacity-50");
      expect(tokens(previous)).toContain("size-11");
      await user.click(next);
      expect(zoomStatus()).toBe(placeOf("en", 2));
      expect(zoomPicture().getAttribute("alt")).toBe(sample("en").media[1]?.alt);
      expect(off(previous)).toBe(false);
      await user.click(next);
      await user.click(next);
      expect(zoomStatus()).toBe(placeOf("en", 4));
      expect(off(next)).toBe(true);
      next.focus();
      await user.click(next);
      expect(zoomStatus()).toBe(placeOf("en", 4));
      expect(document.activeElement).toBe(next);
      expect(slot("product-gallery-zoom-position")?.getAttribute("role")).toBe("status");
    });

    it("answers the arrow keys from any control in the popup, and stops at the ends", async () => {
      const { user } = await openZoom("en");
      await user.keyboard("{ArrowRight}");
      expect(zoomStatus()).toBe(placeOf("en", 2));
      await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
      expect(zoomStatus()).toBe(placeOf("en", 4));
      await user.keyboard("{ArrowLeft}");
      expect(zoomStatus()).toBe(placeOf("en", 3));
      slot("product-gallery-zoom-next")?.focus();
      await user.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
      expect(zoomStatus()).toBe(placeOf("en", 1));
      expect(zoomDialog()).not.toBeNull();
    });

    it("swaps the arrow keys in right-to-left: the start side's key goes back", async () => {
      const user = userEvent.setup();
      render(<DirectionProvider direction="rtl">{element("en")}</DirectionProvider>);
      await user.click(trigger());
      await waitFor(() => expect(zoomDialog()).not.toBeNull());
      await user.keyboard("{ArrowLeft}");
      expect(zoomStatus()).toBe(placeOf("en", 2));
      await user.keyboard("{ArrowRight}");
      expect(zoomStatus()).toBe(placeOf("en", 1));
      for (const slotName of ["product-gallery-zoom-previous", "product-gallery-zoom-next"]) {
        expect(tokens(slot(slotName)?.querySelector("svg") ?? null)).toContain("rtl:rotate-180");
      }
    });

    it("closes with ONE Escape and puts the focus back on the button", async () => {
      const { user, opener } = await openZoom("en");
      await user.keyboard("{Escape}");
      await waitFor(() => expect(zoomDialog()).toBeNull());
      expect(document.activeElement).toBe(opener);
      expect(opener.getAttribute("aria-expanded")).toBe("false");
    });

    it("closes with the close button and puts the focus back on the button", async () => {
      const { user, opener } = await openZoom("en");
      await user.click(slot("product-gallery-zoom-close") as HTMLElement);
      await waitFor(() => expect(zoomDialog()).toBeNull());
      expect(document.activeElement).toBe(opener);
    });

    it("closes with the keyboard on the close button, Enter or Space", async () => {
      const { user, opener } = await openZoom("en");
      slot("product-gallery-zoom-close")?.focus();
      await user.keyboard("{Enter}");
      await waitFor(() => expect(zoomDialog()).toBeNull());
      expect(document.activeElement).toBe(opener);
    });

    it("keeps Tab and Shift+Tab inside, round the three buttons and back", async () => {
      const { user } = await openZoom("en");
      const popup = zoomDialog() as HTMLElement;
      for (let press = 0; press < 8; press++) {
        await user.tab();
        expect(popup.contains(document.activeElement)).toBe(true);
      }
      for (let press = 0; press < 8; press++) {
        await user.tab({ shift: true });
        expect(popup.contains(document.activeElement)).toBe(true);
      }
    });

    it("leaves the carousel on the picture the dialog ended on, jumping to it", async () => {
      setupMoving({ reduce: false, fake: false });
      const user = userEvent.setup();
      await user.click(trigger());
      await waitFor(() => expect(zoomDialog()).not.toBeNull());
      await user.click(slot("product-gallery-zoom-next") as HTMLElement);
      await user.click(slot("product-gallery-zoom-next") as HTMLElement);
      expect(zoomStatus()).toBe(placeOf("en", 3));
      // Behind the dialog the carousel has not moved yet.
      expect(transformOf()).toBe("translate3d(0px,0px,0px)");
      await user.keyboard("{Escape}");
      await waitFor(() => expect(zoomDialog()).toBeNull());
      // A jump, not a glide: the track is in place the moment the dialog is gone.
      expect(transformOf()).toBe("translate3d(-800px,0px,0px)");
      expect(status()).toBe(placeOf("en", 3));
      expect(currentThumbnail()).toBe(2);
      expect(document.activeElement).toBe(trigger());
    });

    it("opens on the picture the carousel moved to, and again on a new one", async () => {
      setupMoving({ reduce: true });
      const user = userEvent.setup();
      click(nextOf());
      await user.click(trigger());
      await waitFor(() => expect(zoomDialog()).not.toBeNull());
      expect(zoomStatus()).toBe(placeOf("en", 2));
      await user.keyboard("{Escape}");
      await waitFor(() => expect(zoomDialog()).toBeNull());
      click(nextOf());
      await user.click(trigger());
      await waitFor(() => expect(zoomDialog()).not.toBeNull());
      expect(zoomStatus()).toBe(placeOf("en", 3));
    });

    it("is not drawn without `zoom`: no button, no dialog, and nothing for the server to send", () => {
      setup("en", "all", { zoom: false });
      expect(trigger()).toBeNull();
      expect(screen.queryByRole("button", { name: words("en").zoom })).toBeNull();
      expect(slot("product-gallery-carousel")).not.toBeNull();
      const html = renderToString(element("en", "all", { zoom: false }));
      expect(html).not.toContain("product-gallery-zoom");
    });

    it("is not drawn for one picture without `zoom`, either", () => {
      setup("en", "single", { zoom: false });
      expect(trigger()).toBeNull();
      expect(slot("product-gallery-carousel")?.querySelector("button")).toBeNull();
    });
  });

  describe("the zoom drawn open for the design system", () => {
    it("is open at first render without taking the focus, and the page stays reachable", async () => {
      setup("en", "all", {
        defaultZoomOpen: true,
        modal: false,
        zoomPopupClassName: "max-h-[calc(100%-2rem)]",
      });
      expect(zoomDialog()).not.toBeNull();
      expect(tokens(zoomDialog())).toContain("max-h-[calc(100%-2rem)]");
      // Base UI moves focus after the popup is in, a frame or two later: wait past that.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      expect(zoomDialog()?.contains(document.activeElement)).toBe(false);
      expect(trigger().getAttribute("aria-expanded")).toBe("true");
      // Not modal: the page behind is in the tree and nothing is inert.
      expect(
        within(slot("product-gallery-carousel") as HTMLElement).getByRole("button", {
          name: "Next image",
        }),
      ).toBeTruthy();
      expect(document.querySelector("[inert]")).toBeNull();
      expect(zoomStatus()).toBe(placeOf("en", 1));
    });

    it("takes the focus when a reader opens it again, and closes like any other", async () => {
      setup("en", "all", { defaultZoomOpen: true, modal: false });
      const user = userEvent.setup();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(zoomDialog()).toBeNull());
      await user.click(trigger());
      await waitFor(() => expect(zoomDialog()).not.toBeNull());
      expect(zoomDialog()?.contains(document.activeElement)).toBe(true);
    });

    it("stops the entry animation under reduced motion", async () => {
      await openZoom("en");
      expect(tokens(zoomDialog())).toContain("motion-reduce:duration-0");
    });
  });

  describe("right to left", () => {
    it("starts embla in the right-to-left direction: the track runs the other way", () => {
      layout();
      motion(true);
      vi.stubGlobal("IntersectionObserver", Observer);
      render(<DirectionProvider direction="rtl">{element("en", "chosen")}</DirectionProvider>);
      expect(transformOf()).toBe("translate3d(1200px,0px,0px)");
      expect(status()).toBe(placeOf("en", 4));
      // The start side's key goes back, which is the right arrow here.
      const region = slot("product-gallery-carousel") as HTMLElement;
      act(() => void fireEvent.keyDown(region, { key: "ArrowRight" }));
      expect(transformOf()).toBe("translate3d(800px,0px,0px)");
      act(() => void fireEvent.keyDown(region, { key: "ArrowLeft" }));
      expect(transformOf()).toBe("translate3d(1200px,0px,0px)");
    });

    it("turns the chevrons and puts the buttons on the logical sides", () => {
      render(<DirectionProvider direction="rtl">{element("en")}</DirectionProvider>);
      for (const button of [previousOf(), nextOf()]) {
        expect(tokens(button.querySelector("svg"))).toContain("rtl:rotate-180");
      }
      expect(tokens(previousOf())).toContain("start-2");
      expect(tokens(nextOf())).toContain("end-2");
    });
  });

  describe.each(longLabels)("a long %s name and picture description", (locale, strings) => {
    const long = (): ProductGalleryProps => ({
      ...sample(locale),
      title: strings.productName,
      media: sample(locale).media.map((item) => ({ ...item, alt: strings.imageAlt })),
      copy: copyOf(locale),
      locale: htmlLang[locale],
    });

    it("is the region's name and the slides' alternative text in full, and nothing is cut", async () => {
      const { container } = render(<ProductGallery {...long()} />);
      expect(
        screen.getByRole("region", {
          name: formatMessage(
            words(locale).label,
            { title: strings.productName },
            htmlLang[locale],
          ),
        }),
      ).toBeTruthy();
      for (const button of thumbnails())
        expect(button.getAttribute("aria-label")).toBe(strings.imageAlt);
      for (const part of [
        slot("product-gallery"),
        slot("product-gallery-carousel"),
        slot("product-gallery-stage"),
        slot("product-gallery-thumbnails"),
        slot("product-gallery-position"),
        ...all("carousel-item"),
        ...all("product-gallery-thumbnail"),
      ]) {
        expect(part?.className).not.toMatch(CLIPPING_CLASSES);
      }
      expect(container.querySelectorAll("[data-truncate]")).toHaveLength(0);
      const user = userEvent.setup();
      await user.click(trigger());
      await waitFor(() => expect(zoomDialog()).not.toBeNull());
      const title = within(zoomDialog() as HTMLElement).getByText(
        formatMessage(words(locale).zoomTitle, { title: strings.productName }, htmlLang[locale]),
      );
      // A title this long wraps anywhere, and the popup's parts can shrink to let it.
      expect(tokens(title)).toContain("wrap-anywhere");
      expect(tokens(title)).toContain("min-w-0");
      expect(title.className).not.toMatch(CLIPPING_CLASSES);
      expect(zoomDialog()?.className).not.toMatch(CLIPPING_CLASSES);
    });

    it("keeps the buttons the same size", () => {
      render(<ProductGallery {...long()} />);
      for (const button of [previousOf(locale), nextOf(locale), trigger()]) {
        expect(tokens(button)).toContain("size-11");
      }
    });
  });

  describe("the files", () => {
    const files = ["product-gallery.tsx", "product-gallery-zoom.tsx"];

    it.each(files)("%s keeps the class rules: tokens, logical properties, light only", (file) => {
      expect(findViolations(source(file))).toEqual([]);
    });

    it.each(files)("%s opens with the T38 header, uses no em dash and cuts nothing", (file) => {
      const text = source(file);
      expect(text.startsWith('// Ours (T38, SETUP.md "Product-page organisms (T38)"')).toBe(true);
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toMatch(CLIPPING_CLASSES);
    });

    it.each(files)("%s is a client component and says why", (file) => {
      const text = source(file);
      expect(text).toMatch(/^"use client";$/m);
      expect(text.split('"use client"')[0]).toMatch(/client component because/);
    });

    it("never moves on its own: no timer, no autoplay, no animation frame of its own", () => {
      for (const file of files) {
        expect(source(file)).not.toMatch(
          /setInterval|setTimeout|requestAnimationFrame|embla-carousel-autoplay/,
        );
      }
    });

    it("sets embla's duration from the preference and from nothing else", () => {
      const text = source("product-gallery.tsx");
      expect(text).toContain('"(prefers-reduced-motion: reduce)": { duration: 0 }');
      expect(text).not.toMatch(/matchMedia|useReducedMotion/);
    });

    it.each(files)("%s imports no catalog, fixture or registry at run time (D49)", (file) => {
      // A type-only import leaves no trace. The words come in as props and are formatted with
      // `@shopblok/i18n/format`, whose entry does not carry the four catalogs.
      const imported = [
        ...source(file).matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms),
      ].map((match) => match[1] ?? "");
      expect(imported.filter((name) => name === "@shopblok/i18n")).toEqual([]);
      expect(imported.filter((name) => /@shopblok\/(?:registry|fixtures)/.test(name))).toEqual([]);
      expect(imported).toContain("@shopblok/i18n/format");
    });
  });
});
