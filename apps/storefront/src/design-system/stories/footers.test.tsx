// Ours (T36, SETUP.md "Footers and site organisms (T36)"). The tests of the five footers' stories
// (D40, D46): the states the plan lists are there, each is drawn as its description says in every
// locale, the live render hands the footer the fixtures' content and nothing of its own, every
// link is drawn with `prefetch={false}`, no two states on a page share a landmark name, the
// two-tier footer's switcher is drawn open in a box that holds it, and what the minimal footer
// leaves out is said in its story. A story renders to static markup here (the storefront's tests
// have no DOM), so a popup drawn open, in a portal, is checked by the props that open it and by its
// box; the popup itself is the components' tests' and the design-system job's.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { Footer, FooterColumn, SocialNetwork } from "@shopblok/registry/contracts";
import { FooterMinimal } from "@shopblok/ui/organisms/footer/minimal";
import { FooterMultiColumn } from "@shopblok/ui/organisms/footer/multi-column";
import { FooterNewsletterFirst } from "@shopblok/ui/organisms/footer/newsletter-first";
import type { FooterProps } from "@shopblok/ui/organisms/footer/parts";
import { FooterTwoTier } from "@shopblok/ui/organisms/footer/two-tier";
import { FooterWordmark } from "@shopblok/ui/organisms/footer/wordmark";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { footerStories } from "./footers";

type Id = keyof typeof footerStories;

const components = {
  "headers-footers/footer-multi-column": FooterMultiColumn,
  "headers-footers/footer-newsletter-first": FooterNewsletterFirst,
  "headers-footers/footer-minimal": FooterMinimal,
  "headers-footers/footer-wordmark": FooterWordmark,
  "headers-footers/footer-two-tier": FooterTwoTier,
} as const;
const ids = Object.keys(components) as Id[];
const variants: Record<Id, string> = {
  "headers-footers/footer-multi-column": "multi-column",
  "headers-footers/footer-newsletter-first": "newsletter-first",
  "headers-footers/footer-minimal": "minimal",
  "headers-footers/footer-wordmark": "wordmark",
  "headers-footers/footer-two-tier": "two-tier",
};

const withColumns = [
  "bare",
  "no-newsletter",
  "long",
  "five-columns",
  "all-networks",
  "column-open",
];
const expectedStates: Record<Id, string[]> = {
  "headers-footers/footer-multi-column": withColumns,
  "headers-footers/footer-newsletter-first": withColumns,
  "headers-footers/footer-minimal": ["bare", "long", "all-networks"],
  "headers-footers/footer-wordmark": withColumns,
  "headers-footers/footer-two-tier": [...withColumns, "switcher-popover", "switcher-sheet"],
};
const columnIds = ids.filter((id) => id !== "headers-footers/footer-minimal");

const story = (id: Id) => footerStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const stateIds = (id: Id) => (story(id).states ?? []).map((each) => each.id);
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
const live = (id: Id, locale: Locale) =>
  renderToStaticMarkup(story(id).live(createContext(locale)));
const count = (markup: string, pattern: RegExp) => [...markup.matchAll(pattern)].length;
/** Text as `renderToStaticMarkup` writes it. */
const escaped = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
const plain = (text: string) => text.replace(/\s/g, " ");
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const fixtures = (locale: Locale) => commerceFixtures[locale];
// Written as a code point, so this file holds no em dash itself.
const EM_DASH = String.fromCodePoint(0x2014);
/** Classes that would cut a label instead of wrapping it (the `data-truncate` attribute is not one). */
const CLIPPING = /(?:^|\s)(?:whitespace-nowrap|truncate|line-clamp-\d|text-ellipsis)(?:\s|$)/m;
/** Every class attribute of a story's markup, one per line. */
const classesIn = (markup: string) =>
  [...markup.matchAll(/ class="([^"]*)"/g)].map((match) => match[1]).join("\n");

