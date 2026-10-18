// Ours (T37, SETUP.md "Listing organisms (T37)"). The tests of ProductCarousel and its live region,
// in happy-dom with Testing Library: the one region named by its heading, the slides and their
// names, the buttons (44 px, inside the box, disabled at the ends but still focusable), the
// polite status that stays silent on load and speaks after the visitor moves the carousel, the
// reduced-motion behaviour (the buttons jump instead of gliding), and the rule that the carousel
// never moves on its own, in any setting.
// - Embla measures with `offsetWidth`, `offsetLeft` and the rest, which happy-dom answers with 0, so
//   `layout()` gives the viewport 400 px and each of the eight slides 100 px: two pages of four.
//   Embla also asks `IntersectionObserver` which slides are in view, which happy-dom never answers,
//   so `Observer` stands in for it and a test says which slides the observer reports. The motion is
//   the real one: fake timers run embla's animation frames, so a glide and a jump differ in the
//   `transform` of the track one frame after the click.
// - Pixels are not measurable here: the layout at 375, 768 and 1440 px, the arrows' place in the
//   row and the sideways scroller check were done in headless Chromium and by the design system's
//   own checks, which are the lead's.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { ProductCard } from "@shopblok/registry/contracts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findViolations } from "../test-support/class-rules";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { ProductCarousel, type ProductCarouselProps } from "./product-carousel";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);
const SETTLE = 200;

const copyOf = (locale: Locale): ProductCarouselProps["copy"] => ({
  carousel: catalogs[locale].organisms.productCarousel,
  card: catalogs[locale].molecules.productCard,
  priceBlock: catalogs[locale].molecules.priceBlock,
});
const fixture = (locale: Locale) => commerceFixtures[locale].listing.carousel;

