// Ours (T36, SETUP.md "Footers and site organisms (T36)").
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { CookieConsent } from "@shopblok/ui/organisms/cookie-consent";
import { LoadingSkeleton } from "@shopblok/ui/organisms/loading-skeletons";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VisitorCookieConsent } from "../../lib/visitor/cookie-consent";
import { OverlayBox } from "../components/overlay-box";
import { VisitorFixture } from "../components/visitor-fixture";
import { createContext } from "../context";
import { siteOrganismStories } from "./organisms-site";

// The stories of CookieConsent and the loading skeletons (T36; D40, D44, D45): the states the task
// lists are there, each shows what its description says in every locale, every region of the page
// is named apart, nothing in a state moves, every link is told not to prefetch, and the props that
// reach a client part serialize, because a story renders on the server. A story renders to static
// markup here (the storefront's tests have no DOM), so what the banner does when it is used is the
// ui package's test, what the island does with the store is `lib/visitor/cookie-consent.test.tsx`,
// and where the boxes' heights come from is the design-system job's browser check (and the report
// of the Chromium measurements, in the comments of the constants below).

/** The one character the house style leaves out of every sentence. */
const EM_DASH = String.fromCharCode(0x2014);

type Id = keyof typeof siteOrganismStories;

const consent = "organisms/cookie-consent";
const skeletons = "organisms/loading-skeletons";

const story = (id: Id) => siteOrganismStories[id];
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
const site = (locale: Locale) => commerceFixtures[locale].site.cookieConsent;
const copyOf = (locale: Locale) => catalogs[locale].organisms.cookieConsent;

/** The elements a story returns are the components themselves: their props are what the story chose. */
function rendered<Props>(node: ReactNode, type: unknown): ReactElement<Props> {
  if (!isValidElement<Props>(node) || node.type !== type) throw new Error("not the component");
  return node;
}
/** What is inside the overlay box a story draws. */
function boxed(node: ReactNode): { height: number; name: string; children: ReactElement[] } {
  const box = rendered<ComponentProps<typeof OverlayBox>>(node, OverlayBox);
  return {
    height: box.props.height ?? 480,
    name: box.props.name,
    children: Children.toArray(box.props.children).filter(isValidElement),
  };
}
const consentNode = (stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  return stateId === undefined ? story(consent).live(ctx) : state(consent, stateId).render(ctx);
};
/** The banner a state draws (the organism, given `choice={null}`). */
const bannerProps = (stateId: string, locale: Locale) =>
  rendered<ComponentProps<typeof CookieConsent>>(
    boxed(consentNode(stateId, locale)).children[0],
    CookieConsent,
  ).props;
/** The island the live render draws. */
const islandProps = (locale: Locale) =>
  rendered<ComponentProps<typeof VisitorCookieConsent>>(
    boxed(consentNode(undefined, locale)).children[0],
    VisitorCookieConsent,
  ).props;
const skeletonProps = (stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  const node =
    stateId === undefined ? story(skeletons).live(ctx) : state(skeletons, stateId).render(ctx);
  return rendered<ComponentProps<typeof LoadingSkeleton>>(node, LoadingSkeleton).props;
};

const consentStateIds = ["banner", "banner-shop-message", "dialog", "dialog-analytics"];
const skeletonStateIds = ["product-grid", "product-page", "cart", "account-list", "few-items"];

