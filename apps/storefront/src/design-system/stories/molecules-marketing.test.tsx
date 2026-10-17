import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createContext } from "../context";
import { marketingMoleculeStories } from "./molecules-marketing";

// The three marketing molecules' stories (T33; D40): the states the plan lists are there, each one
// shows what its description says in every locale, the client parts get props that serialize
// (a story renders on the server), and the ids of the states side by side never collide.

type Id = keyof typeof marketingMoleculeStories;

const story = (id: Id) => marketingMoleculeStories[id];
const state = (id: Id, stateId: string) => {
  const found = story(id).states?.find((candidate) => candidate.id === stateId);
  if (found === undefined) throw new Error(`${id} has no state ${stateId}`);
  return found;
};
const html = (id: Id, stateId: string, locale: Locale) =>
  renderToStaticMarkup(state(id, stateId).render(createContext(locale)));
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string) => text.replace(/\s/g, " ");
const text = (markup: string) => plain(markup.replace(/<[^>]*>/g, "").replace(/\s+/g, " "));
const htmlLang = (locale: Locale) => createContext(locale).fixture.market.htmlLang;
const marketing = (locale: Locale) => commerceFixtures[locale].marketing;
const catalog = (locale: Locale) => catalogs[locale].molecules;

/** What a server component hands to its client part: the element it returns, called as React would. */
function handedOver(node: ReactNode): ReactElement<Record<string, unknown>> {
  if (!isValidElement<Record<string, unknown>>(node) || typeof node.type !== "function")
    throw new Error("not a component element");
  const returned = (node.type as (props: Record<string, unknown>) => ReactNode)(node.props);
  if (!isValidElement<Record<string, unknown>>(returned)) throw new Error("not an element");
  return returned;
}

describe("the marketing molecules' stories", () => {
  it("are one for each of the three entries, each with a summary and a11y notes", () => {
    expect(Object.keys(marketingMoleculeStories).sort()).toEqual([
      "molecules/copy-code-chip",
      "molecules/countdown-timer",
      "molecules/newsletter-form",
    ]);
    for (const [id, each] of Object.entries(marketingMoleculeStories)) {
      expect(each.summary.trim(), id).not.toBe("");
      expect(each.a11y.length, id).toBeGreaterThan(0);
    }
  });

  it("have the states the plan lists", () => {
    const ids = (id: Id) => (story(id).states ?? []).map((each) => each.id);
    expect(ids("molecules/newsletter-form")).toEqual([
      "idle",
      "filled",
      "sending",
      "done",
      "error",
      "long",
    ]);
    expect(ids("molecules/copy-code-chip")).toEqual([
      "default",
      "copied",
      "clipboard-refused",
      "long",
      "long-refused",
    ]);
    expect(ids("molecules/countdown-timer")).toEqual([
      "days",
      "hours",
      "last-minute",
      "ended",
      "many-days",
      "market-time-zone",
    ]);
  });

  it.each(LOCALES)("render every state and the live render in %s", (locale) => {
    const ctx = createContext(locale);
    for (const [id, each] of Object.entries(marketingMoleculeStories)) {
      expect(renderToStaticMarkup(each.live(ctx)).length, id).toBeGreaterThan(100);
      for (const part of each.states ?? []) {
        const markup = renderToStaticMarkup(part.render(ctx));
        expect(markup.length, `${id} ${part.id}`).toBeGreaterThan(100);
        expect(markup, `${id} ${part.id}`).not.toContain("undefined");
        expect(markup, `${id} ${part.id}`).not.toContain("NaN");
      }
    }
  });

  it.each(LOCALES)(
    "keep every id and name on a page unique when the states sit together, in %s",
    (locale) => {
      const ctx = createContext(locale);
      const markup = renderToStaticMarkup(
        <>
          {Object.values(marketingMoleculeStories).map((each, index) => (
            <div key={index}>
              {each.live(ctx)}
              {(each.states ?? []).map((part) => (
                <div key={part.id}>{part.render(ctx)}</div>
              ))}
            </div>
          ))}
        </>,
      );
      const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
      expect(ids.length).toBeGreaterThan(20);
      expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
      // Each label's `for` points at an id that is there.
      for (const match of markup.matchAll(/ for="([^"]+)"/g)) expect(ids).toContain(match[1]);
      // The timers are named by a label of their own.
      for (const match of markup.matchAll(/aria-labelledby="([^"]+)"/g))
        expect(ids).toContain(match[1]);
    },
  );

  it("give the client parts props that serialize, and the link a prefetch of false", () => {
    for (const locale of LOCALES) {
      const ctx = createContext(locale);
      for (const id of ["molecules/copy-code-chip", "molecules/countdown-timer"] as const) {
        const { live, states = [] } = story(id);
        for (const node of [live(ctx), ...states.map((each) => each.render(ctx))]) {
          // The server component's own props, then what it hands to the client component.
          const server = node as ReactElement<Record<string, unknown>>;
          for (const props of [server.props, handedOver(node).props]) {
            expect(
              Object.values(props).filter((value) => typeof value === "function"),
              `${id} ${locale}`,
            ).toEqual([]);
            expect(JSON.parse(JSON.stringify(props)), `${id} ${locale}`).toEqual(props);
          }
        }
      }
      const form = story("molecules/newsletter-form");
      for (const node of [form.live(ctx), ...(form.states ?? []).map((each) => each.render(ctx))]) {
        const props = (node as ReactElement<Record<string, unknown>>).props;
        expect(props["prefetch"]).toBe(false);
        // No action: the DS posts nothing.
        expect(props["action"]).toBeUndefined();
      }
    }
  });
});

