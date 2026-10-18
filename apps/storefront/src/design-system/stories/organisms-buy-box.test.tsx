// Ours (T38, SETUP.md "Product-page organisms (T38)").
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import {
  BuyBox as BuyBoxContract,
  MobileStickyATC as MobileStickyATCContract,
} from "@shopblok/registry/contracts";
import { BuyBox } from "@shopblok/ui/organisms/buy-box";
import { MobileStickyATC } from "@shopblok/ui/organisms/mobile-sticky-atc";
import { QuickViewDialog } from "@shopblok/ui/organisms/quick-view-dialog";
import { SizeGuideDialog } from "@shopblok/ui/organisms/size-guide-dialog";
import {
  Children,
  Fragment,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverlayBox } from "../components/overlay-box";
import { createContext } from "../context";
import { buyBoxOrganismStories } from "./organisms-buy-box";

// The stories of BuyBox, MobileStickyATC and QuickViewDialog (T38; D40, D41, D44, D45, D46): the
// states the task lists are there, each shows what its description says in every locale, every
// id and landmark of a page is its own (the sticky bar joins the buy box's form and options by id, so
// the ids are what the states pass and no two are alike), the bars and the open dialogs are drawn
// in boxes, nothing a state does moves, the quick view's link is told not to prefetch, the content
// of every state is valid against its contract, and the props that reach a client component
// serialize, because a story renders on the server. A story renders to static markup here (the
// storefront's tests have no DOM), where a Base UI popup is not drawn (portals mount in the
// browser), so what an open dialog holds is the ui package's test and the design system's browser
// checks; here its props are what is read. The heights of the bars' boxes and the layout at 375,
// 768 and 1440 px in the four languages were measured in headless Chromium (the numbers are in the
// comments of the constants in the stories' file), and the design system's own browser checks are
// the lead's.

/** The one character the house style leaves out of every sentence. */
const EM_DASH = String.fromCharCode(0x2014);

type Id = keyof typeof buyBoxOrganismStories;

const box = "organisms/buy-box";
const bar = "organisms/mobile-sticky-atc";
const quickView = "organisms/quick-view-dialog";

const story = (id: Id) => buyBoxOrganismStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
const live = (id: Id, locale: Locale) =>
  renderToStaticMarkup(story(id).live(createContext(locale)));
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const page = (locale: Locale) => commerceFixtures[locale].productPage;
const organisms = (locale: Locale) => catalogs[locale].organisms;

/** The whole page of an entry in one render: its live render and every state, so `useId` is unique. */
function pageMarkup(id: Id, locale: Locale): string {
  const ctx = createContext(locale);
  const each = story(id);
  return renderToStaticMarkup(
    <>
      <Fragment key="live">{each.live(ctx)}</Fragment>
      {(each.states ?? []).map((part) => (
        <Fragment key={part.id}>{part.render(ctx)}</Fragment>
      ))}
    </>,
  );
}
const idsIn = (markup: string) => [...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? "");

/** The elements a story returns are the components themselves: their props are what the story chose. */
function rendered<Props>(node: ReactNode, type: unknown): ReactElement<Props> {
  if (!isValidElement<Props>(node) || node.type !== type) throw new Error("not the component");
  return node;
}
/** The one element inside a plain wrapper (the buy box's column, the dialog's padding). */
function inside(node: ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(node)) throw new Error("not an element");
  return Children.toArray(node.props.children).filter(isValidElement)[0];
}
/** What is inside the overlay box a story draws. */
function boxed(node: ReactNode): { height: number; name: string; child: ReactNode } {
  const overlay = rendered<ComponentProps<typeof OverlayBox>>(node, OverlayBox);
  return {
    height: overlay.props.height ?? 480,
    name: overlay.props.name,
    child: Children.toArray(overlay.props.children).filter(isValidElement)[0],
  };
}

