// Ours (T38, SETUP.md "Product-page organisms (T38)"). MobileStickyATC's tests, in Testing Library
// and happy-dom: nothing drawn until the watched element has left the window (a stand-in
// IntersectionObserver reports it, since happy-dom has no layout; the observer's root is the band
// above the window's top edge, so "wholly in the band" is "scrolled past", and a jump over the
// button is reported as well as a slow scroll, which headless Chromium showed by hand), the bar
// going again when it comes back, the region and its parts in the four locales, the three actions (a submit button joined to
// the buy box's form, a link to its options, the words alone), what the bar does to a box that is
// not complete, the height reserved at the end of the page, the box (fixed to the bottom, on the
// sticky layer, clear of the home indicator, hidden from `md`), the 44 px controls, a long German
// and Greek title and label, the server's markup and a read of the file's imports (D49). Pixels are
// not measurable here: the layout and the real sizes belong to the design-system job's browser
// checks, which the lead runs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { formatList } from "@shopblok/i18n/format";
import type { MobileStickyATC as MobileStickyATCContent } from "@shopblok/registry/contracts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { BuyBox } from "./buy-box";
import { MobileStickyATC, type MobileStickyATCProps } from "./mobile-sticky-atc";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);

type State = "ready" | "incomplete" | "soldOut";
const STATES: readonly State[] = ["ready", "incomplete", "soldOut"];
const fixture = (locale: Locale, state: State): MobileStickyATCContent =>
  commerceFixtures[locale].productPage.sticky[state];

function copyOf(locale: Locale): MobileStickyATCProps["copy"] {
  return {
    mobileStickyAtc: catalogs[locale].organisms.mobileStickyAtc,
    priceBlock: catalogs[locale].molecules.priceBlock,
  };
}