/** The first element of `type` in the tree of elements a story builds. */
function find<Props>(node: ReactNode, type: unknown): ReactElement<Props> {
  if (Array.isArray(node)) {
    for (const child of node as ReactNode[]) {
      try {
        return find<Props>(child, type);
      } catch {
        // Not in this child: try the next.
      }
    }
    throw new Error("not found");
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) throw new Error("not found");
  if (node.type === type) return node as ReactElement<Props>;
  return find<Props>(node.props.children, type);
}

const footerOf = (id: Id, stateId: string, locale: Locale = "en") =>
  find<FooterProps>(state(id, stateId).render(createContext(locale)), components[id]).props;
const liveFooter = (id: Id, locale: Locale = "en") =>
  find<FooterProps>(story(id).live(createContext(locale)), components[id]).props;
/** The props a footer takes that are the contract's own. */
const contractOf = (props: FooterProps) => ({
  storeName: props.storeName,
  homeHref: props.homeHref,
  columns: props.columns,
  newsletter: props.newsletter,
  social: props.social,
  legalLinks: props.legalLinks,
  paymentIcons: props.paymentIcons,
  marketSwitcher: props.marketSwitcher,
  market: props.market,
  copyright: props.copyright,
});

describe("the five footers' stories", () => {
  it("are the five entries, each with a summary of one sentence and a11y notes in full sentences", () => {
    expect(Object.keys(footerStories).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      expect(story(id).summary.trim(), id).not.toBe("");
      expect(
        story(id)
          .summary.trim()
          .split(/(?<=[.!?])\s/).length,
        `${id} is one sentence`,
      ).toBe(1);
      expect(story(id).summary.endsWith("."), id).toBe(true);
      expect(story(id).a11y.length, id).toBeGreaterThanOrEqual(6);
      for (const note of story(id).a11y) {
        expect(note.trim().endsWith("."), `${id}: ${note}`).toBe(true);
        expect(note.trim().length, `${id}: ${note}`).toBeGreaterThan(40);
      }
    }
  });

  it("name the landmarks, the switcher and the 44 px targets in their notes", () => {
    for (const id of ids) {
      const notes = story(id).a11y.join(" ");
      expect(notes, id).toContain("contentinfo");
      expect(notes, id).toContain("“Legal”");
      expect(notes, id).toContain("market switcher");
      expect(notes, id).toContain("44 px");
      expect(notes, id).toContain("Shopblok on Instagram");
    }
    for (const id of columnIds) {
      const notes = story(id).a11y.join(" ");
      expect(notes, id).toContain("“Footer”");
      expect(notes, id).toContain("Join our newsletter");
      expect(notes, id).toContain("Ways to pay");
    }
    // The accordion and its keyboard are in every note set that has columns.
    for (const id of columnIds.filter(
      (each) => each !== "headers-footers/footer-newsletter-first",
    )) {
      expect(story(id).a11y.join(" "), id).toContain("accordion");
    }
  });

  it("write nothing with an em dash", () => {
    for (const id of ids) {
      const words = [
        story(id).summary,
        ...story(id).a11y,
        ...(story(id).states ?? []).flatMap((part) => [part.label, part.description ?? ""]),
      ];
      for (const text of words) expect(text, id).not.toContain(EM_DASH);
    }
  });

  it("have the states the plan lists, in order", () => {
    for (const id of ids) expect(stateIds(id), id).toEqual(expectedStates[id]);
  });

  it("give each state a distinct id, a distinct label and a description", () => {
    for (const id of ids) {
      const states = story(id).states ?? [];
      expect(new Set(states.map((part) => part.id)).size, id).toBe(states.length);
      expect(new Set(states.map((part) => part.label)).size, id).toBe(states.length);
      for (const part of states) {
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
        expect((part.description ?? "").trim().length, `${id} ${part.id}`).toBeGreaterThan(20);
      }
    }
  });

  it("give each state the frame's whole width: a footer follows the window's breakpoints", () => {
    for (const id of ids) expect(story(id).statesLayout, id).toBe("stack");
  });

  it.each(LOCALES)("render the live render and every state in %s", (locale) => {
    const ctx = createContext(locale);
    for (const id of ids) {
      expect(renderToStaticMarkup(story(id).live(ctx)).length, id).toBeGreaterThan(2000);
      for (const part of story(id).states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(1000);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
        // One footer in a state, of the variant the page is about.
        expect(count(markup, /<footer[ >]/g), `${id} ${part.id}`).toBe(1);
        expect(markup, `${id} ${part.id}`).toContain(`data-variant="${variants[id]}"`);
      }
    }
  });
});