function element(locale: Locale = "en", props: Partial<ProductCarouselProps> = {}) {
  return (
    <ProductCarousel
      {...fixture(locale)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}
const setup = (locale: Locale = "en", props?: Partial<ProductCarouselProps>) =>
  render(element(locale, props));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const all = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const tokens = (element: Element | null) => (element?.getAttribute("class") ?? "").split(/\s+/);
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");

const words = (locale: Locale) => catalogs[locale].organisms.productCarousel;
const previousOf = (locale: Locale = "en") =>
  screen.getByRole("button", { name: words(locale).previous });
const nextOf = (locale: Locale = "en") => screen.getByRole("button", { name: words(locale).next });
/** A button that is off: `aria-disabled="true"` (Base UI writes "false" when it is on). */
const off = (button: HTMLElement) => button.getAttribute("aria-disabled") === "true";
const track = () => slot("carousel-content")?.firstElementChild as HTMLElement;
const status = () => slot("product-carousel-status") as HTMLElement;
const said = () => status().textContent;
const showing = (locale: Locale, from: number, to: number, count = 8) =>
  formatMessage(words(locale).showing, { from, to, count }, htmlLang[locale]);

/** The products with a path for a picture: next/image drops `sizes` for a data URI. */
const withPaths = (products: ProductCard[]) =>
  products.map((product) => ({
    ...product,
    images: product.images.map((image, index) => ({
      ...image,
      src: `/media/${product.handle}-${index}.png`,
    })),
  }));

/** The measures embla reads, as they were, so a test can put them back. */
const MEASURES = ["offsetWidth", "offsetHeight", "offsetLeft", "offsetTop"] as const;
const originals = new Map<string, PropertyDescriptor | undefined>();

/**
 * Gives the carousel a size: a viewport of 400 px, slides of 100 px side by side. Embla reads these
 * with `offset*`, and the margin of the last slide from the computed style (which happy-dom leaves
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
  measure("offsetWidth", (node) =>
    inViewport(node) || isTrack(node) ? 400 : isSlide(node) ? 100 : 0,
  );
  measure("offsetHeight", (node) => (inViewport(node) || isTrack(node) || isSlide(node) ? 300 : 0));
  measure("offsetLeft", (node) => (isSlide(node) ? position(node) * 100 : 0));
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

/** Stands in for IntersectionObserver: `show` says which slides are in view, as the browser would. */
class Observer {
  static all: Observer[] = [];
  targets: Element[] = [];
  constructor(private readonly callback: IntersectionObserverCallback) {
    Observer.all.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve() {}
  disconnect() {
    this.targets = [];
  }
  takeRecords() {
    return [];
  }
  /** Reports the slides at these indexes as in view and the rest as out. */
  show(indexes: number[]) {
    const entries = this.targets.map((target, index) => ({
      target,
      isIntersecting: indexes.includes(index),
    }));
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
  static show(indexes: number[]) {
    const live = [...Observer.all].reverse().find((observer) => observer.targets.length > 0);
    if (!live) throw new Error("embla has not observed the slides");
    act(() => live.show(indexes));
  }
}

/** Renders the carousel on a clock the test runs, with a size, an observer and a motion setting. */
function setupMoving({
  reduce = false,
  locale = "en" as Locale,
  props = {} as Partial<ProductCarouselProps>,
} = {}) {
  layout();
  motion(reduce);
  vi.stubGlobal("IntersectionObserver", Observer);
  vi.useFakeTimers();
  return setup(locale, props);
}

/** Lets time pass: the timers and the animation frames run, and React takes what they set. */
const pass = (milliseconds: number) => act(() => void vi.advanceTimersByTime(milliseconds));
const click = (button: HTMLElement) => act(() => void fireEvent.click(button));

beforeEach(() => {
  Observer.all = [];
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  unlayout();
});

describe("ProductCarousel", () => {
  describe.each(LOCALES)("the region and its slides · %s", (locale) => {
    it("is one region named by its heading, with the catalog's word for a carousel", () => {
      setup(locale);
      const title = fixture(locale).title;
      const region = screen.getByRole("region", { name: title });
      expect(region).toBe(slot("product-carousel"));
      expect(region.getAttribute("aria-roledescription")).toBe(words(locale).carousel);
      expect(screen.getAllByRole("region")).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 2, name: title }).id).toBe(
        region.getAttribute("aria-labelledby"),
      );
    });

    it("makes each product a slide that says where it is, in the catalog's words", () => {
      setup(locale);
      const products = fixture(locale).products;
      const slides = screen.getAllByRole("group");
      expect(slides).toHaveLength(products.length);
      for (const [index, slide] of slides.entries()) {
        expect(slide.getAttribute("aria-roledescription")).toBe(words(locale).slide);
        expect(slide.getAttribute("aria-label")).toBe(
          formatMessage(
            words(locale).position,
            { index: index + 1, count: products.length },
            htmlLang[locale],
          ),
        );
        expect(
          within(slide).getByRole("link", { name: products[index]?.title }).getAttribute("href"),
        ).toBe(products[index]?.href);
        expect(slide.querySelectorAll("article[data-slot=product-card]")).toHaveLength(1);
      }
    });

    it("keeps every slide in the reading order, in view or not", () => {
      setup(locale);
      for (const slide of screen.getAllByRole("group")) {
        expect(slide.hasAttribute("aria-hidden")).toBe(false);
        expect(slide.hasAttribute("inert")).toBe(false);
      }
    });

    it("has a view-all link to the listing, and two buttons named by the catalog", () => {
      setup(locale);
      const viewAll = fixture(locale).viewAll;
      expect(screen.getByRole("link", { name: viewAll?.label }).getAttribute("href")).toBe(
        viewAll?.href,
      );
      expect(slot("product-carousel-view-all")?.textContent).toBe(viewAll?.label);
      expect(previousOf(locale)).toBe(slot("carousel-previous"));
      expect(nextOf(locale)).toBe(slot("carousel-next"));
    });
  });

  describe("the heading", () => {
    it("is an h2, with the cards' titles one level deeper, and takes another level", () => {
      const view = setup("en");
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
      view.unmount();
      setup("en", { headingLevel: 4 });
      expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(1);
      expect(screen.getAllByRole("heading", { level: 5 })).toHaveLength(8);
      expect(screen.queryAllByRole("heading", { level: 2 })).toEqual([]);
    });

    it("draws no link to the listing when there is no viewAll", () => {
      setup("en", { viewAll: undefined });
      expect(slot("product-carousel-view-all")).toBeNull();
      expect(screen.getAllByRole("link")).toHaveLength(8);
    });
  });

  describe("the buttons", () => {
    it("are 44 px, round, and in the row of the heading, not 3 rem outside the box", () => {
      setup("en");
      for (const button of [previousOf(), nextOf()]) {
        const classes = tokens(button);
        expect(classes).toContain("size-11");
        expect(classes).toContain("static");
        expect(classes).toContain("my-0");
        expect(classes).not.toContain("absolute");
        expect(classes.some((name) => /^-?(?:start|end)-12$/.test(name))).toBe(false);
        expect(slot("product-carousel-controls")?.contains(button)).toBe(true);
      }
    });

    it("start with Previous off and Next on, off by aria-disabled so that they keep focus", () => {
      setupMoving();
      expect(off(previousOf())).toBe(true);
      expect(previousOf().hasAttribute("disabled")).toBe(false);
      expect(off(nextOf())).toBe(false);
      // A button that is off does not act and does not take a pointer, and looks off.
      expect(tokens(previousOf())).toContain("aria-disabled:pointer-events-none");
      expect(tokens(previousOf())).toContain("aria-disabled:opacity-50");
      previousOf().focus();
      expect(document.activeElement).toBe(previousOf());
      click(previousOf());
      expect(track().style.transform).toBe("translate3d(0px,0px,0px)");
    });

    it("turn Next off at the end and Previous on, and come back", () => {
      setupMoving();
      click(nextOf());
      expect(off(previousOf())).toBe(false);
      expect(off(nextOf())).toBe(true);
      nextOf().focus();
      expect(document.activeElement).toBe(nextOf());
      click(previousOf());
      expect(off(previousOf())).toBe(true);
      expect(off(nextOf())).toBe(false);
    });

    it("move by a page: with four in view, Next shows the next four", () => {
      setupMoving({ reduce: true });
      click(nextOf());
      expect(track().style.transform).toBe("translate3d(-400px,0px,0px)");
      click(previousOf());
      expect(track().style.transform).toBe("translate3d(0px,0px,0px)");
    });

    it("answer the arrow keys the primitive gives", () => {
      setupMoving({ reduce: true });
      const link = within(screen.getAllByRole("group")[0] as HTMLElement).getByRole("link");
      act(() => void fireEvent.keyDown(link, { key: "ArrowRight" }));
      expect(track().style.transform).toBe("translate3d(-400px,0px,0px)");
      act(() => void fireEvent.keyDown(link, { key: "ArrowLeft" }));
      expect(track().style.transform).toBe("translate3d(0px,0px,0px)");
    });

    it("show a card that was out of view when Tab reaches it (embla's watchFocus, on)", () => {
      setupMoving({ reduce: true });
      const slides = screen.getAllByRole("group");
      const last = within(slides[7] as HTMLElement).getByRole("link");
      act(() => void fireEvent.keyDown(document, { key: "Tab", code: "Tab" }));
      act(() => last.focus());
      expect(track().style.transform).toBe("translate3d(-400px,0px,0px)");
      expect(off(previousOf())).toBe(false);
    });

    it("leave a card that a script or a click focused where it is", () => {
      setupMoving({ reduce: true });
      const slides = screen.getAllByRole("group");
      const last = within(slides[7] as HTMLElement).getByRole("link");
      act(() => last.focus());
      expect(track().style.transform).toBe("translate3d(0px,0px,0px)");
    });
  });

  describe("the live region", () => {
    it("is a polite status in the markup from the first render, empty, and out of sight", () => {
      setup("en");
      const region = status();
      expect(region.getAttribute("role")).toBe("status");
      expect(region.getAttribute("aria-live")).toBe("polite");
      expect(region.textContent).toBe("");
      expect(tokens(region)).toContain("sr-only");
      expect(screen.getByRole("status")).toBe(region);
      // Inside the carousel's region, after the slides, so that it is named by being in it.
      expect(slot("product-carousel")?.lastElementChild).toBe(region);
    });

    it("says nothing on load, however the slides come into view", () => {
      setupMoving();
      Observer.show([0, 1, 2, 3]);
      pass(5000);
      expect(said()).toBe("");
      Observer.show([0, 1, 2, 3, 4]);
      pass(5000);
      expect(said()).toBe("");
    });

    it("says which products are in view after Next, once the carousel has settled", () => {
      setupMoving();
      click(nextOf());
      pass(SETTLE - 50);
      expect(said()).toBe("");
      Observer.show([4, 5, 6, 7]);
      pass(SETTLE - 1);
      expect(said()).toBe("");
      pass(1);
      expect(said()).toBe("Showing 5 to 8 of 8");
    });

    it("says the last position when the visitor presses more than once", () => {
      setupMoving();
      click(nextOf());
      Observer.show([4, 5, 6, 7]);
      pass(SETTLE / 2);
      click(previousOf());
      Observer.show([0, 1, 2, 3]);
      pass(SETTLE);
      expect(said()).toBe("Showing 1 to 4 of 8");
    });

    it("speaks after the arrow keys and after Tab into a card out of view", () => {
      setupMoving({ reduce: true });
      const link = within(screen.getAllByRole("group")[0] as HTMLElement).getByRole("link");
      act(() => void fireEvent.keyDown(link, { key: "ArrowRight" }));
      Observer.show([4, 5, 6, 7]);
      pass(SETTLE);
      expect(said()).toBe("Showing 5 to 8 of 8");
      act(() => void fireEvent.keyDown(link, { key: "ArrowLeft" }));
      Observer.show([0, 1, 2, 3]);
      pass(SETTLE);
      expect(said()).toBe("Showing 1 to 4 of 8");
      const last = within(screen.getAllByRole("group")[7] as HTMLElement).getByRole("link");
      act(() => void fireEvent.keyDown(document, { key: "Tab", code: "Tab" }));
      act(() => last.focus());
      Observer.show([4, 5, 6, 7]);
      pass(SETTLE);
      expect(said()).toBe("Showing 5 to 8 of 8");
    });

    it.each(LOCALES)("says it in the catalog's words and numbers · %s", (locale) => {
      setupMoving({ locale });
      click(nextOf(locale));
      Observer.show([4, 5, 6, 7]);
      pass(SETTLE);
      expect(said()).toBe(showing(locale, 5, 8));
      expect(said()).toMatch(/5\D+8\D+8/);
    });

    it("counts the products the carousel holds, not the ones in the fixture", () => {
      const products = fixture("en").products.slice(0, 6);
      setupMoving({ props: { products } });
      click(nextOf());
      Observer.show([2, 3, 4, 5]);
      pass(SETTLE);
      expect(said()).toBe("Showing 3 to 6 of 6");
    });
  });

  describe("motion", () => {
    it("jumps under prefers-reduced-motion: the track is in place the moment Next is pressed", () => {
      setupMoving({ reduce: true });
      click(nextOf());
      expect(track().style.transform).toBe("translate3d(-400px,0px,0px)");
      pass(16);
      expect(track().style.transform).toBe("translate3d(-400px,0px,0px)");
    });

    it("glides otherwise: a frame after Next the track is on its way, and it arrives", () => {
      setupMoving({ reduce: false });
      click(nextOf());
      pass(16);
      const x = Number.parseFloat(
        /translate3d\((-?[\d.]+)px/.exec(track().style.transform)?.[1] ?? "",
      );
      expect(x).toBeLessThan(0);
      expect(x).toBeGreaterThan(-400);
      pass(2000);
      expect(track().style.transform).toBe("translate3d(-400px,0px,0px)");
    });

    it("sets embla's duration from the preference and from nothing else", () => {
      const text = source("product-carousel.tsx");
      expect(text).toContain('"(prefers-reduced-motion: reduce)": { duration: 0 }');
      expect(text).not.toMatch(/matchMedia|useReducedMotion|useState|useEffect/);
    });

    it("a carousel that autoplays under reduced motion fails: left alone, it stays on the first slide", () => {
      setupMoving({ reduce: true });
      const slides = screen.getAllByRole("group");
      expect(slides).toHaveLength(8);
      // A minute, well past any autoplay delay (embla's plugin defaults to 4 s).
      pass(60_000);
      expect(track().style.transform).toBe("translate3d(0px,0px,0px)");
      expect(off(previousOf())).toBe(true);
      expect(off(nextOf())).toBe(false);
      expect(said()).toBe("");
    });

    it("does not autoplay in any setting, either: left alone for a minute it has not moved", () => {
      setupMoving({ reduce: false });
      pass(60_000);
      expect(track().style.transform).toBe("translate3d(0px,0px,0px)");
      expect(off(previousOf())).toBe(true);
      expect(said()).toBe("");
    });

    it("moves only when the visitor does, once, and stays where they left it", () => {
      setupMoving({ reduce: true });
      click(nextOf());
      pass(60_000);
      expect(track().style.transform).toBe("translate3d(-400px,0px,0px)");
      expect(off(nextOf())).toBe(true);
    });

    it("has no timer and no autoplay plugin in its files", () => {
      for (const file of ["product-carousel.tsx", "product-carousel-client.tsx"]) {
        expect(source(file)).not.toMatch(
          /setInterval|requestAnimationFrame|embla-carousel-autoplay/,
        );
      }
    });
  });

  describe("the slides", () => {
    it("are about two to a phone, three from md and four from lg", () => {
      setup("en");
      for (const slide of screen.getAllByRole("group")) {
        const classes = tokens(slide);
        expect(classes).toContain("basis-[44%]");
        expect(classes).toContain("md:basis-1/3");
        expect(classes).toContain("lg:basis-1/4");
        // The primitive's full-width basis is replaced, not left to fight.
        expect(classes).not.toContain("basis-full");
      }
    });

    it("give the picture the width its column has", () => {
      setup("en", { products: withPaths(fixture("en").products) });
      const images = [...document.querySelectorAll("img")];
      expect(images.length).toBeGreaterThan(0);
      for (const image of images) {
        expect(image.getAttribute("sizes")).toBe(
          "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 44vw",
        );
      }
    });

    it("leave room for a focus ring inside the clip, and clip nothing else", () => {
      setup("en");
      const classes = tokens(track());
      expect(classes).toContain("py-1");
      expect(classes).toContain("pe-1");
      expect(classes).toContain("-ms-3");
      const viewport = slot("carousel-content");
      expect(tokens(viewport)).toContain("overflow-hidden");
      expect(tokens(viewport)).not.toContain("overflow-x-auto");
      expect(tokens(viewport)).not.toContain("overflow-auto");
    });
  });

  describe("the cards", () => {
    it("take the quick-add form of the grid, and its status by product id", () => {
      const products = fixture("en").products;
      setup("en", {
        variant: "quick-add",
        quickAdd: {
          action: "/add",
          status: { [products[0]?.id ?? ""]: "added" },
        },
      });
      const forms = document.querySelectorAll("form");
      expect(forms.length).toBeGreaterThan(0);
      expect(forms[0]?.getAttribute("action")).toBe("/add");
    });

    it("are the variant's, ten of them: a variant is the cards' look and nothing else", () => {
      for (const variant of ["standard", "swatches", "minimal", "compact", "bordered"] as const) {
        const view = setup("en", { variant });
        expect(screen.getAllByRole("group")).toHaveLength(8);
        expect(document.querySelectorAll("article[data-slot=product-card]")).toHaveLength(8);
        view.unmount();
      }
    });
  });

  describe("prefetch (every story passes false: the pages answer 404 until M3)", () => {
    const prefetchOf = () =>
      screen.getAllByRole("link").map((link) => link.getAttribute("data-prefetch"));

    it("reaches every link: the cards' and the view-all link", () => {
      setup("en", { prefetch: false });
      expect(prefetchOf()).toHaveLength(9);
      expect(new Set(prefetchOf())).toEqual(new Set(["false"]));
    });

    it("is left to Next when it is not given", () => {
      setup("en", { prefetch: undefined });
      expect(new Set(prefetchOf())).toEqual(new Set(["undefined"]));
    });
  });

  describe.each(["de", "el"] as const)("a long %s title", (locale) => {
    it("is the link's name in full, and the carousel cuts nothing", () => {
      const long = commerceFixtures[locale].long.product;
      const { container } = setup(locale, {
        title: commerceFixtures[locale].long.product.title,
        products: [long, ...fixture(locale).products.slice(1)],
      });
      expect(screen.getByRole("link", { name: long.title })).toBeTruthy();
      for (const part of [
        slot("product-carousel"),
        slot("product-carousel-header"),
        slot("product-carousel-title"),
        slot("product-carousel-controls"),
        slot("product-carousel-view-all"),
        track(),
        ...all("carousel-item"),
      ]) {
        expect(part?.className).not.toMatch(CLIPPING_CLASSES);
      }
      // The heading and the link wrap anywhere; only the card's own title clamp cuts (T32).
      expect(tokens(slot("product-carousel-title"))).toContain("wrap-anywhere");
      expect(tokens(slot("product-carousel-view-all"))).toContain("wrap-anywhere");
      expect(container.querySelectorAll("[data-truncate]").length).toBeGreaterThan(0);
    });

    it("keeps the buttons the same size, wherever the heading breaks", () => {
      setup(locale, { title: commerceFixtures[locale].long.product.title });
      for (const button of [previousOf(locale), nextOf(locale)]) {
        expect(tokens(button)).toContain("size-11");
      }
      expect(tokens(slot("product-carousel-title"))).toContain("min-w-0");
      expect(tokens(slot("product-carousel-header"))).toContain("flex-wrap");
    });
  });

  describe("the files", () => {
    const files = ["product-carousel.tsx", "product-carousel-client.tsx"];

    it.each(files)("%s keeps the class rules: tokens, logical properties, light only", (file) => {
      expect(findViolations(source(file))).toEqual([]);
    });

    it.each(files)("%s opens with the T37 header, uses no em dash and cuts nothing", (file) => {
      const text = source(file);
      expect(text.startsWith('// Ours (T37, SETUP.md "Listing organisms (T37)"')).toBe(true);
      expect(text).not.toContain(EM_DASH);
      expect(text).not.toMatch(CLIPPING_CLASSES);
    });

    it("keeps the carousel a server component and the status the one client part of its own", () => {
      expect(source("product-carousel.tsx")).not.toMatch(/^"use client";?$/m);
      expect(source("product-carousel.tsx")).not.toMatch(/\buse(?:State|Effect|Ref|Reducer)\b/);
      expect(source("product-carousel-client.tsx")).toMatch(/^"use client";$/m);
      expect(source("product-carousel-client.tsx").split('"use client"')[0]).toMatch(
        /client component because/,
      );
    });

    it("hands embla plain data, so that the server can pass it to the client primitive", () => {
      const text = source("product-carousel.tsx");
      const options = /const OPTIONS[^=]*= (\{[\s\S]*?\n\});/.exec(text)?.[1] ?? "";
      expect(options).toContain('slidesToScroll: "auto"');
      expect(options).toContain('containScroll: "trimSnaps"');
      expect(options).not.toMatch(/=>|function/);
    });
  });
});