describe("the site organisms' stories", () => {
  it("are one for each of the two entries, each with a summary and a11y notes", () => {
    expect(Object.keys(siteOrganismStories).sort()).toEqual([consent, skeletons]);
    for (const [id, each] of Object.entries(siteOrganismStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.summary.trim().endsWith("."), id).toBe(true);
      expect(each.a11y.length, id).toBeGreaterThan(0);
      for (const note of each.a11y) {
        expect(note.trim().endsWith("."), `${id}: ${note.slice(0, 30)}`).toBe(true);
        // Full sentences: a capital to begin with, and more than a label's worth of words.
        expect(note.trim().split(/\s+/).length, `${id}: ${note.slice(0, 30)}`).toBeGreaterThan(8);
      }
    }
  });

  it("have the states the task lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(consent)).toEqual(consentStateIds);
    expect(ids(skeletons)).toEqual(skeletonStateIds);
  });

  it("give each state a distinct id, a label and a description", () => {
    for (const [id, each] of Object.entries(siteOrganismStories)) {
      const ids = (each.states ?? []).map((part) => part.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      const labels = (each.states ?? []).map((part) => part.label);
      expect(new Set(labels).size, id).toBe(labels.length);
      for (const part of each.states ?? []) {
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
        expect(part.description?.trim() ?? "", `${id} ${part.id}`).not.toBe("");
      }
    }
  });

  it("lay the states out one under another: a banner and a listing are as wide as the window", () => {
    for (const each of Object.values(siteOrganismStories)) {
      expect(each.statesLayout).toBe("stack");
    }
  });

  it("use no em dash anywhere in their words", () => {
    for (const [id, each] of Object.entries(siteOrganismStories)) {
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
    for (const [id, each] of Object.entries(siteOrganismStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(300);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
        expect(markup, `${id} ${part.id}`).not.toContain(EM_DASH);
      }
    }
  });

  it("give the components props that serialize (a story renders on the server)", () => {
    for (const locale of LOCALES) {
      const everyProps = [
        islandProps(locale),
        ...consentStateIds.map((stateId) => bannerProps(stateId, locale)),
        skeletonProps(undefined, locale),
        ...skeletonStateIds.map((stateId) => skeletonProps(stateId, locale)),
      ];
      for (const props of everyProps) {
        expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
        expect(JSON.parse(JSON.stringify(props))).toEqual(props);
      }
    }
  });
});

describe("CookieConsent's stories", () => {
  it("say what the notes of the task ask: region, not a dialog, parity, dialog, focus, 2.4.11", () => {
    const notes = story(consent).a11y.join("\n");
    expect(notes).toMatch(/region named/i);
    expect(notes).toMatch(/not a dialog/i);
    expect(notes).toMatch(/same button/i);
    expect(notes).toMatch(/nothing is pre-ticked/i);
    expect(notes).toMatch(/Always on/);
    expect(notes).toMatch(/focus moves to the control that follows/i);
    expect(notes).toMatch(/2\.4\.11/);
    expect(notes).toMatch(/44 px/);
    // The words the notes quote are the catalog's English ones.
    expect(notes).toContain(`“${copyOf("en").region}”`);
    expect(notes).toContain(`“${copyOf("en").acceptAll}”`);
    expect(notes).toContain(`“${copyOf("en").rejectAll}”`);
    expect(notes).toContain(`“${copyOf("en").choose}”`);
    expect(notes).toContain(`“${copyOf("en").save}”`);
  });

  describe("the live render", () => {
    it.each(LOCALES)("runs the real island with the visitor fixture beside it, in %s", (locale) => {
      const box = boxed(consentNode(undefined, locale));
      expect(box.children).toHaveLength(2);
      const [island, fixture] = box.children;
      const props = rendered<ComponentProps<typeof VisitorCookieConsent>>(
        island,
        VisitorCookieConsent,
      ).props;
      expect(props.copy).toEqual(copyOf(locale));
      expect(props.locale).toBe(htmlLang(locale));
      expect(props.policyHref).toBe(site(locale).copy.policyHref);
      expect(props.message).toBeUndefined();
      expect(props.prefetch).toBe(false);
      // A real dialog when it is opened (modal, animated), capped to the box it sits in.
      expect(props.defaultDialogOpen).toBeUndefined();
      expect(props.modal).toBeUndefined();
      expect(props.popupClassName).toBe("max-h-[calc(100%-2rem)]");
      // The island is handed the store's choice by itself: the story gives it no choice.
      expect(props).not.toHaveProperty("choice");
      expect(props).not.toHaveProperty("onChoose");
      // A visitor who has not chosen, handed to the store after hydration.
      expect(
        rendered<ComponentProps<typeof VisitorFixture>>(fixture, VisitorFixture).props,
      ).toEqual({
        consent: null,
      });
    });

    it.each(LOCALES)("draws no banner on the server: the browser draws it, in %s", (locale) => {
      const markup = live(consent, locale);
      for (const slot of ["cookie-consent", "cookie-consent-accept", "cookie-consent-choose"]) {
        expect(markup, slot).not.toContain(`data-slot="${slot}"`);
      }
      // The box is there for the banner to appear in: a fixed height, a group named for what is drawn.
      expect(markup).toContain("data-overlay-box");
      expect(markup).toContain('role="group"');
    });

    it("is in a box that holds the banner at 375 px and the dialog from 768 px", () => {
      // Measured in Chromium: the banner is at most 377 px tall, the dialog 657 px at 768 px and up.
      expect(boxed(consentNode(undefined, "en")).height).toBeGreaterThanOrEqual(657 + 32);
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("draw the banner for a visitor who has not chosen, in %s", (locale) => {
      for (const stateId of consentStateIds) {
        const markup = html(consent, stateId, locale);
        expect(count(markup, /data-slot="cookie-consent"/g), stateId).toBe(1);
        expect(markup, stateId).toContain('data-slot="cookie-consent-accept"');
        expect(markup, stateId).toContain('data-slot="cookie-consent-reject"');
        expect(markup, stateId).toContain('data-slot="cookie-consent-choose"');
        const props = bannerProps(stateId, locale);
        expect(props.choice, stateId).toBeNull();
        expect(props.locale, stateId).toBe(htmlLang(locale));
        expect(props.policyHref, stateId).toBe(site(locale).copy.policyHref);
      }
    });

    it.each(LOCALES)("draw the copy's sentence, with the policy link in it, in %s", (locale) => {
      const props = bannerProps("banner", locale);
      expect(props.message).toBeUndefined();
      const markup = html(consent, "banner", locale);
      expect(markup).toContain(`href="${site(locale).copy.policyHref}"`);
      expect(markup).toContain(copyOf(locale).policyLink);
      expect(markup).not.toContain(site(locale).message.message ?? "never");
    });

    it.each(LOCALES)("draw the shop's own sentence in place of the copy's, in %s", (locale) => {
      const props = bannerProps("banner-shop-message", locale);
      expect(props.message).toBe(site(locale).message.message);
      expect(site(locale).message.message?.length).toBeGreaterThan(20);
      const markup = html(consent, "banner-shop-message", locale);
      expect(markup).toContain(`href="${site(locale).message.policyHref}"`);
      // Not the copy's sentence: its first words are not there.
      const copyStart = copyOf(locale).message.split("{policy}")[0]?.slice(0, 30) ?? "";
      expect(markup).not.toContain(copyStart);
    });

    it.each(LOCALES)("draw the dialog open and not modal, with nothing chosen, in %s", (locale) => {
      const props = bannerProps("dialog", locale);
      expect(props.defaultDialogOpen).toBe(true);
      expect(props.modal).toBe(false);
      expect(props.defaultSwitches).toBeUndefined();
      // Capped to the box and still: no state is a picture of an animation.
      expect(props.popupClassName).toContain("max-h-[calc(100%-2rem)]");
      expect(props.popupClassName).toContain("duration-0");
    });

    it.each(LOCALES)(
      "draw the dialog with analytics on, as a returning visitor sees it, in %s",
      (locale) => {
        const props = bannerProps("dialog-analytics", locale);
        expect(props.defaultDialogOpen).toBe(true);
        expect(props.modal).toBe(false);
        expect(props.defaultSwitches).toEqual(site(locale).choices.analytics);
        expect(props.defaultSwitches).toEqual({ analytics: true, marketing: false });
        expect(props.popupClassName).toContain("duration-0");
      },
    );

    it("leave the dialog shut in the two banner states, and open in the two dialog states", () => {
      for (const stateId of consentStateIds) {
        const props = bannerProps(stateId, "en");
        expect(props.defaultDialogOpen === true, stateId).toBe(stateId.startsWith("dialog"));
      }
    });

    it("give every state a box of its own, tall enough for the banner and the dialog at 375 px", () => {
      // Measured in Chromium at 375 px, in en, el, de and fr: the banner is at most 377 px tall and
      // the dialog at most 846 px (Greek), and the dialog is capped to its box less 2rem.
      for (const stateId of consentStateIds) {
        const box = boxed(consentNode(stateId, "de"));
        expect(box.height, stateId).toBeGreaterThanOrEqual(
          stateId.startsWith("dialog") ? 846 + 32 : 377 + 80,
        );
        expect(box.name, stateId).toBe(state(consent, stateId).label);
      }
    });

    it("pass nothing a click could change: no choice, no handler, so a state is a picture", () => {
      for (const stateId of consentStateIds) {
        const props = bannerProps(stateId, "en");
        expect(props.onChoose, stateId).toBeUndefined();
        expect(props.choice, stateId).toBeNull();
      }
    });
  });

  describe("the regions", () => {
    it.each(LOCALES)("are named apart, in the live render and every state, in %s", (locale) => {
      const regions = [
        islandProps(locale).copy.region,
        ...consentStateIds.map((stateId) => bannerProps(stateId, locale).copy.region),
      ];
      expect(new Set(regions).size).toBe(regions.length);
      // The live render has the catalog's name; a state has it and its own label in brackets.
      expect(regions[0]).toBe(copyOf(locale).region);
      consentStateIds.forEach((stateId, index) => {
        expect(regions[index + 1]).toBe(
          `${copyOf(locale).region} (${state(consent, stateId).label})`,
        );
      });
    });

    it("leave the rest of the catalog's words alone", () => {
      for (const locale of LOCALES) {
        for (const stateId of consentStateIds) {
          const { region: _region, ...words } = bannerProps(stateId, locale).copy;
          const { region: _own, ...catalog } = copyOf(locale);
          expect(words).toEqual(catalog);
        }
      }
    });

    it.each(LOCALES)("are in the markup, once for each, in %s", (locale) => {
      for (const stateId of consentStateIds) {
        const label = bannerProps(stateId, locale).copy.region;
        const markup = html(consent, stateId, locale);
        expect(count(markup, /<section /g), stateId).toBe(1);
        expect(markup, stateId).toContain(`aria-label="${label.replace(/'/g, "&#x27;")}"`);
      }
    });
  });

  it("is told not to prefetch any link, in the live render and in every state", () => {
    for (const locale of LOCALES) {
      expect(islandProps(locale).prefetch, locale).toBe(false);
      for (const stateId of consentStateIds) {
        expect(bannerProps(stateId, locale).prefetch, `${stateId} in ${locale}`).toBe(false);
      }
    }
  });

  it.each(LOCALES)(
    "takes its words from the locale's catalog and its locale from the market, in %s",
    (locale) => {
      for (const stateId of consentStateIds) {
        const { region: _region, ...words } = bannerProps(stateId, locale).copy;
        const { region: _own, ...catalog } = copyOf(locale);
        expect(words, stateId).toEqual(catalog);
        expect(bannerProps(stateId, locale).locale, stateId).toBe(htmlLang(locale));
      }
    },
  );
});

describe("the loading skeletons' stories", () => {
  const layouts = {
    "product-grid": "productGrid",
    "product-page": "productPage",
    cart: "cart",
    "account-list": "accountList",
  } as const;
  const copyKeys = ["productGrid", "productPage", "cart", "accountList"] as const;
  const skeletonCopy = (locale: Locale) => catalogs[locale].organisms.loadingSkeleton;

  it("say what the task asks: one busy region, one string, shapes hidden, sizes that match", () => {
    const notes = story(skeletons).a11y.join("\n");
    expect(notes).toMatch(/one region/i);
    expect(notes).toMatch(/aria-busy/);
    expect(notes).toMatch(/hidden from assistive technology/i);
    expect(notes).toMatch(/no live region/i);
    expect(notes).toMatch(/one string, not eight/i);
    expect(notes).toMatch(/reduced motion/i);
    expect(notes).toMatch(/375 px/);
    for (const name of Object.values(skeletonCopy("en"))) expect(notes).toContain(`“${name}”`);
  });

  it.each(LOCALES)("draws the product grid in the live render, in %s", (locale) => {
    const props = skeletonProps(undefined, locale);
    expect(props.layout).toBe("product-grid");
    expect(props.items).toBeUndefined();
    expect(props.copy).toEqual(skeletonCopy(locale));
    const markup = live(skeletons, locale);
    expect(markup).toContain('data-layout="product-grid"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain(`aria-label="${skeletonCopy(locale).productGrid}"`);
    expect(count(markup, /data-slot="loading-skeleton-card"/g)).toBe(8);
  });

  it.each(LOCALES)("draws each layout as a state, and one with fewer items, in %s", (locale) => {
    const expected = {
      "product-grid": { layout: "product-grid", items: undefined },
      "product-page": { layout: "product-page", items: undefined },
      cart: { layout: "cart", items: undefined },
      "account-list": { layout: "account-list", items: undefined },
      "few-items": { layout: "product-grid", items: 3 },
    } as const;
    for (const stateId of skeletonStateIds) {
      const props = skeletonProps(stateId, locale);
      const want = expected[stateId as keyof typeof expected];
      expect(props.layout, stateId).toBe(want.layout);
      expect(props.items, stateId).toBe(want.items);
      const markup = html(skeletons, stateId, locale);
      expect(markup, stateId).toContain(`data-layout="${want.layout}"`);
      expect(markup, stateId).toContain('aria-busy="true"');
    }
  });

  it.each(LOCALES)("draws the parts of each layout the state names, in %s", (locale) => {
    const parts = (stateId: string, slot: string) =>
      count(html(skeletons, stateId, locale), new RegExp(`data-slot="${slot}"`, "g"));
    expect(parts("product-grid", "loading-skeleton-card")).toBe(8);
    expect(parts("few-items", "loading-skeleton-card")).toBe(3);
    expect(parts("cart", "loading-skeleton-line")).toBe(3);
    expect(parts("cart", "loading-skeleton-summary")).toBe(1);
    expect(parts("account-list", "loading-skeleton-row")).toBe(4);
    expect(parts("product-page", "loading-skeleton-card")).toBe(0);
  });

  it.each(LOCALES)(
    "names each region apart from the others and from the live render, in %s",
    (locale) => {
      const regions = [
        skeletonProps(undefined, locale).copy.productGrid,
        ...skeletonStateIds.map((stateId) => {
          const props = skeletonProps(stateId, locale);
          return props.copy[layouts[props.layout]];
        }),
      ];
      expect(new Set(regions).size).toBe(regions.length);
      // The catalog's name for the layout, then the state's label in brackets.
      skeletonStateIds.forEach((stateId, index) => {
        const props = skeletonProps(stateId, locale);
        expect(regions[index + 1]).toBe(
          `${skeletonCopy(locale)[layouts[props.layout]]} (${state(skeletons, stateId).label})`,
        );
      });
      // And the name is the one in the markup.
      for (const stateId of skeletonStateIds) {
        const props = skeletonProps(stateId, locale);
        const name = props.copy[layouts[props.layout]].replace(/'/g, "&#x27;");
        expect(html(skeletons, stateId, locale), stateId).toContain(`aria-label="${name}"`);
      }
    },
  );

  it("names all four of the layouts in every state, so a state shows the layout it names", () => {
    for (const locale of LOCALES) {
      for (const stateId of skeletonStateIds) {
        const { copy } = skeletonProps(stateId, locale);
        expect(Object.keys(copy).sort()).toEqual([...copyKeys].sort());
        const label = state(skeletons, stateId).label;
        for (const key of copyKeys) expect(copy[key], `${stateId} ${key}`).toContain(`(${label})`);
      }
    }
  });

  it("holds no text and no link in the markup: a region and shapes", () => {
    for (const locale of LOCALES) {
      for (const stateId of skeletonStateIds) {
        const markup = html(skeletons, stateId, locale);
        // Everything inside the region is in a box that is hidden from assistive technology.
        expect(markup, stateId).toMatch(
          /<section [^>]*aria-busy="true"[^>]*><div aria-hidden="true"/,
        );
        expect(markup, stateId).not.toMatch(/<(?:a|button|input|ul|ol)[\s>]/);
        expect(markup, stateId).not.toContain("aria-live");
      }
    }
  });

  it("gives the skeletons no class of their own: the layout decides their size", () => {
    for (const stateId of skeletonStateIds) {
      expect(skeletonProps(stateId, "en").className, stateId).toBeUndefined();
    }
  });
});