describe("the live renders", () => {
  it.each(ids)("hand %s the fixtures' footer, the catalogs' words and nothing else", (id) => {
    for (const locale of LOCALES) {
      const props = liveFooter(id, locale);
      expect(contractOf(props), locale).toEqual(fixtures(locale).footer.content);
      expect(props.copy, locale).toEqual(catalogs[locale].organisms.footer);
      expect(props.newsletterCopy, locale).toEqual(catalogs[locale].molecules.newsletterForm);
      expect(props.marketSwitcherCopy, locale).toEqual(catalogs[locale].molecules.marketSwitcher);
      expect(props.locale, locale).toBe(htmlLang(locale));
      expect(props.prefetch, locale).toBe(false);
      // M3's server action, the shop's own SVG and the design system's states are not the live render's.
      expect(props.newsletterAction, locale).toBeUndefined();
      expect(props.logo, locale).toBeUndefined();
      expect(props.drawn, locale).toBeUndefined();
      expect(props.headingLevel, locale).toBeUndefined();
    }
  });

  it.each(ids)("draw %s once, with the page's landmark names and nothing open", (id) => {
    for (const locale of LOCALES) {
      const markup = live(id, locale);
      const words = catalogs[locale].organisms.footer;
      expect(count(markup, /<footer[ >]/g), locale).toBe(1);
      expect(markup, locale).toContain(`aria-label="${escaped(words.legal)}"`);
      expect(markup, locale).toContain(escaped(plain(fixtures(locale).footer.content.copyright)));
      expect(markup, locale).not.toContain("data-overlay-box");
      expect(markup, locale).not.toContain('data-slot="market-switcher-popup"');
    }
  });

  it("draw the columns and the newsletter in every footer but the minimal one", () => {
    for (const id of columnIds) {
      const markup = live(id, "en");
      expect(markup, id).toContain('data-slot="footer-columns"');
      expect(markup, id).toContain('data-slot="footer-accordion"');
      expect(markup, id).toContain('data-slot="footer-column-grid"');
      expect(count(markup, /data-slot="newsletter-form"/g), id).toBe(1);
      expect(count(markup, /data-slot="footer-payments"/g), id).toBe(1);
      expect(markup, id).toContain("Careers");
    }
    const minimal = live("headers-footers/footer-minimal", "en");
    expect(minimal).not.toContain('data-slot="footer-columns"');
    expect(minimal).not.toContain('data-slot="newsletter-form"');
    expect(minimal).not.toContain('data-slot="footer-payments"');
    expect(minimal).not.toContain('data-slot="footer-logo"');
    expect(minimal).toContain('data-slot="footer-social"');
    expect(minimal).toContain('data-slot="market-switcher"');
  });

  it("draw each variant's own piece: the band, the wordmark and the bar", () => {
    expect(live("headers-footers/footer-newsletter-first", "en")).toContain(
      'data-slot="footer-band"',
    );
    expect(live("headers-footers/footer-multi-column", "en")).not.toContain(
      'data-slot="footer-band"',
    );
    expect(live("headers-footers/footer-wordmark", "en")).toContain('data-slot="footer-wordmark"');
    expect(live("headers-footers/footer-multi-column", "en")).not.toContain(
      'data-slot="footer-wordmark"',
    );
    expect(live("headers-footers/footer-two-tier", "en")).toContain('data-slot="footer-bar"');
    expect(live("headers-footers/footer-multi-column", "en")).not.toContain(
      'data-slot="footer-bar"',
    );
  });

  it("draw the two-tier footer's switcher in its bar, with the two triggers the widths share", () => {
    for (const locale of LOCALES) {
      const markup = live("headers-footers/footer-two-tier", locale);
      const bar = markup.slice(markup.indexOf('data-slot="footer-bar"'));
      expect(count(bar, /data-slot="market-switcher"/g), locale).toBe(1);
      // Two triggers in the markup, one for each width; the CSS shows one (the interaction check
      // opens the visible one at 375 and at 1440 px).
      expect(count(markup, /data-slot="market-switcher-trigger"/g), locale).toBe(2);
      expect(count(bar, /data-slot="market-switcher-trigger"/g), locale).toBe(2);
    }
  });

  it("give the plain form its own page to post to: no action in the live render", () => {
    for (const id of columnIds) expect(live(id, "en"), id).not.toMatch(/<form[^>]* action=/);
  });
});