const nodeOf = (id: Id, stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  return stateId === undefined ? story(id).live(ctx) : state(id, stateId).render(ctx);
};
const boxProps = (stateId: string | undefined, locale: Locale) =>
  rendered<ComponentProps<typeof BuyBox>>(inside(nodeOf(box, stateId, locale)), BuyBox).props;
const barBox = (stateId: string | undefined, locale: Locale) => boxed(nodeOf(bar, stateId, locale));
const barProps = (stateId: string | undefined, locale: Locale) =>
  rendered<ComponentProps<typeof MobileStickyATC>>(barBox(stateId, locale).child, MobileStickyATC)
    .props;
/** The quick view of a state: the trigger alone is the dialog itself, an open state is in a box. */
const quickProps = (stateId: string | undefined, locale: Locale) => {
  const node = nodeOf(quickView, stateId, locale);
  const element = isValidElement(node) && node.type === OverlayBox ? inside(inside(node)) : node;
  return rendered<ComponentProps<typeof QuickViewDialog>>(element, QuickViewDialog).props;
};
const quickBox = (stateId: string, locale: Locale) => boxed(nodeOf(quickView, stateId, locale));

const boxStateIds = [
  "empty",
  "partial",
  "ready",
  "low",
  "sold-out",
  "adding",
  "added",
  "error",
  "size-guide",
  "heading-2",
  "long",
];
const barStateIds = ["ready", "incomplete", "sold-out", "long"];
const quickStateIds = ["trigger", "open-empty", "open-chosen", "open-long"];
const openQuickStateIds = ["open-empty", "open-chosen", "open-long"];