describe("NewsletterForm's states", () => {
  const id = "molecules/newsletter-form";

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const copy = catalog(locale).newsletterForm;
    const { newsletter } = marketing(locale);

    const idle = html(id, "idle", locale);
    expect(idle).toContain(`<h3`);
    expect(idle).toContain(copy.title);
    expect(idle).toContain('type="email"');
    expect(idle).toContain('autoComplete="email"');
    expect(idle).toContain('value=""');
    expect(idle).toContain('data-status="idle"');
    expect(idle).not.toContain('aria-invalid="true"');
    // The link is in the sentence and the privacy page is under the market's prefix.
    expect(idle).toContain(`href="${newsletter.empty.privacyHref}"`);
    expect(idle).toContain(copy.privacyLink);

    const filled = html(id, "filled", locale);
    expect(filled).toContain(`value="${newsletter.typed.email}"`);

    // Sending: the button is named for what happens and is aria-disabled, not disabled; a hidden
    // disabled submit stands first.
    const sending = html(id, "sending", locale);
    expect(sending).toContain('data-status="sending"');
    expect(sending).toContain('aria-disabled="true"');
    expect(sending).toContain(`>${copy.sending}</span>`);
    expect(sending).toContain('type="button"');
    expect(sending.indexOf('type="submit"')).toBeLessThan(sending.indexOf('type="button"'));
    expect(sending).toMatch(/<button type="submit" disabled="" hidden=""/);
    expect(sending).toContain(`value="${newsletter.typed.email}"`);

    const done = html(id, "done", locale);
    expect(done).toContain('data-status="done"');
    expect(text(done)).toContain(plain(copy.done));
    expect(done).not.toContain('aria-invalid="true"');

    // Error: the field is invalid and described by the message that is in the status region.
    const error = html(id, "error", locale);
    expect(error).toContain('aria-invalid="true"');
    expect(text(error)).toContain(plain(copy.error));
    const described = error.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(described).toBeTruthy();
    expect(error).toContain(`id="${described}"`);
    expect(error).toContain(`value="${newsletter.typed.email}"`);

    const long = html(id, "long", locale);
    expect(long).toContain(`value="${newsletter.long.email}"`);
  });

  it("puts the privacy link in the sentence where the language puts it", () => {
    for (const locale of LOCALES) {
      const copy = catalog(locale).newsletterForm;
      const sentence = formatMessage(copy.consent, { privacy: copy.privacyLink }, htmlLang(locale));
      expect(text(html(id, "idle", locale))).toContain(plain(sentence));
    }
  });
});

