import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, countryName, LOCALES, type Locale } from "@shopblok/i18n";
import { MarketSwitcher } from "@shopblok/ui/molecules/market-switcher";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { ToastDemo } from "../components/toast-demo";
import { siteMoleculeStories } from "./molecules-site";

// The stories of MarketSwitcher, AccordionItem and Toast (T33; D40): the states the plan lists are
// there, each shows what its description says in every locale, and the one client component gets
// props that serialize, because a story renders on the server. A story renders to static markup
// here (the storefront's tests have no DOM), so an overlay drawn open is checked by its trigger
// (`aria-expanded`) and its box; its popup, in a portal, is the component tests' and the
// design-system job's.

type Id = keyof typeof siteMoleculeStories;

const story = (id: Id) => siteMoleculeStories[id];
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
/** Text as `renderToStaticMarkup` writes it, with spaces folded. */
const escaped = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
const plain = (text: string) => text.replace(/\s/g, " ");
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;

const marketSwitcher = "molecules/market-switcher";
const accordionItem = "molecules/accordion-item";
const toast = "molecules/toast";

describe("the site molecules' stories", () => {
  it("are one for each of the three entries, each with a summary and a11y notes", () => {
    expect(Object.keys(siteMoleculeStories).sort()).toEqual([accordionItem, marketSwitcher, toast]);
    for (const [id, each] of Object.entries(siteMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("have the states the plan lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(marketSwitcher)).toEqual([
      "closed",
      "closed-long",
      "popover",
      "sheet",
      "long-names",
    ]);
    expect(ids(accordionItem)).toEqual(["closed", "open", "multiple", "heading-level", "long"]);
    expect(ids(toast)).toEqual(["success", "error", "info", "no-description", "long"]);
  });

  it("give each state a distinct id and a label", () => {
    for (const [id, each] of Object.entries(siteMoleculeStories)) {
      const ids = (each.states ?? []).map((part) => part.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      for (const part of each.states ?? [])
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
    }
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(siteMoleculeStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(100);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
      }
    }
  });
});

describe("MarketSwitcher's stories", () => {
  it.each(LOCALES)(
    "draws both triggers in the live render, in %s, named for the market",
    (locale) => {
      const markup = live(marketSwitcher, locale);
      // The interaction check presses the visible one of these.
      expect(count(markup, /data-slot="market-switcher-trigger"/g)).toBe(2);
      expect(markup).toContain("max-md:hidden");
      expect(markup).toContain("md:hidden");
      const { trigger } = catalogs[locale].molecules.marketSwitcher;
      const lead = plain(trigger.split("{")[0] ?? "").trim();
      expect(plain(markup)).toContain(`aria-label="${lead}`);
      // A popup is not in the markup before it is opened.
      expect(markup).not.toContain('data-slot="market-switcher-popup"');
      expect(count(markup, /aria-expanded="true"/g)).toBe(0);
    },
  );

  it.each(LOCALES)("names the market the page is in, in %s", (locale) => {
    const { country } = {
      en: { country: "us" },
      el: { country: "cy" },
      de: { country: "de" },
      fr: { country: "ch" },
    }[locale];
    const markup = plain(live(marketSwitcher, locale));
    expect(markup).toContain(escaped(countryName(country, htmlLang(locale))));
  });

  it.each(LOCALES)("draws the closed states with one trigger and no popup, in %s", (locale) => {
    for (const stateId of ["closed", "closed-long"]) {
      const markup = html(marketSwitcher, stateId, locale);
      expect(count(markup, /data-slot="market-switcher-trigger"/g), stateId).toBe(1);
      expect(markup, stateId).not.toMatch(/max-md:hidden|(?:^|[\s"])md:hidden/);
      expect(markup, stateId).toContain('aria-expanded="false"');
      expect(markup, stateId).not.toContain("data-overlay-box");
    }
  });

  it.each(LOCALES)("names the long country in the trigger of its closed state, in %s", (locale) => {
    const markup = plain(html(marketSwitcher, "closed-long", locale));
    const name = countryName("gs", htmlLang(locale));
    expect(name.length).toBeGreaterThan(20);
    expect(markup).toContain(escaped(name));
    expect(markup).toContain("wrap-anywhere");
  });

  /** The MarketSwitcher a state draws, found in the element tree it returns. */
  function switcherIn(node: ReactNode): ReactElement<Record<string, unknown>> {
    if (!isValidElement<{ children?: ReactNode }>(node)) throw new Error("no MarketSwitcher");
    if (node.type === MarketSwitcher) return node as ReactElement<Record<string, unknown>>;
    return switcherIn(node.props.children);
  }

  it.each(LOCALES)("draws the open states in a box, one form each, in %s", (locale) => {
    for (const [stateId, form] of [
      ["popover", "popover"],
      ["sheet", "drawer"],
      ["long-names", "popover"],
    ] as const) {
      const markup = html(marketSwitcher, stateId, locale);
      expect(count(markup, /data-overlay-box/g), stateId).toBe(1);
      expect(count(markup, /data-slot="market-switcher-trigger"/g), stateId).toBe(1);
      // The server draws the trigger; the popup opens when the client has hydrated (`defaultOpen`),
      // in the box's portal, without making the frame inert (`modal={false}`).
      const { props } = switcherIn(state(marketSwitcher, stateId).render(createContext(locale)));
      expect(props.form, stateId).toBe(form);
      expect(props.defaultOpen, stateId).toBe(true);
      expect(props.modal, stateId).toBe(false);
    }
  });

  it("stands the sheet still in its box: no slide-in and no bleed under its edge", () => {
    const { props } = switcherIn(state(marketSwitcher, "sheet").render(createContext("en")));
    expect(props.popupClassName).toContain("duration-0");
    expect(props.popupClassName).toContain("[--bleed:0px]");
    const popover = switcherIn(state(marketSwitcher, "popover").render(createContext("en")));
    expect(popover.props.popupClassName).toBeUndefined();
  });

  it("gives the market switcher's props that serialize apart from the server-rendered flags", () => {
    const { props } = switcherIn(state(marketSwitcher, "popover").render(createContext("en")));
    expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
    expect(JSON.parse(JSON.stringify(props))).toEqual(props);
  });

  it("names each box differently, so the groups of one frame can be told apart", () => {
    const ctx = createContext("en");
    const names = ["popover", "sheet", "long-names"].map(
      (stateId) =>
        /aria-label="([^"]*, drawn open)"/.exec(
          renderToStaticMarkup(state(marketSwitcher, stateId).render(ctx)),
        )?.[1],
    );
    expect(names.every((name) => name !== undefined)).toBe(true);
    expect(new Set(names).size).toBe(3);
  });

  it("gives the long market's currency and a language of its own to the long states", () => {
    const ctx = createContext("en");
    // The long state adds a seventh country, whose trigger-less list is in the popup: the closed
    // one shows it as the market the page is in.
    const markup = plain(renderToStaticMarkup(state(marketSwitcher, "closed-long").render(ctx)));
    expect(markup).toContain("GBP");
    expect(markup).toContain("English");
  });
});

describe("AccordionItem's stories", () => {
  const items = (locale: Locale) => commerceFixtures[locale].site.faq.items;
  const expanded = (markup: string) => count(markup, /aria-expanded="true"/g);

  it.each(LOCALES)("shows the FAQ's five questions as buttons in headings, in %s", (locale) => {
    const markup = live(accordionItem, locale);
    expect(count(markup, /<h3[ >]/g)).toBe(5);
    expect(count(markup, /data-slot="accordion-trigger"/g)).toBe(5);
    for (const item of items(locale)) expect(plain(markup)).toContain(escaped(plain(item.title)));
  });

  it.each(LOCALES)(
    "opens one section in the live render, and its answer is in the markup, in %s",
    (locale) => {
      const markup = live(accordionItem, locale);
      expect(expanded(markup)).toBe(1);
      const first = items(locale)[0];
      expect(plain(markup)).toContain(escaped(plain(first?.answer[0] ?? "")));
      // A closed section's answer is not.
      expect(plain(markup)).not.toContain(escaped(plain(items(locale)[1]?.answer[0] ?? "")));
    },
  );

  it.each(LOCALES)("draws each state as it says, in %s", (locale) => {
    expect(expanded(html(accordionItem, "closed", locale))).toBe(0);
    expect(expanded(html(accordionItem, "open", locale))).toBe(1);
    expect(expanded(html(accordionItem, "multiple", locale))).toBe(2);
    const level = html(accordionItem, "heading-level", locale);
    expect(count(level, /<h2[ >]/g)).toBe(5);
    expect(count(level, /<h3[ >]/g)).toBe(0);
    const long = html(accordionItem, "long", locale);
    expect(count(long, /data-slot="accordion-trigger"/g)).toBe(1);
    expect(expanded(long)).toBe(1);
    const sample = commerceFixtures[locale].site.faq.long;
    expect(plain(long)).toContain(escaped(plain(sample.title)));
    for (const paragraph of sample.answer) expect(plain(long)).toContain(escaped(plain(paragraph)));
  });

  it("makes the long question longer than the ordinary ones, in every locale", () => {
    for (const locale of LOCALES) {
      const longest = Math.max(...items(locale).map((item) => item.title.length));
      expect(commerceFixtures[locale].site.faq.long.title.length).toBeGreaterThan(longest);
    }
  });
});

describe("Toast's stories", () => {
  const kindWords = (locale: Locale) => catalogs[locale].molecules.toast.kinds;
  const samples = (locale: Locale) => commerceFixtures[locale].site.toasts;

  /** The element `live` returns, a `ToastDemo`. */
  function demoOf(node: ReactNode) {
    if (!isValidElement<React.ComponentProps<typeof ToastDemo>>(node) || node.type !== ToastDemo) {
      throw new Error("the live render is not a ToastDemo");
    }
    return node;
  }

  it.each(LOCALES)(
    "draws one trigger for each kind in the live render, success first, in %s",
    (locale) => {
      const markup = live(toast, locale);
      expect(count(markup, /data-slot="toast-trigger"/g)).toBe(3);
      expect([...markup.matchAll(/data-kind="(\w+)"/g)].map((each) => each[1])).toEqual([
        "success",
        "error",
        "info",
      ]);
      for (const kind of ["success", "error", "info"] as const) {
        expect(plain(markup)).toContain(escaped(plain(samples(locale)[kind].trigger)));
      }
      // A toast shows when a trigger is pressed, not before.
      expect(markup).not.toContain('data-slot="toast"');
    },
  );

  it("gives the demo props that serialize (a story renders on the server)", () => {
    for (const locale of LOCALES) {
      const { props } = demoOf(story(toast).live(createContext(locale)));
      expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
      expect(JSON.parse(JSON.stringify(props))).toEqual(props);
      expect(props.samples.map((sample) => sample.message.kind)).toEqual([
        "success",
        "error",
        "info",
      ]);
      expect(props.copy).toEqual(catalogs[locale].molecules.toast);
    }
  });

  it.each(LOCALES)("draws each kind's card with the kind in words and an icon, in %s", (locale) => {
    for (const kind of ["success", "error", "info"] as const) {
      const markup = html(toast, kind, locale);
      expect(markup, kind).toContain(`data-kind="${kind}"`);
      expect(plain(markup), kind).toContain(`>${escaped(plain(kindWords(locale)[kind]))}</p>`);
      expect(markup, kind).toContain('data-slot="toast-icon"');
      expect(plain(markup), kind).toContain(escaped(plain(samples(locale)[kind].message.title)));
      // A drawing: Base UI's toast is the live one's, `data-slot="toast"`.
      expect(markup, kind).not.toContain('data-slot="toast"');
    }
  });

  it.each(LOCALES)(
    "draws the description and the action only where the message has them, in %s",
    (locale) => {
      const success = html(toast, "success", locale);
      expect(success).toContain('data-slot="toast-card-description"');
      expect(success).toContain('data-slot="toast-card-action"');
      const error = html(toast, "error", locale);
      expect(error).toContain('data-slot="toast-card-description"');
      expect(error).not.toContain('data-slot="toast-card-action"');
      const info = html(toast, "info", locale);
      expect(info).not.toContain('data-slot="toast-card-description"');
      expect(info).not.toContain('data-slot="toast-card-action"');
      const bare = html(toast, "no-description", locale);
      expect(bare).not.toContain('data-slot="toast-card-description"');
      expect(bare).toContain('data-slot="toast-card-action"');
      // Every card has its close button, named in the locale's words.
      for (const stateId of ["success", "error", "info", "no-description", "long"]) {
        expect(plain(html(toast, stateId, locale)), stateId).toContain(
          `aria-label="${escaped(plain(catalogs[locale].molecules.toast.close))}"`,
        );
      }
    },
  );

  it.each(LOCALES)(
    "draws the long toast with its long title, description and action, in %s",
    (locale) => {
      const markup = plain(html(toast, "long", locale));
      const { message } = samples(locale).long;
      expect(markup).toContain(escaped(plain(message.title)));
      expect(markup).toContain(escaped(plain(message.description ?? "")));
      expect(markup).toContain(escaped(plain(message.actionLabel ?? "")));
      expect(message.title.length).toBeGreaterThan(samples(locale).success.message.title.length);
    },
  );
});
