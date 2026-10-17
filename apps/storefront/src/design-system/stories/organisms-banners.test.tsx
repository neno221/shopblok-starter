import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, countryName, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { AnnouncementBar } from "@shopblok/ui/organisms/announcement-bar";
import { MarketSuggestionBanner } from "@shopblok/ui/organisms/market-suggestion-banner";
import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { bannerOrganismStories } from "./organisms-banners";

// The stories of AnnouncementBar and MarketSuggestionBanner (T35; D40): the states the task lists
// are there, each shows what its description says in every locale, nothing in a state moves, every
// link is told not to prefetch, and the props that reach a client part serialize, because a story
// renders on the server. A story renders to static markup here (the storefront's tests have no
// DOM), so the bar's timer, its controls' behaviour and the banner's button are the ui package's
// tests and the design-system job's.

/** The one character the house style leaves out of every sentence. */
const EM_DASH = String.fromCharCode(0x2014);

type Id = keyof typeof bannerOrganismStories;

const bar = "organisms/announcement-bar";
const banner = "organisms/market-suggestion-banner";

const story = (id: Id) => bannerOrganismStories[id];
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
const header = (locale: Locale) => commerceFixtures[locale].header;

/** The element a story returns, which is the component itself: its props are what the story chose. */
function rendered<Props>(node: ReactNode, type: unknown): ReactElement<Props> {
  if (!isValidElement<Props>(node) || node.type !== type) throw new Error("not the component");
  return node;
}
const barProps = (id: Id, stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  const node = stateId === undefined ? story(id).live(ctx) : state(id, stateId).render(ctx);
  return rendered<ComponentProps<typeof AnnouncementBar>>(node, AnnouncementBar).props;
};
const bannerProps = (stateId: string | undefined, locale: Locale) => {
  const ctx = createContext(locale);
  const node = stateId === undefined ? story(banner).live(ctx) : state(banner, stateId).render(ctx);
  return rendered<ComponentProps<typeof MarketSuggestionBanner>>(node, MarketSuggestionBanner)
    .props;
};

/** The text of the message in view, from the markup. */
function shownMessage(markup: string): string | undefined {
  return /data-slot="announcement-bar-message" data-current="true"[^>]*>(?:<span class="sr-only">[^<]*<\/span>)?<span[^>]*data-slot="announcement-bar-text"[^>]*>([^<]*)</.exec(
    markup,
  )?.[1];
}

describe("the banner organisms' stories", () => {
  it("are one for each of the two entries, each with a summary and a11y notes", () => {
    expect(Object.keys(bannerOrganismStories).sort()).toEqual([bar, banner]);
    for (const [id, each] of Object.entries(bannerOrganismStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.summary.trim().endsWith("."), id).toBe(true);
      expect(each.a11y.length, id).toBeGreaterThan(0);
      for (const note of each.a11y) {
        expect(note.trim().endsWith("."), `${id}: ${note.slice(0, 30)}`).toBe(true);
      }
    }
  });

  it("have the states the task lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids(bar)).toEqual([
      "single",
      "rotating-first",
      "rotating-second",
      "long",
      "rotating-long",
    ]);
    expect(ids(banner)).toEqual(["copy-message", "shop-message", "long-country", "long-current"]);
  });

  it("give each state a distinct id, a label and a description", () => {
    for (const [id, each] of Object.entries(bannerOrganismStories)) {
      const ids = (each.states ?? []).map((part) => part.id);
      expect(new Set(ids).size, id).toBe(ids.length);
      for (const part of each.states ?? []) {
        expect(part.label.trim(), `${id} ${part.id}`).not.toBe("");
        expect(part.description?.trim() ?? "", `${id} ${part.id}`).not.toBe("");
      }
    }
  });

  it("use no em dash anywhere in their words", () => {
    for (const [id, each] of Object.entries(bannerOrganismStories)) {
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
    for (const [id, each] of Object.entries(bannerOrganismStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(300);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(300);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
      }
    }
  });

  it("give the components props that serialize (a story renders on the server)", () => {
    for (const locale of LOCALES) {
      const everyProps = [
        barProps(bar, undefined, locale),
        ...(story(bar).states ?? []).map((part) => barProps(bar, part.id, locale)),
        bannerProps(undefined, locale),
        ...(story(banner).states ?? []).map((part) => bannerProps(part.id, locale)),
      ];
      for (const props of everyProps) {
        expect(Object.values(props).filter((value) => typeof value === "function")).toEqual([]);
        expect(JSON.parse(JSON.stringify(props))).toEqual(props);
      }
    }
  });
});