describe("the states", () => {
  it("draw every link with prefetch off and the words the catalog gives", () => {
    for (const locale of LOCALES) {
      for (const id of ids) {
        for (const part of story(id).states ?? []) {
          const props = footerOf(id, part.id, locale);
          expect(props.prefetch, `${id} ${part.id}`).toBe(false);
          expect(props.locale, `${id} ${part.id}`).toBe(htmlLang(locale));
          expect(props.newsletterAction, `${id} ${part.id}`).toBeUndefined();
          expect(props.newsletterCopy, `${id} ${part.id}`).toEqual(
            catalogs[locale].molecules.newsletterForm,
          );
          expect(props.marketSwitcherCopy, `${id} ${part.id}`).toEqual(
            catalogs[locale].molecules.marketSwitcher,
          );
        }
      }
    }
  });

  it("draw the bare footer whole: the fixtures' two legal links and the copyright, nothing else", () => {
    for (const locale of LOCALES) {
      for (const id of ids) {
        const props = footerOf(id, "bare", locale);
        expect(contractOf(props), `${id} ${locale}`).toEqual({
          ...fixtures(locale).footer.bare,
          newsletter: undefined,
          market: undefined,
        });
        expect(props.newsletter, `${id} ${locale}`).toBeUndefined();
        expect(props.market, `${id} ${locale}`).toBeUndefined();
        const markup = html(id, "bare", locale);
        expect(markup, `${id} ${locale}`).not.toContain("<form");
        expect(markup, `${id} ${locale}`).not.toContain('data-slot="footer-columns"');
        expect(markup, `${id} ${locale}`).not.toContain('data-slot="footer-social"');
        expect(markup, `${id} ${locale}`).not.toContain('data-slot="footer-payments"');
        expect(markup, `${id} ${locale}`).not.toContain('data-slot="market-switcher"');
        expect(markup, `${id} ${locale}`).toContain(
          escaped(plain(fixtures(locale).footer.bare.copyright)),
        );
      }
    }
  });

  it.each(columnIds)(
    "draw %s without a newsletter and with everything else the fixtures have",
    (id) => {
      for (const locale of LOCALES) {
        const props = footerOf(id, "no-newsletter", locale);
        expect(props.newsletter, locale).toBeUndefined();
        expect(contractOf(props), locale).toEqual({
          ...fixtures(locale).footer.content,
          newsletter: undefined,
        });
        const markup = html(id, "no-newsletter", locale);
        expect(markup, locale).not.toContain('data-slot="newsletter-form"');
        expect(markup, locale).toContain('data-slot="footer-columns"');
      }
    },
  );

  it("draw the long state with the longest store name, the long column and the long link", () => {
    for (const locale of LOCALES) {
      const ctx = createContext(locale);
      const { long, footer } = fixtures(locale);
      for (const id of ids) {
        const props = footerOf(id, "long", locale);
        expect(props.storeName, `${id} ${locale}`).toBe(ctx.fixture.long.storeName);
        expect(props.columns[0], `${id} ${locale}`).toEqual(long.footerColumn);
        expect(props.columns, `${id} ${locale}`).toHaveLength(3);
        expect(props.legalLinks[0]?.label, `${id} ${locale}`).toBe(ctx.fixture.long.linkLabel);
        expect(props.legalLinks.slice(1), `${id} ${locale}`).toEqual(
          footer.content.legalLinks.slice(1),
        );
        expect(props.copyright, `${id} ${locale}`).toContain(ctx.fixture.long.storeName);
        const markup = html(id, "long", locale);
        expect(plain(markup), `${id} ${locale}`).toContain(
          escaped(plain(ctx.fixture.long.storeName)),
        );
        expect(plain(markup), `${id} ${locale}`).toContain(
          escaped(plain(ctx.fixture.long.linkLabel)),
        );
        if (id !== "headers-footers/footer-minimal") {
          expect(plain(markup), `${id} ${locale}`).toContain(
            escaped(plain(long.footerColumn.title)),
          );
        }
        expect(classesIn(markup), `${id} ${locale}`).not.toMatch(CLIPPING);
      }
    }
  });

  it("draw five columns, the most the contract takes, each one valid", () => {
    for (const locale of LOCALES) {
      for (const id of columnIds) {
        const props = footerOf(id, "five-columns", locale);
        expect(props.columns, `${id} ${locale}`).toHaveLength(5);
        for (const column of props.columns) {
          expect(FooterColumn.safeParse(column).success, `${id} ${locale} ${column.title}`).toBe(
            true,
          );
        }
        expect(new Set(props.columns.map((column) => column.title)).size).toBe(5);
        expect(Footer.safeParse(contractOf(props)).success, `${id} ${locale}`).toBe(true);
        // Five headings in the side-by-side copy and five triggers in the accordion.
        const markup = html(id, "five-columns", locale);
        expect(count(markup, /data-slot="footer-column"/g), `${id} ${locale}`).toBe(5);
        expect(count(markup, /data-slot="accordion-trigger"/g), `${id} ${locale}`).toBe(5);
      }
    }
    expect(stateIds("headers-footers/footer-minimal")).not.toContain("five-columns");
  });

  it("draw a profile on every one of the eight networks, in the contract's order", () => {
    for (const locale of LOCALES) {
      for (const id of ids) {
        const props = footerOf(id, "all-networks", locale);
        expect(
          props.social.map((profile) => profile.network),
          `${id} ${locale}`,
        ).toEqual(SocialNetwork.options);
        for (const profile of props.social) expect(profile.href).toMatch(/^https:\/\//);
        expect(Footer.safeParse(contractOf(props)).success, `${id} ${locale}`).toBe(true);
        expect(count(html(id, "all-networks", locale), /data-slot="footer-social-link"/g)).toBe(8);
      }
    }
  });

  it("draw a column open below md in the footers that have columns, and a note from md up", () => {
    for (const id of columnIds) {
      for (const locale of LOCALES) {
        expect(footerOf(id, "column-open", locale).drawn, `${id} ${locale}`).toEqual({ column: 1 });
        const markup = html(id, "column-open", locale);
        // Drawn for narrow windows only; the note takes its place from md.
        expect(markup, id).toContain('<div class="md:hidden"><footer');
        expect(markup, id).toContain(
          "The columns are an accordion in windows narrower than 768 px",
        );
        expect(markup, id).not.toContain("data-overlay-box");
        // Exactly one column is open: the second.
        expect(
          count(markup, /data-slot="accordion-trigger"[^>]*aria-expanded="true"/g) +
            count(markup, /aria-expanded="true"[^>]*data-slot="accordion-trigger"/g),
        ).toBe(1);
      }
    }
    expect(stateIds("headers-footers/footer-minimal")).not.toContain("column-open");
    for (const id of ids) {
      expect(live(id, "en"), id).not.toContain('aria-expanded="true"');
    }
  });

  it("name each state's navigations apart, and apart from the live render's", () => {
    for (const id of ids) {
      const live0 = liveFooter(id);
      const navs = [live0.copy.navigation];
      const legals = [live0.copy.legal];
      for (const part of story(id).states ?? []) {
        const { copy } = footerOf(id, part.id);
        navs.push(copy.navigation);
        legals.push(copy.legal);
        expect(copy.navigation, `${id} ${part.id}`).toBe(
          `${catalogs.en.organisms.footer.navigation} (${part.label})`,
        );
        expect(copy.legal, `${id} ${part.id}`).toBe(
          `${catalogs.en.organisms.footer.legal} (${part.label})`,
        );
      }
      expect(new Set(navs).size, `${id} navigation names`).toBe(navs.length);
      expect(new Set(legals).size, `${id} legal names`).toBe(legals.length);
    }
  });

  it("keep the rest of the words as the catalog has them", () => {
    for (const locale of LOCALES) {
      for (const id of ids) {
        for (const part of story(id).states ?? []) {
          const { copy } = footerOf(id, part.id, locale);
          expect({ ...copy, navigation: "", legal: "" }, `${id} ${part.id} ${locale}`).toEqual({
            ...catalogs[locale].organisms.footer,
            navigation: "",
            legal: "",
          });
        }
      }
    }
  });

  it("give props that serialize", () => {
    for (const id of ids) {
      for (const part of story(id).states ?? []) {
        const props = footerOf(id, part.id);
        expect(
          Object.values(props).filter((value) => typeof value === "function"),
          `${id} ${part.id}`,
        ).toEqual([]);
        expect(JSON.parse(JSON.stringify(props)), `${id} ${part.id}`).toEqual(props);
      }
    }
  });

  it("draw every state with nothing open and in no box, but the two-tier footer's switcher states", () => {
    const opens = ["column-open", "switcher-popover", "switcher-sheet"];
    for (const id of ids) {
      for (const part of story(id).states ?? []) {
        if (opens.includes(part.id)) continue;
        expect(footerOf(id, part.id).drawn, `${id} ${part.id}`).toBeUndefined();
        expect(html(id, part.id, "en"), `${id} ${part.id}`).not.toContain("data-overlay-box");
      }
    }
  });
});

describe("the two-tier footer's switcher, drawn open (D45)", () => {
  const id = "headers-footers/footer-two-tier";
  const open = (stateId: string, locale: Locale = "en") => {
    const markup = html(id, stateId, locale);
    expect(count(markup, /data-overlay-box/g), stateId).toBe(1);
    return markup;
  };
  /** The box's height and its name in a story's markup. */
  const box = (stateId: string) => {
    const markup = html(id, stateId, "en");
    return {
      height: Number(/block-size:(\d+)px/.exec(markup)?.[1]),
      name: /aria-label="([^"]*, drawn open)"/.exec(markup)?.[1],
    };
  };

  it("draws the popover and the sheet open, with the footer reduced to its logo and its bar", () => {
    for (const locale of LOCALES) {
      const popover = footerOf(id, "switcher-popover", locale);
      const sheet = footerOf(id, "switcher-sheet", locale);
      expect(popover.drawn, locale).toEqual({ switcher: "popover" });
      expect(sheet.drawn, locale).toEqual({ switcher: "drawer" });
      for (const props of [popover, sheet]) {
        // The market switcher is the point; the columns, the newsletter and the profiles are not.
        expect(props.columns, locale).toEqual([]);
        expect(props.newsletter, locale).toBeUndefined();
        expect(props.social, locale).toEqual([]);
        expect(props.marketSwitcher, locale).toBe(true);
        expect(props.market, locale).toEqual(fixtures(locale).footer.content.market);
      }
      for (const stateId of ["switcher-popover", "switcher-sheet"]) {
        const markup = open(stateId, locale);
        expect(markup).toContain('data-slot="footer-bar"');
        expect(markup).toContain('data-slot="footer-logo"');
        expect(markup).not.toContain('data-slot="footer-columns"');
        // No wrapper hides the box at either width: the switcher is in the bar at every width.
        expect(markup).not.toContain('md:hidden"><div role="group"');
        expect(markup).not.toContain('hidden md:block"><div role="group"');
      }
    }
  });

  it("gives the popover a box taller than the sheet's, and names each box for what is open", () => {
    expect(box("switcher-popover").height).toBeGreaterThan(box("switcher-sheet").height);
    expect(box("switcher-popover").height).toBeGreaterThanOrEqual(1000);
    expect(box("switcher-sheet").height).toBeGreaterThanOrEqual(700);
    expect(box("switcher-popover").name).toBe("Market switcher, popover, drawn open");
    expect(box("switcher-sheet").name).toBe("Market switcher, sheet, drawn open");
  });

  it("names the landmarks of the two boxes apart from each other and from the other states", () => {
    const navs = (story(id).states ?? []).map((part) => footerOf(id, part.id).copy.legal);
    expect(new Set(navs).size).toBe(navs.length);
    expect(navs).toContain("Legal (Market switcher, popover)");
    expect(navs).toContain("Legal (Market switcher, sheet)");
  });
});