function bar(locale: Locale, state: State, props: Partial<MobileStickyATCProps> = {}) {
  return (
    <MobileStickyATC
      {...fixture(locale, state)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      watch="buy-add"
      formId="buy-form"
      optionsHref="#buy-options"
      {...props}
    />
  );
}

/** The page: the button the bar watches, and the bar. */
function Page({
  locale = "en",
  state = "ready",
  props,
  watched = true,
}: {
  locale?: Locale;
  state?: State;
  props?: Partial<MobileStickyATCProps>;
  watched?: boolean;
}) {
  return (
    <>
      {watched ? (
        <button type="button" id="buy-add">
          The buy box's button
        </button>
      ) : null}
      {bar(locale, state, props)}
    </>
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const region = () => slot("mobile-sticky-atc");
const tokens = (node: Element | null) => (node?.getAttribute("class") ?? "").split(/\s+/);
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");
/** Intl and the catalogs may write a no-break space, a narrow one or a word joiner. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s⁠]+/g, " ").trim();

// happy-dom has no layout, so no IntersectionObserver that would report one. This stand-in keeps
// what was observed and lets a test say what the browser would have reported.
class FakeObserver {
  static all: FakeObserver[] = [];
  targets = new Set<Element>();
  disconnected = false;
  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit | undefined,
  ) {
    FakeObserver.all.push(this);
  }
  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  report(...reports: { isIntersecting: boolean; intersectionRatio: number }[]) {
    const entries = reports.flatMap((each) =>
      [...this.targets].map((target) => ({ target, ...each })),
    );
    this.callback(entries as unknown as IntersectionObserverEntry[], this as never);
  }
}
const live = () => FakeObserver.all.filter((observer) => !observer.disconnected);
// The observer's root is the band above the window, so what it reports is how much of the watched
// button is in that band: all of it once the button has scrolled past the top edge, a part while it
// is leaving, none while it is in the window or below it.
/** The button has scrolled above the window (wholly in the band). */
const above = { isIntersecting: true, intersectionRatio: 1 };
/** The button is leaving at the top edge: a part of it is still in the window. */
const leaving = { isIntersecting: true, intersectionRatio: 0.4 };
/** The button is in the window, or below it: nowhere in the band. */
const inside = { isIntersecting: false, intersectionRatio: 0 };
const below = inside;
function report(...reports: { isIntersecting: boolean; intersectionRatio: number }[]) {
  act(() => {
    for (const observer of live()) observer.report(...reports);
  });
}

beforeEach(() => {
  FakeObserver.all = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("style");
});

describe("MobileStickyATC: when it is drawn", () => {
  it("draws nothing at first, and watches the element it is told to", () => {
    const { container } = render(<Page />);
    expect(region()).toBeNull();
    expect(container.querySelector("section")).toBeNull();
    expect(live()).toHaveLength(1);
    expect([...(live()[0]?.targets ?? [])]).toEqual([document.getElementById("buy-add")]);
  });

  it("appears when the watched element has scrolled above the window", () => {
    render(<Page />);
    report(above);
    expect(region()).not.toBeNull();
    expect(screen.getByRole("region", { name: "Buy this product" })).toBe(region());
  });

  it("goes when the element comes back into the window, and comes again when it leaves", () => {
    render(<Page />);
    report(above);
    expect(region()).not.toBeNull();
    report(inside);
    expect(region()).toBeNull();
    report(above);
    expect(region()).not.toBeNull();
  });

  it("is not drawn while the element is still below the window", () => {
    render(<Page />);
    report(below);
    expect(region()).toBeNull();
  });

  it("is not drawn while a part of the element is still in the window, and comes when the last of it has gone", () => {
    render(<Page />);
    report(leaving);
    expect(region()).toBeNull();
    report(above);
    expect(region()).not.toBeNull();
    report(leaving);
    expect(region()).toBeNull();
  });

  it("is drawn when a jump takes the element from below the window to above it", () => {
    // An observer reports only a change, so what it is asked is whether the element is in the band
    // above the window: out before the jump, in after it. Asked "not intersecting, top above 0" it
    // would say nothing for a button that was never in the window (the "128 reviews" link, a hash).
    render(<Page />);
    report(below);
    expect(region()).toBeNull();
    report(above);
    expect(region()).not.toBeNull();
    report(below);
    expect(region()).toBeNull();
  });

  it("asks the browser about the band above the window's top edge, not about the window", () => {
    render(<Page />);
    const { options } = live()[0] as FakeObserver;
    expect(options?.rootMargin).toBe("100000px 0px -100% 0px");
    expect(options?.threshold).toEqual([0, 1]);
    expect(options?.root).toBeUndefined();
  });

  it("goes by the newest report when several arrive together", () => {
    render(<Page />);
    report(above, inside);
    expect(region()).toBeNull();
    report(inside, above);
    expect(region()).not.toBeNull();
  });

  it("is not drawn, and does not fail, when the element is not in the page", () => {
    render(<Page watched={false} />);
    expect(live()).toHaveLength(0);
    expect(region()).toBeNull();
  });

  it("is not drawn, and does not fail, where there is no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Page />);
    expect(region()).toBeNull();
  });

  it("stops watching when it unmounts, and watches the new element when `watch` changes", () => {
    const { rerender, unmount } = render(<Page />);
    const first = live()[0];
    rerender(
      <>
        <button type="button" id="other">
          Other
        </button>
        <Page props={{ watch: "other" }} />
      </>,
    );
    expect(first?.disconnected).toBe(true);
    expect(live()).toHaveLength(1);
    expect([...(live()[0]?.targets ?? [])]).toEqual([document.getElementById("other")]);
    unmount();
    expect(live()).toHaveLength(0);
  });

  it("draws nothing on the server, so the markup the browser hydrates is the buy box's alone", () => {
    expect(renderToString(<Page />)).not.toContain("mobile-sticky-atc");
    expect(renderToString(bar("en", "ready"))).toBe("");
  });

  it("draws whatever the scroll with forceVisible, observes nothing, and hides from nothing", () => {
    render(<Page props={{ forceVisible: true }} />);
    expect(region()).not.toBeNull();
    expect(live()).toHaveLength(0);
    // The design system draws it at 768 and 1440 px too, so the class that hides it is not there.
    expect(tokens(region())).not.toContain("md:hidden");
  });
});

describe("MobileStickyATC: the region and its parts", () => {
  describe.each(LOCALES)("%s", (locale) => {
    it("is a region named by the catalog, with the picture, the title, the price and the choice", () => {
      const content = fixture(locale, "ready");
      render(<Page locale={locale} props={{ forceVisible: true }} />);
      const section = screen.getByRole("region", {
        name: catalogs[locale].organisms.mobileStickyAtc.region,
      });
      expect(section).toBe(region());
      expect(section.tagName).toBe("SECTION");
      expect(slot("mobile-sticky-atc-title")?.textContent).toBe(content.title);
      expect(slot("price-block", section)).not.toBeNull();
      expect(slot("mobile-sticky-atc-choice")?.textContent).toBe(
        formatList(content.choice, htmlLang[locale], "unit"),
      );
      // The picture is decoration: the title next to it says what it shows.
      const image = section.querySelector("img");
      expect(image?.getAttribute("alt")).toBe("");
    });

    it("adds the chosen variant with a button that belongs to the buy box's form, when ready", () => {
      render(<Page locale={locale} state="ready" props={{ forceVisible: true }} />);
      const button = screen.getByRole("button", {
        name: catalogs[locale].organisms.mobileStickyAtc.add,
      });
      expect(button).toBe(slot("mobile-sticky-atc-add"));
      expect(button.getAttribute("type")).toBe("submit");
      expect(button.getAttribute("form")).toBe("buy-form");
      expect(screen.queryByRole("link")).toBeNull();
    });

    it("links to the buy box's options, when a choice is missing", () => {
      render(<Page locale={locale} state="incomplete" props={{ forceVisible: true }} />);
      const link = screen.getByRole("link", {
        name: catalogs[locale].organisms.mobileStickyAtc.choose,
      });
      expect(link).toBe(slot("mobile-sticky-atc-choose"));
      expect(link.getAttribute("href")).toBe("#buy-options");
      expect(link.tagName).toBe("A");
      expect(within(region() as HTMLElement).queryByRole("button")).toBeNull();
    });

    it("says sold out in words, with nothing to press, when it cannot be bought", () => {
      render(<Page locale={locale} state="soldOut" props={{ forceVisible: true }} />);
      const words = slot("mobile-sticky-atc-sold-out");
      expect(words?.textContent).toBe(catalogs[locale].organisms.mobileStickyAtc.soldOut);
      expect(within(region() as HTMLElement).queryByRole("button")).toBeNull();
      expect(within(region() as HTMLElement).queryByRole("link")).toBeNull();
    });
  });

  it("names a choice with one value, and leaves the line out when there is none", () => {
    const { rerender } = render(<Page state="incomplete" props={{ forceVisible: true }} />);
    expect(slot("mobile-sticky-atc-choice")?.textContent).toBe("Oatmeal");
    rerender(<Page state="incomplete" props={{ forceVisible: true, choice: [] }} />);
    expect(slot("mobile-sticky-atc-choice")).toBeNull();
  });

  it("joins a two-value choice as the unit list does", () => {
    render(<Page state="ready" props={{ forceVisible: true }} />);
    expect(slot("mobile-sticky-atc-choice")?.textContent).toBe("Black, M");
  });

  it("draws without a picture when the content has none", () => {
    render(<Page props={{ forceVisible: true, image: undefined }} />);
    expect(region()?.querySelector("img")).toBeNull();
  });

  it("carries its status for a style or a check to read", () => {
    const { rerender } = render(<Page state="ready" props={{ forceVisible: true }} />);
    expect(region()?.getAttribute("data-status")).toBe("ready");
    rerender(<Page state="incomplete" props={{ forceVisible: true }} />);
    expect(region()?.getAttribute("data-status")).toBe("incomplete");
    rerender(<Page state="soldOut" props={{ forceVisible: true }} />);
    expect(region()?.getAttribute("data-status")).toBe("sold-out");
  });

  it.each(STATES)("has no id of its own, so many bars on one page never collide: %s", (state) => {
    render(<Page state={state} props={{ forceVisible: true }} />);
    expect(region()?.hasAttribute("id")).toBe(false);
    expect(region()?.querySelectorAll("[id]")).toHaveLength(0);
  });
});

describe("MobileStickyATC: with the buy box", () => {
  function Together({ action }: { action: (formData: FormData) => void }) {
    const box = commerceFixtures.en.productPage.buyBox.empty;
    return (
      <>
        <BuyBox
          {...box}
          copy={{
            buyBox: catalogs.en.organisms.buyBox,
            variantSelector: catalogs.en.molecules.variantSelector,
            priceBlock: catalogs.en.molecules.priceBlock,
            quantityStepper: catalogs.en.atoms.quantityStepper,
            stock: catalogs.en.atoms.stock,
            rating: catalogs.en.atoms.rating,
          }}
          locale="en-US"
          action={action}
          formId="buy-form"
          optionsId="buy-options"
          buttonId="buy-add"
        />
        {bar("en", "ready", { forceVisible: true })}
      </>
    );
  }

  it("submits the buy box's form, and the box stops it while an option is missing", async () => {
    const action = vi.fn();
    render(<Together action={action} />);
    const user = userEvent.setup();
    const button = slot("mobile-sticky-atc-add") as HTMLButtonElement;
    expect(button.closest("form")).toBeNull();
    expect((button as HTMLButtonElement).form).toBe(document.getElementById("buy-form"));
    await user.click(button);
    expect(action).not.toHaveBeenCalled();
    // Focus goes to the first option that is missing, as it does from the box's own button.
    expect(document.activeElement?.getAttribute("role")).toBe("radio");
    expect(document.getElementById("buy-options")?.contains(document.activeElement)).toBe(true);
  });

  it("adds exactly the choice the box holds once it is complete", async () => {
    const action = vi.fn();
    render(<Together action={action} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Forest green" }));
    await user.click(screen.getByRole("radio", { name: "L" }));
    await user.click(slot("mobile-sticky-atc-add") as HTMLElement);
    expect(action).toHaveBeenCalledTimes(1);
    expect(Object.fromEntries((action.mock.calls[0]?.[0] as FormData).entries())).toMatchObject({
      "options.colour": "colour-forest",
      "options.size": "size-l",
      variantId: "var_heritage_hoodie_forest_l",
    });
  });

  it("links to the id the box gives its options", () => {
    render(<Together action={vi.fn()} />);
    expect(document.getElementById("buy-options")?.getAttribute("data-slot")).toBe(
      "buy-box-options",
    );
  });
});

describe("MobileStickyATC: the height kept clear at the end of the page (WCAG 2.4.11)", () => {
  const root = () => document.documentElement;
  const padding = () => root().style.getPropertyValue("padding-block-end");
  const scrollPadding = () => root().style.getPropertyValue("scroll-padding-block-end");

  function measure(height: number) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const own = this.getAttribute("data-slot") === "mobile-sticky-atc" ? height : 0;
      return {
        height: own,
        width: 375,
        top: 0,
        left: 0,
        right: 375,
        bottom: own,
        x: 0,
        y: 0,
      } as DOMRect;
    });
  }

  it("reserves the bar's height while it is drawn, and gives it back when it goes", () => {
    measure(88);
    render(<Page />);
    expect(padding()).toBe("");
    report(above);
    expect(padding()).toBe("88px");
    expect(scrollPadding()).toBe("88px");
    report(inside);
    expect(padding()).toBe("");
    expect(scrollPadding()).toBe("");
  });

  it("gives it back when the bar unmounts, and the page's own value with it", () => {
    root().style.setProperty("padding-block-end", "8px");
    measure(72);
    const view = render(<Page />);
    report(above);
    expect(padding()).toBe("72px");
    view.unmount();
    expect(padding()).toBe("8px");
  });

  it("reserves nothing for a bar the design system forces into its box", () => {
    measure(88);
    render(<Page props={{ forceVisible: true }} />);
    expect(padding()).toBe("");
    expect(scrollPadding()).toBe("");
  });

  it("uses the same function as the cookie banner and the compare tray", () => {
    expect(source("mobile-sticky-atc.tsx")).toContain('from "./cookie-consent-reserve"');
    expect(source("cookie-consent.tsx")).toContain('from "./cookie-consent-reserve"');
  });
});