describe("AnnouncementBar's stories", () => {
  it.each(LOCALES)("rotates the three messages in the live render, in %s", (locale) => {
    const markup = live(bar, locale);
    const { rotating } = header(locale).announcements;
    expect(count(markup, /data-slot="announcement-bar-message"/g)).toBe(3);
    expect(shownMessage(markup)).toBe(escaped(rotating.messages[0]?.message ?? ""));
    // Rotating, not paused: the pause control says Pause, and the messages are not announced.
    expect(markup).toContain(
      `aria-label="${escaped(catalogs[locale].organisms.announcementBar.pause)}"`,
    );
    expect(markup).toContain('data-state="rotating"');
    expect(markup).toContain('aria-live="off"');
    expect(barProps(bar, undefined, locale).defaultPaused).toBeUndefined();
  });

  it.each(LOCALES)(
    "draws each of the three messages with its link in the markup, in %s",
    (locale) => {
      const markup = plain(live(bar, locale));
      for (const each of header(locale).announcements.rotating.messages) {
        expect(markup).toContain(escaped(plain(each.message)));
        expect(markup).toContain(escaped(plain(each.link?.label ?? "")));
        expect(markup).toContain(`href="${each.link?.href}"`);
      }
    },
  );

  it("stands every state still: a bar with several messages is drawn paused at the one it names", () => {
    for (const locale of LOCALES) {
      for (const part of story(bar).states ?? []) {
        const props = barProps(bar, part.id, locale);
        if (props.messages.length > 1) {
          expect(props.defaultPaused, `${part.id} in ${locale}`).toBe(true);
          expect(props.defaultIndex, `${part.id} in ${locale}`).toBeTypeOf("number");
        }
        const markup = html(bar, part.id, locale);
        // No timer to wait for: a paused bar says so, and its messages are a polite region.
        if (props.messages.length > 1) {
          expect(markup, part.id).toContain('data-state="paused"');
          expect(markup, part.id).toContain('aria-live="polite"');
          expect(markup, part.id).not.toContain('data-state="rotating"');
        }
      }
    }
  });

  it.each(LOCALES)(
    "draws the one-message state with no controls and no close button, in %s",
    (locale) => {
      const markup = html(bar, "single", locale);
      expect(count(markup, /data-slot="announcement-bar-message"/g)).toBe(1);
      expect(markup).toContain('data-state="single"');
      for (const control of ["pause", "previous", "next", "dismiss"]) {
        expect(markup, control).not.toContain(`data-slot="announcement-bar-${control}"`);
      }
      expect(shownMessage(markup)).toBe(
        escaped(header(locale).announcements.single.messages[0]?.message ?? ""),
      );
      expect(barProps(bar, "single", locale).dismissible).toBe(false);
    },
  );

  it.each(LOCALES)(
    "draws the rotating states paused at the first and at the second message, in %s",
    (locale) => {
      const copy = catalogs[locale].organisms.announcementBar;
      const { messages } = header(locale).announcements.rotating;
      for (const [stateId, index] of [
        ["rotating-first", 0],
        ["rotating-second", 1],
      ] as const) {
        const markup = html(bar, stateId, locale);
        expect(shownMessage(markup), stateId).toBe(escaped(messages[index]?.message ?? ""));
        expect(barProps(bar, stateId, locale).defaultIndex, stateId).toBe(index);
        // Paused, so the pause control says Play; the rest of the controls are there.
        expect(markup, stateId).toContain(`aria-label="${escaped(copy.play)}"`);
        for (const control of ["pause", "previous", "next", "dismiss"]) {
          expect(markup, `${stateId} ${control}`).toContain(
            `data-slot="announcement-bar-${control}"`,
          );
        }
        // The position, in the locale's words.
        const words = formatMessage(
          copy.position,
          { current: index + 1, total: 3 },
          htmlLang(locale),
        );
        expect(plain(markup), stateId).toContain(escaped(plain(words)));
      }
    },
  );

  it.each(LOCALES)("draws the long message, its long link and a close button, in %s", (locale) => {
    const markup = plain(html(bar, "long", locale));
    const [only] = header(locale).announcements.long.messages;
    expect(only?.message.length).toBeGreaterThan(100);
    expect(markup).toContain(escaped(plain(only?.message ?? "")));
    expect(markup).toContain(escaped(plain(only?.link?.label ?? "")));
    expect(markup).toContain('data-slot="announcement-bar-dismiss"');
    expect(markup).toContain("wrap-break-word");
  });

  it.each(LOCALES)("puts a long message among short ones, the first in view, in %s", (locale) => {
    const props = barProps(bar, "rotating-long", locale);
    const { rotating, long } = header(locale).announcements;
    expect(props.messages.map((each) => each.message)).toEqual([
      rotating.messages[0]?.message,
      long.messages[0]?.message,
      rotating.messages[2]?.message,
    ]);
    const markup = html(bar, "rotating-long", locale);
    expect(shownMessage(markup)).toBe(escaped(rotating.messages[0]?.message ?? ""));
    // The long one is in the markup, hidden, and shares the cell: that is what keeps the height.
    expect(plain(markup)).toContain(escaped(plain(long.messages[0]?.message ?? "")));
    expect(count(markup, /col-start-1 row-start-1/g)).toBe(3);
  });

  it("is told not to prefetch any link, in the live render and in every state", () => {
    for (const locale of LOCALES) {
      expect(barProps(bar, undefined, locale).prefetch, locale).toBe(false);
      for (const part of story(bar).states ?? []) {
        expect(barProps(bar, part.id, locale).prefetch, `${part.id} in ${locale}`).toBe(false);
      }
    }
  });

  it.each(LOCALES)(
    "takes its words from the locale's catalog and its locale from the market, in %s",
    (locale) => {
      for (const props of [
        barProps(bar, undefined, locale),
        barProps(bar, "rotating-first", locale),
      ]) {
        expect(props.copy).toEqual(catalogs[locale].organisms.announcementBar);
        expect(props.locale).toBe(htmlLang(locale));
      }
    },
  );
});