describe("the minimal footer's story", () => {
  const id = "headers-footers/footer-minimal";

  it("says in its summary and notes what it leaves out, and why", () => {
    const summary = story(id).summary;
    for (const left of ["columns", "newsletter", "payment marks", "logo"]) {
      expect(summary, left).toContain(left);
    }
    expect(summary).toContain("a single row has no room for them");
    const notes = story(id).a11y.join(" ");
    for (const left of ["columns", "newsletter", "payment marks", "logo"]) {
      expect(notes, left).toContain(left);
    }
    expect(notes).toContain("on purpose");
  });

  it("has no states about columns or the newsletter, which it never draws", () => {
    expect(stateIds(id)).toEqual(["bare", "long", "all-networks"]);
  });

  it("is given the fixtures' content in the live render, whole, and draws only its own parts", () => {
    for (const locale of LOCALES) {
      const props = liveFooter(id, locale);
      expect(props.columns, locale).toHaveLength(3);
      expect(props.newsletter, locale).toBeDefined();
      expect(props.paymentIcons, locale).toHaveLength(8);
      const markup = live(id, locale);
      expect(markup, locale).not.toContain('data-slot="newsletter-form"');
      expect(markup, locale).not.toContain('data-slot="footer-columns"');
    }
  });
});

describe("the wordmark footer's story", () => {
  const id = "headers-footers/footer-wordmark";

  it("draws the wordmark in every state, hidden from assistive technology", () => {
    for (const locale of LOCALES) {
      for (const part of story(id).states ?? []) {
        const markup = html(id, part.id, locale);
        expect(markup, `${part.id} ${locale}`).toContain(
          'aria-hidden="true" data-slot="footer-wordmark"',
        );
      }
    }
  });

  it("sets the longest store name large, and lets it wrap", () => {
    for (const locale of LOCALES) {
      const markup = html(id, "long", locale);
      const name = escaped(plain(createContext(locale).fixture.long.storeName));
      const wordmark = markup.slice(markup.indexOf('data-slot="footer-wordmark"'));
      expect(plain(wordmark), locale).toContain(name);
      expect(wordmark, locale).toContain("wrap-anywhere");
      expect(wordmark, locale).toMatch(/font-size:\d+(\.\d+)?cqw/);
    }
  });
});