describe("MobileStickyATC: the box and the 44 px controls", () => {
  it("is fixed to the bottom of the window, on the sticky layer, clear of the home indicator", () => {
    render(<Page props={{ forceVisible: false }} />);
    report(above);
    const classes = tokens(region());
    expect(classes).toEqual(expect.arrayContaining(["fixed", "inset-x-0", "bottom-0"]));
    expect(classes).toContain("z-(--z-sticky)");
    expect(classes).toContain("md:hidden");
    expect(classes).toContain("bg-background");
    expect(classes).toContain("border-t");
    // It scrolls inside itself rather than cover a short window.
    expect(classes).toContain("max-h-[60dvh]");
    expect(classes).toContain("overflow-y-auto");
    const inner = region()?.firstElementChild as HTMLElement;
    expect(tokens(inner).some((each) => each.includes("env(safe-area-inset-bottom)"))).toBe(true);
  });

  it("takes the class the design system gives it, after its own", () => {
    render(<Page props={{ forceVisible: true, className: "absolute" }} />);
    expect(tokens(region())).toContain("absolute");
    expect(tokens(region()).indexOf("absolute")).toBeGreaterThan(tokens(region()).indexOf("fixed"));
  });

  it("makes its button and its link 44 px tall", () => {
    const { rerender } = render(<Page state="ready" props={{ forceVisible: true }} />);
    expect(tokens(slot("mobile-sticky-atc-add"))).toContain("min-h-11");
    rerender(<Page state="incomplete" props={{ forceVisible: true }} />);
    expect(tokens(slot("mobile-sticky-atc-choose"))).toContain("min-h-11");
  });

  it("gives the link and the button the focus ring at full strength", () => {
    const { rerender } = render(<Page state="ready" props={{ forceVisible: true }} />);
    expect(tokens(slot("mobile-sticky-atc-add"))).toContain("focus-visible:ring-ring");
    rerender(<Page state="incomplete" props={{ forceVisible: true }} />);
    expect(tokens(slot("mobile-sticky-atc-choose"))).toContain("focus-visible:ring-ring");
  });

  it("takes no focus when it appears", () => {
    render(<Page />);
    (document.getElementById("buy-add") as HTMLElement).focus();
    const before = document.activeElement;
    report(above);
    expect(region()).not.toBeNull();
    expect(document.activeElement).toBe(before);
  });

  it("is reached by Tab, in the order of the page", async () => {
    render(<Page state="ready" props={{ forceVisible: true }} />);
    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(document.getElementById("buy-add"));
    await user.tab();
    expect(document.activeElement).toBe(slot("mobile-sticky-atc-add"));
  });

  it("presses its link like any link", () => {
    render(<Page state="incomplete" props={{ forceVisible: true }} />);
    const clicks: string[] = [];
    document.addEventListener("click", (event) => {
      const anchor = (event.target as Element).closest("a");
      if (anchor !== null) {
        clicks.push(anchor.getAttribute("href") ?? "");
        event.preventDefault();
      }
    });
    fireEvent.click(slot("mobile-sticky-atc-choose") as HTMLElement);
    expect(clicks).toEqual(["#buy-options"]);
  });
});