describe("MarketSuggestionBanner's stories", () => {
  const home = { en: "us", el: "cy", de: "de", fr: "ch" } as const;
  const copyOf = (locale: Locale) => catalogs[locale].organisms.marketSuggestionBanner;

  it.each(LOCALES)("shows the copy's suggestion in the live render, in %s", (locale) => {
    const markup = plain(live(banner, locale));
    const { copy } = header(locale).suggestions;
    const country = countryName(copy.suggested.country, htmlLang(locale));
    const sentence = formatMessage(
      copyOf(locale).message,
      { country, currency: copy.suggested.currencyCode },
      htmlLang(locale),
    );
    expect(markup).toContain(escaped(plain(sentence)));
    expect(markup).toContain(`href="${copy.suggested.href}"`);
    expect(markup).toContain(`hrefLang="${copy.suggested.htmlLang}"`);
    expect(markup).toContain('data-slot="market-suggestion-go"');
    expect(markup).toContain('data-slot="market-suggestion-stay"');
    expect(markup).toContain('data-slot="flag"');
  });

  it.each(LOCALES)(
    "names the country to go to and the country to stay in, in the page's language, in %s",
    (locale) => {
      const markup = plain(html(banner, "copy-message", locale));
      const { copy } = header(locale).suggestions;
      const go = formatMessage(
        copyOf(locale).go,
        { country: countryName(copy.suggested.country, htmlLang(locale)) },
        htmlLang(locale),
      );
      const stay = formatMessage(
        copyOf(locale).stay,
        { current: countryName(home[locale], htmlLang(locale)) },
        htmlLang(locale),
      );
      expect(markup).toContain(`>${escaped(plain(go))}</a>`);
      expect(markup).toContain(escaped(plain(stay)));
    },
  );

  it.each(LOCALES)("shows the shop's own message in place of the copy's, in %s", (locale) => {
    const own = header(locale).suggestions.message;
    expect(own.message).toBeTruthy();
    const markup = plain(html(banner, "shop-message", locale));
    expect(markup).toContain(escaped(plain(own.message ?? "")));
    const country = countryName(own.suggested.country, htmlLang(locale));
    const copysOwn = formatMessage(
      copyOf(locale).message,
      { country, currency: own.suggested.currencyCode },
      htmlLang(locale),
    );
    expect(markup).not.toContain(escaped(plain(copysOwn)));
    // The copy's message state shows the copy's, not the shop's.
    expect(plain(html(banner, "copy-message", locale))).not.toContain(
      escaped(plain(own.message ?? "")),
    );
  });

  it.each(LOCALES)("suggests South Georgia in the long-country state, in %s", (locale) => {
    const markup = plain(html(banner, "long-country", locale));
    const name = countryName("gs", htmlLang(locale));
    expect(name.length).toBeGreaterThan(20);
    expect(
      count(markup, new RegExp(escaped(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")),
    ).toBeGreaterThanOrEqual(2);
    expect(markup).toContain(`href="${commerceFixtures[locale].prefix}/gs"`);
    expect(markup).toContain('hrefLang="en-GB"');
    expect(markup).toContain("GBP");
    // The visitor's own country is the market's.
    expect(bannerProps("long-country", locale).suggestion?.current.country).toBe(home[locale]);
  });

  it.each(LOCALES)(
    "puts South Georgia on the stay button in the long-current state, in %s",
    (locale) => {
      const markup = plain(html(banner, "long-current", locale));
      const stay = formatMessage(
        copyOf(locale).stay,
        { current: countryName("gs", htmlLang(locale)) },
        htmlLang(locale),
      );
      expect(markup).toContain(escaped(plain(stay)));
      expect(bannerProps("long-current", locale).suggestion?.current.country).toBe("gs");
    },
  );

  it("takes its words from the locale's catalog and its locale from the market", () => {
    for (const locale of LOCALES) {
      for (const props of [bannerProps(undefined, locale), bannerProps("copy-message", locale)]) {
        expect(props.copy).toEqual(copyOf(locale));
        expect(props.locale).toBe(htmlLang(locale));
      }
    }
  });

  it("draws a suggestion in every state, since a banner with none draws nothing", () => {
    for (const locale of LOCALES) {
      for (const part of story(banner).states ?? []) {
        expect(bannerProps(part.id, locale).suggestion, `${part.id} in ${locale}`).toBeDefined();
        expect(html(banner, part.id, locale), `${part.id} in ${locale}`).toContain(
          'data-slot="market-suggestion-banner"',
        );
      }
    }
  });
});