describe("the buy box organisms' stories", () => {
  it("are one for each of the three entries, each with a summary and a11y notes", () => {
    expect(Object.keys(buyBoxOrganismStories).sort()).toEqual([box, bar, quickView].sort());
    for (const [id, each] of Object.entries(buyBoxOrganismStories)) {
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
    expect(ids(box)).toEqual(boxStateIds);
    expect(ids(bar)).toEqual(barStateIds);
    expect(ids(quickView)).toEqual(quickStateIds);
  });

  it("give each state a distinct id, a label and a description", () => {
    for (const [id, each] of Object.entries(buyBoxOrganismStories)) {
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

  it("lay the states out one under another: a buy box and a bar are as wide as their frame", () => {
    for (const each of Object.values(buyBoxOrganismStories)) {
      expect(each.statesLayout).toBe("stack");
    }
  });

  it("use no em dash anywhere in their words", () => {
    for (const [id, each] of Object.entries(buyBoxOrganismStories)) {
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
    for (const [id, each] of Object.entries(buyBoxOrganismStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(200);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(200);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
        expect(markup, `${id} ${part.id}`).not.toContain(EM_DASH);
      }
    }
  });

  it("give the content of every state to the contract, and it is valid", () => {
    for (const locale of LOCALES) {
      for (const stateId of [undefined, ...boxStateIds]) {
        const { product, selection, quantity, maxQuantity, notes } = boxProps(stateId, locale);
        const result = BuyBoxContract.safeParse({
          product,
          selection,
          quantity,
          maxQuantity,
          notes,
        });
        expect(result.success, `buy box ${stateId ?? "live"} ${locale}`).toBe(true);
      }
      for (const stateId of [undefined, ...barStateIds]) {
        const { title, image, price, choice, status } = barProps(stateId, locale);
        const result = MobileStickyATCContract.safeParse({ title, image, price, choice, status });
        expect(result.success, `bar ${stateId ?? "live"} ${locale}`).toBe(true);
      }
      for (const stateId of [undefined, ...quickStateIds]) {
        const { product, selection, quantity, maxQuantity, notes } = quickProps(stateId, locale);
        const result = BuyBoxContract.safeParse({
          product,
          selection,
          quantity,
          maxQuantity,
          notes,
        });
        expect(result.success, `quick view ${stateId ?? "live"} ${locale}`).toBe(true);
      }
    }
  });

  it("give the components props that serialize (a story renders on the server)", () => {
    for (const locale of LOCALES) {
      const every = [
        ...[undefined, ...boxStateIds].map((stateId) => boxProps(stateId, locale)),
        ...[undefined, ...barStateIds].map((stateId) => barProps(stateId, locale)),
        ...[undefined, ...quickStateIds].map((stateId) => quickProps(stateId, locale)),
      ];
      for (const props of every) {
        // The size guide is an element, which a server component may hand to a client one.
        const { sizeGuide: _sizeGuide, ...plain } = props as { sizeGuide?: unknown };
        expect(Object.values(plain).filter((value) => typeof value === "function")).toEqual([]);
        expect(JSON.parse(JSON.stringify(plain))).toEqual(plain);
      }
    }
  });

  it("give no state a way to send anything: no action and no callback", () => {
    for (const locale of LOCALES) {
      for (const stateId of [undefined, ...boxStateIds]) {
        const props = boxProps(stateId, locale);
        expect(props.action, `${stateId} ${locale}`).toBeUndefined();
        expect(props.onSelectionChange, `${stateId} ${locale}`).toBeUndefined();
      }
      for (const stateId of [undefined, ...quickStateIds]) {
        const props = quickProps(stateId, locale);
        expect(props.action, `${stateId} ${locale}`).toBeUndefined();
        expect(props.onSelectionChange, `${stateId} ${locale}`).toBeUndefined();
      }
    }
  });

  it.each(LOCALES)(
    "keep every id of a page its own, and every reference resolves, in %s",
    (locale) => {
      for (const id of [box, bar, quickView] as const) {
        const markup = pageMarkup(id, locale);
        const ids = idsIn(markup);
        // The bar names itself with `aria-label` and points at the box's ids (`form`, `href`), so it holds
        // none; the quick view's dialog is not drawn on the server, so only its triggers carry ids.
        if (id === box) expect(ids.length, id).toBeGreaterThan(5);
        if (id === quickView) expect(ids.length, id).toBeGreaterThan(0);
        expect(
          ids.filter((each, index) => ids.indexOf(each) !== index),
          id,
        ).toEqual([]);
        // The ids that the markup points at (labels, descriptions and `for`) are in it.
        for (const match of markup.matchAll(
          /\s(?:aria-labelledby|aria-describedby|for)="([^"]+)"/g,
        )) {
          for (const target of (match[1] ?? "").split(/\s+/)) {
            expect(ids, `${id}: ${target}`).toContain(target);
          }
        }
      }
    },
  );

  it("tell the quick view's link not to prefetch, in the live render and every state", () => {
    for (const locale of LOCALES) {
      for (const stateId of [undefined, ...quickStateIds]) {
        expect(quickProps(stateId, locale).prefetch, `${stateId} ${locale}`).toBe(false);
      }
    }
  });

  it("draw every component in the page's language", () => {
    for (const locale of LOCALES) {
      expect(boxProps(undefined, locale).locale).toBe(htmlLang(locale));
      expect(barProps(undefined, locale).locale).toBe(htmlLang(locale));
      expect(quickProps(undefined, locale).locale).toBe(htmlLang(locale));
      for (const stateId of boxStateIds) {
        expect(boxProps(stateId, locale).locale, stateId).toBe(htmlLang(locale));
      }
      for (const stateId of barStateIds) {
        expect(barProps(stateId, locale).locale, stateId).toBe(htmlLang(locale));
      }
      for (const stateId of quickStateIds) {
        expect(quickProps(stateId, locale).locale, stateId).toBe(htmlLang(locale));
      }
    }
  });
});

describe("BuyBox's stories", () => {
  it("say what the notes of the task ask: the held button, the stock region, the sold-out words, the 44 px", () => {
    const notes = story(box).a11y.join("\n");
    expect(notes).toMatch(/aria-disabled/);
    expect(notes).toMatch(/never with the disabled attribute/i);
    expect(notes).toContain(
      `“${formatMessage(organisms("en").buyBox.choose, { options: "Color and Size" }, "en-US")}”`,
    );
    expect(notes).toMatch(/live region/i);
    expect(notes).toContain(`“${organisms("en").buyBox.soldOut}”`);
    expect(notes).toContain(`“${organisms("en").buyBox.adding}”`);
    expect(notes).toMatch(/44 px/);
    expect(notes).toMatch(/without JavaScript|before any script has run/i);
  });

  describe("the live render", () => {
    it.each(LOCALES)("is the fixture's empty buy box, under the section's h2, in %s", (locale) => {
      const props = boxProps(undefined, locale);
      const fixture = page(locale).buyBox.empty;
      expect(props.product).toEqual(fixture.product);
      expect(props.selection).toEqual({});
      expect(props.quantity).toBe(fixture.quantity);
      expect(props.maxQuantity).toBe(fixture.maxQuantity);
      expect(props.notes).toEqual(fixture.notes);
      expect(props.headingLevel).toBe(3);
      expect(props.status).toBeUndefined();
      expect(props.copy.buyBox).toEqual(organisms(locale).buyBox);
      expect(props.copy.variantSelector).toEqual(catalogs[locale].molecules.variantSelector);
      expect(props.copy.stock).toEqual(catalogs[locale].atoms.stock);
    });

    it.each(LOCALES)("draws the form, the title and the held button, in %s", (locale) => {
      const markup = live(box, locale);
      expect(markup).toContain('data-slot="buy-box"');
      expect(markup).toMatch(/<h3[^>]*data-slot="buy-box-title"/);
      expect(markup).toContain(page(locale).buyBox.empty.product.title);
      expect(markup).toMatch(/<button[^>]*data-slot="buy-box-add"[^>]*aria-disabled="true"/);
      expect(markup).toContain('data-slot="buy-box-choose"');
      expect(markup).toContain('role="status"');
      expect(markup).toContain('aria-live="polite"');
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("draw the fixture's buy box for each state of the choice, in %s", (locale) => {
      const fixtures = page(locale).buyBox;
      const expected = {
        empty: fixtures.empty,
        partial: fixtures.partial,
        ready: fixtures.ready,
        low: fixtures.low,
        "sold-out": fixtures.soldOut,
      } as const;
      for (const [stateId, fixture] of Object.entries(expected)) {
        const props = boxProps(stateId, locale);
        expect(props.product, stateId).toEqual(fixture.product);
        expect(props.selection, stateId).toEqual(fixture.selection);
        expect(props.maxQuantity, stateId).toBe(fixture.maxQuantity);
        expect(props.status, stateId).toBeUndefined();
        expect(props.sizeGuide, stateId).toBeUndefined();
      }
    });

    it.each(LOCALES)("say the right things in the markup of each state, in %s", (locale) => {
      const copy = organisms(locale).buyBox;
      const stock = catalogs[locale].atoms.stock;
      const held = (markup: string) =>
        /<button[^>]*data-slot="buy-box-add"[^>]*aria-disabled="true"/.test(markup);
      // Nothing chosen and the colour only: the button is held and a line says what to choose.
      for (const stateId of ["empty", "partial"]) {
        const markup = html(box, stateId, locale);
        expect(held(markup), stateId).toBe(true);
        expect(markup, stateId).toContain('data-slot="buy-box-choose"');
        expect(markup, stateId).toContain(copy.add);
      }
      // A full choice that can be bought: live, in stock, and nothing to choose.
      for (const stateId of ["ready", "added", "error", "heading-2"]) {
        const markup = html(box, stateId, locale);
        expect(held(markup), stateId).toBe(false);
        expect(markup, stateId).not.toContain('data-slot="buy-box-choose"');
        expect(markup, stateId).toContain(stock.inStock);
      }
      const low = html(box, "low", locale);
      expect(low).toContain(formatMessage(stock.low, { count: 3 }, htmlLang(locale)));
      expect(held(low)).toBe(false);
      const soldOut = html(box, "sold-out", locale);
      expect(held(soldOut)).toBe(true);
      expect(soldOut).toContain(copy.soldOut);
      expect(soldOut).toContain(stock.outOfStock);
      expect(soldOut).not.toContain('data-slot="buy-box-choose"');
    });

    it.each(LOCALES)("draw the three statuses on the ready fixture, in %s", (locale) => {
      const copy = organisms(locale).buyBox;
      expect(boxProps("adding", locale).status).toBe("adding");
      expect(boxProps("added", locale).status).toBe("added");
      expect(boxProps("error", locale).status).toBe("error");
      for (const stateId of ["adding", "added", "error"]) {
        expect(boxProps(stateId, locale).product, stateId).toEqual(
          page(locale).buyBox.ready.product,
        );
        expect(boxProps(stateId, locale).selection, stateId).toEqual(
          page(locale).buyBox.ready.selection,
        );
      }
      const adding = html(box, "adding", locale);
      expect(adding).toContain(copy.adding);
      expect(adding).toContain('aria-busy="true"');
      expect(adding).toMatch(/<button[^>]*data-slot="buy-box-add"[^>]*aria-disabled="true"/);
      expect(html(box, "added", locale)).toContain(copy.added);
      expect(html(box, "error", locale)).toContain(copy.error);
      // The status region is in every state's markup, empty or not.
      for (const stateId of boxStateIds) {
        expect(html(box, stateId, locale), stateId).toContain('role="status"');
      }
    });

    it.each(LOCALES)("pass the size guide's trigger as an element, in %s", (locale) => {
      const props = boxProps("size-guide", locale);
      const guide = rendered<ComponentProps<typeof SizeGuideDialog>>(
        props.sizeGuide,
        SizeGuideDialog,
      ).props;
      expect(guide.title).toBe(page(locale).sizeGuide.title);
      expect(guide.sizes).toEqual(page(locale).sizeGuide.sizes);
      expect(guide.rows).toEqual(page(locale).sizeGuide.rows);
      expect(guide.locale).toBe(htmlLang(locale));
      expect(guide.copy).toEqual(organisms(locale).sizeGuideDialog);
      // Never drawn open inside a buy box.
      expect(guide.defaultOpen).toBeUndefined();
      expect(html(box, "size-guide", locale)).toContain(organisms(locale).sizeGuideDialog.open);
      for (const stateId of boxStateIds.filter((each) => each !== "size-guide")) {
        expect(boxProps(stateId, locale).sizeGuide, stateId).toBeUndefined();
      }
    });

    it("put the title at level 4 under the state's own h3, at 2 in its state, and at 3 live", () => {
      for (const stateId of boxStateIds) {
        expect(boxProps(stateId, "en").headingLevel, stateId).toBe(stateId === "heading-2" ? 2 : 4);
      }
      expect(html(box, "ready", "en")).toMatch(/<h4[^>]*data-slot="buy-box-title"/);
      expect(html(box, "heading-2", "en")).toMatch(/<h2[^>]*data-slot="buy-box-title"/);
      expect(live(box, "en")).toMatch(/<h3[^>]*data-slot="buy-box-title"/);
    });

    it.each(LOCALES)(
      "lead with the longest title the copy allows, and long names, in %s",
      (locale) => {
        const props = boxProps("long", locale);
        const long = commerceFixtures[locale].long;
        const strings = createContext(locale).fixture.long;
        expect(props.product.title).toBe(long.product.title);
        expect(props.product.options.map((option) => option.title)).toEqual([
          strings.optionLabel,
          strings.fieldLabel,
        ]);
        expect(props.product.options[0]?.values[0]?.label).toBe(strings.chipLabel);
        expect(props.product.options[1]?.values[0]?.label).toBe(strings.linkLabel);
        expect(props.notes).toEqual([strings.helpText, strings.errorText]);
        const markup = html(box, "long", locale);
        expect(markup).toContain(strings.optionLabel);
        expect(markup).toContain(strings.helpText);
      },
    );

    it("give every state ids of its own, which the markup carries", () => {
      const all = [...boxStateIds, "live"];
      const seen = new Set<string>();
      for (const stateId of all) {
        const props = boxProps(stateId === "live" ? undefined : stateId, "en");
        for (const value of [props.formId, props.optionsId, props.buttonId, props.reviewsHref]) {
          expect(value, stateId).toBeTruthy();
          expect(seen.has(value ?? ""), `${stateId}: ${value}`).toBe(false);
          seen.add(value ?? "");
        }
        const markup = stateId === "live" ? live(box, "en") : html(box, stateId, "en");
        expect(markup).toContain(`id="${props.formId}"`);
        expect(markup).toContain(`id="${props.optionsId}"`);
        expect(markup).toContain(`id="${props.buttonId}"`);
        expect(props.reviewsHref).toBe(`#${props.formId?.replace(/-form$/, "-reviews")}`);
      }
    });

    it("name each state's list of notes apart, and the live render's with the catalog's words", () => {
      for (const locale of LOCALES) {
        const notes = organisms(locale).buyBox.notes;
        expect(boxProps(undefined, locale).copy.buyBox.notes).toBe(notes);
        const names = boxStateIds.map((stateId) => boxProps(stateId, locale).copy.buyBox.notes);
        expect(new Set(names).size).toBe(boxStateIds.length);
        for (const name of names) expect(name.startsWith(notes)).toBe(true);
      }
    });
  });
});

describe("MobileStickyATC's stories", () => {
  it("say what the notes of the task ask: the region, the reserved height, the three actions, 44 px", () => {
    const notes = story(bar).a11y.join("\n");
    expect(notes).toContain(`“${organisms("en").mobileStickyAtc.region}”`);
    expect(notes).toMatch(/2\.4\.11/);
    expect(notes).toMatch(/form/);
    expect(notes).toMatch(/link/);
    expect(notes).toMatch(/home indicator/i);
    expect(notes).toMatch(/44 px/);
    expect(notes).toMatch(/768 px/);
  });

  describe("every bar", () => {
    it.each(LOCALES)(
      "is forced into view, in a box, with its words from the catalog, in %s",
      (locale) => {
        for (const stateId of [undefined, ...barStateIds]) {
          const props = barProps(stateId, locale);
          expect(props.forceVisible, `${stateId}`).toBe(true);
          expect(props.locale).toBe(htmlLang(locale));
          expect(props.copy.priceBlock).toEqual(catalogs[locale].molecules.priceBlock);
          expect(props.copy.mobileStickyAtc.add).toBe(organisms(locale).mobileStickyAtc.add);
          expect(props.copy.mobileStickyAtc.choose).toBe(organisms(locale).mobileStickyAtc.choose);
          expect(props.copy.mobileStickyAtc.soldOut).toBe(
            organisms(locale).mobileStickyAtc.soldOut,
          );
          // The bar is capped to its box: the window's height means nothing inside it.
          expect(props.className).toContain("max-h-[calc(100%-1rem)]");
          expect(barBox(stateId, locale).height).toBeGreaterThanOrEqual(200);
        }
      },
    );

    it("sits in a box as tall as the tallest bar measured, and a taller one for the long title", () => {
      expect(barBox("ready", "en").height).toBe(200);
      expect(barBox("incomplete", "en").height).toBe(200);
      expect(barBox("sold-out", "en").height).toBe(200);
      expect(barBox("long", "en").height).toBeGreaterThanOrEqual(420);
      expect(barBox(undefined, "en").height).toBe(200);
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("draw each of the fixture's bars, in %s", (locale) => {
      const fixtures = page(locale).sticky;
      const expected = {
        ready: fixtures.ready,
        incomplete: fixtures.incomplete,
        "sold-out": fixtures.soldOut,
      } as const;
      for (const [stateId, fixture] of Object.entries(expected)) {
        const props = barProps(stateId, locale);
        expect(props.title, stateId).toBe(fixture.title);
        expect(props.status, stateId).toBe(fixture.status);
        expect(props.choice, stateId).toEqual(fixture.choice);
        expect(props.price, stateId).toEqual(fixture.price);
        expect(props.image, stateId).toEqual(fixture.image);
      }
      expect(barProps(undefined, locale).status).toBe("ready");
    });

    it.each(LOCALES)("show the action each status allows, in %s", (locale) => {
      const words = organisms(locale).mobileStickyAtc;
      const ready = html(bar, "ready", locale);
      expect(ready).toMatch(/<button[^>]*data-slot="mobile-sticky-atc-add"/);
      expect(ready).toContain(words.add);
      expect(ready).not.toContain('data-slot="mobile-sticky-atc-choose"');
      const incomplete = html(bar, "incomplete", locale);
      expect(incomplete).toMatch(/<a[^>]*data-slot="mobile-sticky-atc-choose"/);
      expect(incomplete).toContain(words.choose);
      expect(incomplete).not.toContain("<button");
      const soldOut = html(bar, "sold-out", locale);
      expect(soldOut).toContain(words.soldOut);
      expect(soldOut).not.toContain("<button");
      expect(soldOut).not.toContain("<a ");
    });

    it("join the buy box of the same key: the form and the options, which no state shares", () => {
      const seen = new Set<string>();
      for (const stateId of [undefined, ...barStateIds]) {
        const props = barProps(stateId, "en");
        const key = stateId === undefined ? "live" : stateId;
        expect(props.formId, key).toBe(`buy-box-sticky-${key}-form`);
        expect(props.optionsHref, key).toBe(`#buy-box-sticky-${key}-options`);
        expect(props.watch, key).toBe(`buy-box-sticky-${key}-add`);
        for (const value of [props.formId, props.optionsHref, props.watch]) {
          expect(seen.has(value), `${key}: ${value}`).toBe(false);
          seen.add(value);
        }
        const markup = stateId === undefined ? live(bar, "en") : html(bar, stateId, "en");
        if (props.status === "ready") expect(markup).toContain(`form="${props.formId}"`);
        if (props.status === "incomplete") expect(markup).toContain(`href="${props.optionsHref}"`);
      }
    });

    it.each(LOCALES)(
      "name each region apart, and the live render's with the catalog's words, in %s",
      (locale) => {
        const region = organisms(locale).mobileStickyAtc.region;
        const names = barStateIds.map(
          (stateId) => barProps(stateId, locale).copy.mobileStickyAtc.region,
        );
        expect(new Set(names).size).toBe(barStateIds.length);
        for (const name of names) expect(name.startsWith(`${region} (`)).toBe(true);
        expect(barProps(undefined, locale).copy.mobileStickyAtc.region).toBe(region);
        expect(live(bar, locale)).toContain(`aria-label="${region}"`);
        for (const stateId of barStateIds) {
          expect(html(bar, stateId, locale)).toContain(
            `aria-label="${barProps(stateId, locale).copy.mobileStickyAtc.region}"`,
          );
        }
      },
    );

    it.each(LOCALES)(
      "lead with the longest title the copy allows and a long choice, in %s",
      (locale) => {
        const props = barProps("long", locale);
        const strings = createContext(locale).fixture.long;
        expect(props.title).toBe(commerceFixtures[locale].long.product.title);
        expect(props.choice).toEqual([strings.optionLabel, strings.chipLabel]);
        expect(props.status).toBe("ready");
        expect(html(bar, "long", locale)).toContain(strings.optionLabel);
      },
    );

    it("draw the bar on the server: forced into view, it is in the markup", () => {
      for (const stateId of barStateIds) {
        expect(html(bar, stateId, "en"), stateId).toContain('data-slot="mobile-sticky-atc"');
      }
      expect(live(bar, "en")).toContain('data-slot="mobile-sticky-atc"');
    });
  });
});

describe("QuickViewDialog's stories", () => {
  it("say what the notes of the task ask: the trigger's name, the dialog's name, Escape, no zoom, the close button", () => {
    const notes = story(quickView).a11y.join("\n");
    expect(notes).toContain(`“${organisms("en").quickViewDialog.open}”`);
    expect(notes).toContain("“Quick view: Heritage Hoodie”");
    expect(notes).toMatch(/2\.5\.3/);
    expect(notes).toMatch(/Escape/);
    expect(notes).toMatch(/aria-labelledby/);
    expect(notes).toMatch(/no zoom/i);
    expect(notes).toMatch(/size guide/i);
    expect(notes).toMatch(/close button/i);
    expect(notes).toMatch(/44 px/);
  });

  describe("the live render", () => {
    it.each(LOCALES)("is the trigger of the fixture's product, closed, in %s", (locale) => {
      const props = quickProps(undefined, locale);
      const fixture = page(locale).buyBox.empty;
      expect(props.product).toEqual(fixture.product);
      expect(props.selection).toEqual(fixture.selection);
      expect(props.defaultOpen).toBeUndefined();
      expect(props.modal).toBeUndefined();
      expect(props.popupClassName).toBeUndefined();
      expect(props.copy.quickViewDialog).toEqual(organisms(locale).quickViewDialog);
      expect(props.copy.productGallery).toEqual(organisms(locale).productGallery);
      expect(props.copy.buyBox).toEqual(organisms(locale).buyBox);
      const markup = live(quickView, locale);
      expect(markup).toContain('data-slot="quick-view-trigger"');
      expect(markup).toContain(organisms(locale).quickViewDialog.open);
      expect(markup).toContain(
        `aria-label="${formatMessage(
          organisms(locale).quickViewDialog.openLabel,
          { title: fixture.product.title },
          htmlLang(locale),
        )}"`,
      );
      expect(markup).not.toContain('data-slot="quick-view"');
    });
  });

  describe("the states", () => {
    it.each(LOCALES)("draw the trigger alone, closed, of the ready fixture, in %s", (locale) => {
      const props = quickProps("trigger", locale);
      expect(props.product).toEqual(page(locale).buyBox.ready.product);
      expect(props.defaultOpen).toBeUndefined();
      expect(html(quickView, "trigger", locale)).toContain('data-slot="quick-view-trigger"');
    });

    it.each(LOCALES)(
      "draw the open states in a box, open, not modal, capped and still, in %s",
      (locale) => {
        for (const stateId of openQuickStateIds) {
          const { height, name } = quickBox(stateId, locale);
          expect(height, stateId).toBeGreaterThanOrEqual(700);
          expect(name, stateId).toBe(state(quickView, stateId).label);
          const props = quickProps(stateId, locale);
          expect(props.defaultOpen, stateId).toBe(true);
          expect(props.modal, stateId).toBe(false);
          expect(props.popupClassName, stateId).toContain("max-h-[calc(100%-2rem)]");
          expect(props.popupClassName, stateId).toContain("duration-0");
        }
      },
    );

    it.each(LOCALES)(
      "start from nothing chosen, from a full choice and from the long labels, in %s",
      (locale) => {
        expect(quickProps("open-empty", locale).selection).toEqual({});
        expect(quickProps("open-chosen", locale).selection).toEqual(
          page(locale).buyBox.ready.selection,
        );
        const long = quickProps("open-long", locale);
        expect(long.product.title).toBe(commerceFixtures[locale].long.product.title);
        expect(long.notes).toEqual([
          createContext(locale).fixture.long.helpText,
          createContext(locale).fixture.long.errorText,
        ]);
      },
    );

    it("hold the buy box's copy, the gallery's and the dialog's, as the quick view needs", () => {
      for (const locale of LOCALES) {
        for (const stateId of [undefined, ...quickStateIds]) {
          const { copy } = quickProps(stateId, locale);
          expect(Object.keys(copy).sort(), `${stateId} ${locale}`).toEqual(
            [
              "buyBox",
              "variantSelector",
              "priceBlock",
              "quantityStepper",
              "stock",
              "rating",
              "quickViewDialog",
              "productGallery",
            ].sort(),
          );
        }
      }
    });
  });
});