describe("MobileStickyATC: long labels", () => {
  it.each(longLabels)(
    "wraps a long %s title, choice and button, and cuts nothing",
    (locale, long) => {
      const content = fixture(locale, "ready");
      const copy = copyOf(locale);
      render(
        <Page
          locale={locale}
          props={{
            forceVisible: true,
            title: long.productName,
            choice: [long.optionLabel, long.chipLabel],
            copy: {
              ...copy,
              mobileStickyAtc: { ...copy.mobileStickyAtc, add: long.action, region: long.hint },
            },
            price: content.price,
          }}
        />,
      );
      expect(
        classesIn(region() as HTMLElement).filter((each) => CLIPPING_CLASSES.test(each)),
      ).toEqual([]);
      expect(screen.getByRole("region", { name: long.hint })).toBe(region());
      expect(slot("mobile-sticky-atc-title")?.textContent).toBe(long.productName);
      expect(tokens(slot("mobile-sticky-atc-title"))).toContain("wrap-anywhere");
      expect(plain(slot("mobile-sticky-atc-choice")?.textContent)).toContain(long.optionLabel);
      expect(tokens(slot("mobile-sticky-atc-choice"))).toContain("wrap-anywhere");
      expect(slot("mobile-sticky-atc-add")?.textContent).toBe(long.action);
      expect(tokens(slot("mobile-sticky-atc-add"))).toEqual(
        expect.arrayContaining(["w-full", "max-w-full", "wrap-anywhere"]),
      );
    },
  );

  it.each(longLabels)("wraps a long %s link and sold out text", (locale, long) => {
    const copy = copyOf(locale);
    const longCopy = {
      ...copy,
      mobileStickyAtc: { ...copy.mobileStickyAtc, choose: long.action, soldOut: long.helpText },
    };
    const { rerender } = render(
      <Page locale={locale} state="incomplete" props={{ forceVisible: true, copy: longCopy }} />,
    );
    expect(tokens(slot("mobile-sticky-atc-choose"))).toEqual(
      expect.arrayContaining(["max-w-full", "wrap-anywhere"]),
    );
    expect(slot("mobile-sticky-atc-choose")?.textContent).toBe(long.action);
    rerender(
      <Page locale={locale} state="soldOut" props={{ forceVisible: true, copy: longCopy }} />,
    );
    expect(slot("mobile-sticky-atc-sold-out")?.textContent).toBe(long.helpText);
    expect(
      classesIn(region() as HTMLElement).filter((each) => CLIPPING_CLASSES.test(each)),
    ).toEqual([]);
  });
});

describe("MobileStickyATC: the file (D49)", () => {
  const runtimeImports = (text: string) =>
    [...text.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms)].map(
      (match) => match[1] ?? "",
    );

  it("is a client component that imports no catalog, no registry and no fixture", () => {
    const text = source("mobile-sticky-atc.tsx");
    expect(text).toMatch(/^"use client";?$/m);
    const imported = runtimeImports(text);
    expect(imported.filter((each) => each === "@shopblok/i18n")).toEqual([]);
    expect(imported.filter((each) => /@shopblok\/(?:registry|fixtures)/.test(each))).toEqual([]);
    expect(imported).toContain("@shopblok/i18n/format");
  });

  it("writes no em dash", () => {
    for (const name of ["mobile-sticky-atc.tsx", "mobile-sticky-atc.test.tsx"]) {
      expect(source(name)).not.toContain(EM_DASH);
    }
  });
});