describe("CopyCodeChip's states", () => {
  const id = "molecules/copy-code-chip";

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const copy = catalog(locale).copyCodeChip;
    const { discountCode, longDiscountCode } = marketing(locale);
    const name = (code: string) => formatMessage(copy.label, { code }, htmlLang(locale));

    const idle = html(id, "default", locale);
    expect(idle).toContain(`>${discountCode.code}</code>`);
    expect(idle).toContain(`aria-label="${name(discountCode.code)}"`);
    expect(idle).toContain('data-status="idle"');
    expect(text(idle)).not.toContain(copy.copied);
    expect(text(idle)).not.toContain(plain(copy.fallback));

    const copied = html(id, "copied", locale);
    expect(copied).toContain('data-status="copied"');
    expect(text(copied)).toContain(copy.copied);

    const refused = html(id, "clipboard-refused", locale);
    expect(refused).toContain('data-status="failed"');
    expect(text(refused)).toContain(plain(copy.fallback));

    const long = html(id, "long", locale);
    expect(long).toContain(`>${longDiscountCode.code}</code>`);
    expect(long).toContain("wrap-anywhere");

    const longRefused = html(id, "long-refused", locale);
    expect(longRefused).toContain(`>${longDiscountCode.code}</code>`);
    expect(text(longRefused)).toContain(plain(copy.fallback));
  });

  it("shows the cart's own code", () => {
    expect(html(id, "default", "en")).toContain(">WELCOME10</code>");
  });

  it("has the status line in every state, and only the states a press leads to fill it", () => {
    for (const part of story(id).states ?? []) {
      const markup = html(id, part.id, "en");
      expect(markup, part.id).toContain('role="status"');
      expect(markup, part.id).toContain("min-h-5");
    }
  });
});

describe("CountdownTimer's states", () => {
  const id = "molecules/countdown-timer";
  /** The four digit pairs in the markup, in order. */
  const digits = (markup: string) =>
    [...markup.matchAll(/tabular-nums">(\d+)<\/span>/g)].map((match) => match[1]);

  it("counts from the fixtures' fixed now, never from the clock", () => {
    expect(digits(html(id, "days", "en"))).toEqual(["03", "04", "30", "45"]);
    expect(digits(html(id, "hours", "en"))).toEqual(["00", "05", "12", "08"]);
    expect(digits(html(id, "last-minute", "en"))).toEqual(["00", "00", "00", "45"]);
    expect(digits(html(id, "many-days", "en"))).toEqual(["128", "07", "05", "09"]);
    expect(digits(html(id, "ended", "en"))).toEqual([]);
  });

  it.each(LOCALES)("show what each one claims, in %s", (locale) => {
    const copy = catalog(locale).countdownTimer;
    const { countdown } = marketing(locale);

    const days = html(id, "days", locale);
    expect(days).toContain('role="timer"');
    expect(days).toContain('aria-live="off"');
    expect(days).toContain('data-state="running"');
    expect(days).not.toContain(copy.ended);
    expect(Date.parse(countdown.days.now)).toBeLessThan(Date.parse(countdown.days.endsAt));

    const ended = html(id, "ended", locale);
    expect(ended).toContain('data-state="ended"');
    expect(ended).toContain(copy.ended);
    expect(ended).not.toContain('role="timer"');

    // The long one: three digits, in a box of the same size as the others.
    expect(html(id, "many-days", locale)).toContain(">128<");
  });

  it("writes the end time in UTC unless the story gives a zone, and then in that zone", () => {
    expect(text(html(id, "days", "en"))).toContain("Offer ends Oct 4, 2026, 1:30 PM UTC");
    expect(text(html(id, "days", "de"))).toContain("Das Angebot endet am 4. Okt. 2026, 13:30 UTC");
    // The same instant in the market's zone (New York, EDT in October).
    expect(text(html(id, "market-time-zone", "en"))).toContain(
      "Offer ends Oct 4, 2026, 9:30 AM EDT",
    );
    expect(text(html(id, "market-time-zone", "de"))).toContain("15:30 MESZ");
  });

  it("says the time in words for assistive technology, in the locale", () => {
    expect(text(html(id, "days", "en"))).toContain("3 days, 4 hours, 30 minutes, 45 seconds");
    expect(text(html(id, "days", "de"))).toContain("3 Tage, 4 Stunden, 30 Minuten und 45 Sekunden");
  });
});
