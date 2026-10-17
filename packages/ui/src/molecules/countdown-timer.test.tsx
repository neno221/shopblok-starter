import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { catalogs, formatDate, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { Countdown } from "@shopblok/registry/contracts";
import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { createClock, secondsLeft } from "./countdown-clock";
import { CountdownTimer, type CountdownTimerProps } from "./countdown-timer";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const fixtures = (locale: Locale) => commerceFixtures[locale].marketing;
const at = (iso: string, plusMs = 0) => new Date(Date.parse(iso) + plusMs);

function element(locale: Locale, countdown: Countdown, props: Partial<CountdownTimerProps> = {}) {
  return (
    <CountdownTimer
      countdown={countdown}
      copy={catalogs[locale].molecules.countdownTimer}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}

const setup = (locale: Locale, countdown: Countdown, props?: Partial<CountdownTimerProps>) =>
  render(element(locale, countdown, props));

/** The four digit pairs the eye reads: days, hours, minutes, seconds. */
const digits = (root: ParentNode = document) =>
  [...root.querySelectorAll("[data-unit]")].map((unit) => unit.firstElementChild?.textContent);
/** The unit names under them. */
const unitNames = (root: ParentNode = document) =>
  [...root.querySelectorAll("[data-unit]")].map((unit) => unit.lastElementChild?.textContent);
/** What a screen reader reads in the timer. */
const spoken = (root: ParentNode = document) =>
  root.querySelector("[role=timer] .sr-only")?.textContent;
const ended = (root: ParentNode = document) =>
  root.querySelector("[data-slot=countdown-timer-ended]")?.textContent;

/** A countdown that ends `ms` after `now`. */
const endsIn = (ms: number, now = fixtureNow): Countdown => ({
  now,
  endsAt: at(now, ms).toISOString(),
});

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(at(fixtureNow));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CountdownTimer on the server (D50)", () => {
  it("counts from the contract's now, whatever the clock says: the fixed-clock test", () => {
    // The clock is years after the end. A server render that read `Date.now()` would say it is over.
    vi.setSystemTime(new Date("2031-06-15T12:00:00.000Z"));
    const html = renderToString(element("en", fixtures("en").countdown.days));
    expect(html).toContain("3 days, 4 hours, 30 minutes, 45 seconds");
    expect(html).toMatch(/>03<[^]*>04<[^]*>30<[^]*>45</);
    expect(html).not.toContain("This offer has ended");
    expect(html).toContain('data-state="running"');
  });

  it("gives the same markup at any clock, before or after the offer", () => {
    const render = () => renderToString(element("en", fixtures("en").countdown.hours));
    vi.setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
    const early = render();
    vi.setSystemTime(new Date("2040-01-01T00:00:00.000Z"));
    const late = render();
    expect(late).toBe(early);
    expect(early).toContain("5 hours, 12 minutes, 8 seconds");
  });

  it("follows `now` and `endsAt`, not the fixtures: other times, other digits", () => {
    const now = "2027-03-05T10:00:00.000Z";
    const html = renderToString(
      element("en", endsIn(DAY + 2 * HOUR + 3 * MINUTE + 4 * SECOND, now)),
    );
    expect(html).toContain("1 day, 2 hours, 3 minutes, 4 seconds");
    expect(html).toMatch(/>01<[^]*>02<[^]*>03<[^]*>04</);
  });

  it("says it is over when `now` is `endsAt`, without a clock", () => {
    vi.setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
    const html = renderToString(element("en", fixtures("en").countdown.ended));
    expect(html).toContain("This offer has ended");
    expect(html).toContain('data-state="ended"');
    expect(html).not.toContain('role="timer"');
  });

  it("writes the end time the same in any time zone the server runs in", () => {
    const zone = process.env["TZ"];
    try {
      const labels = ["Pacific/Auckland", "America/Los_Angeles", "UTC"].map((tz) => {
        process.env["TZ"] = tz;
        return renderToString(element("en", fixtures("en").countdown.days));
      });
      expect(labels[0]).toBe(labels[1]);
      expect(labels[1]).toBe(labels[2]);
      expect(labels[0]).toContain("Offer ends Oct 4, 2026, 1:30 PM UTC");
    } finally {
      if (zone === undefined) delete process.env["TZ"];
      else process.env["TZ"] = zone;
    }
  });

  it("is fine to render in all four locales", () => {
    for (const locale of LOCALES) {
      const html = renderToString(element(locale, fixtures(locale).countdown.days));
      expect(html).toContain('role="timer"');
    }
  });
});

describe("CountdownTimer in the browser", () => {
  it("shows the time left from the first render", () => {
    setup("en", fixtures("en").countdown.days);
    expect(digits()).toEqual(["03", "04", "30", "45"]);
    expect(spoken()).toBe("3 days, 4 hours, 30 minutes, 45 seconds");
  });

  it("ticks once a second", () => {
    setup("en", fixtures("en").countdown.days);
    act(() => void vi.advanceTimersByTime(1000));
    expect(digits()).toEqual(["03", "04", "30", "44"]);
    act(() => void vi.advanceTimersByTime(1000));
    expect(digits()).toEqual(["03", "04", "30", "43"]);
    // Not before the second is up.
    act(() => void vi.advanceTimersByTime(999));
    expect(digits()).toEqual(["03", "04", "30", "43"]);
    act(() => void vi.advanceTimersByTime(1));
    expect(digits()).toEqual(["03", "04", "30", "42"]);
  });

  it("carries a day into hours, an hour into minutes and a minute into seconds", () => {
    setup("en", endsIn(DAY));
    expect(digits()).toEqual(["01", "00", "00", "00"]);
    act(() => void vi.advanceTimersByTime(SECOND));
    expect(digits()).toEqual(["00", "23", "59", "59"]);
    act(() => void vi.advanceTimersByTime(59 * SECOND));
    expect(digits()).toEqual(["00", "23", "59", "00"]);
    act(() => void vi.advanceTimersByTime(SECOND));
    expect(digits()).toEqual(["00", "23", "58", "59"]);
  });

  it("rounds a part of a second up, so the last second shows 1 and not 0", () => {
    setup("en", endsIn(DAY + 1));
    expect(digits()).toEqual(["01", "00", "00", "01"]);
  });

  it("gets to zero, says so, and stops its timer", () => {
    setup("en", fixtures("en").countdown.seconds);
    expect(digits()).toEqual(["00", "00", "00", "45"]);
    expect(vi.getTimerCount()).toBe(1);
    act(() => void vi.advanceTimersByTime(44 * SECOND));
    expect(digits()).toEqual(["00", "00", "00", "01"]);
    expect(spoken()).toBe("1 second");
    expect(ended()).toBe("");
    act(() => void vi.advanceTimersByTime(1000));
    expect(ended()).toBe("This offer has ended");
    expect(screen.queryByRole("timer")).toBeNull();
    expect(document.querySelector("[data-slot=countdown-timer]")?.getAttribute("data-state")).toBe(
      "ended",
    );
    // Stopped: nothing is waiting to wake it, and nothing moves later.
    expect(vi.getTimerCount()).toBe(0);
    act(() => void vi.advanceTimersByTime(HOUR));
    expect(ended()).toBe("This offer has ended");
  });

  it("starts ended when the offer is already over", () => {
    setup("en", fixtures("en").countdown.ended);
    expect(ended()).toBe("This offer has ended");
    expect(screen.queryByRole("timer")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ticks on the browser's clock, not on the render's now", () => {
    // The page was built an hour ago: the browser's clock is an hour later than `now`.
    vi.setSystemTime(at(fixtureNow, HOUR));
    setup("en", fixtures("en").countdown.days);
    expect(digits()).toEqual(["03", "03", "30", "45"]);
  });

  it("catches up when timers were held back (a background tab)", () => {
    setup("en", fixtures("en").countdown.days);
    vi.setSystemTime(at(fixtureNow, 10 * MINUTE));
    act(() => void vi.advanceTimersByTime(1000));
    expect(digits()).toEqual(["03", "04", "20", "44"]);
  });

  it("wakes at the end's own second, not at the page's", () => {
    // 300 ms into a second: the next change is 700 ms away, not 1000.
    vi.setSystemTime(at(fixtureNow, 300));
    setup("en", fixtures("en").countdown.days);
    expect(digits()).toEqual(["03", "04", "30", "45"]);
    act(() => void vi.advanceTimersByTime(699));
    expect(digits()).toEqual(["03", "04", "30", "45"]);
    act(() => void vi.advanceTimersByTime(1));
    expect(digits()).toEqual(["03", "04", "30", "44"]);
  });

  it("shows a new time when the end changes", () => {
    const { rerender } = setup("en", fixtures("en").countdown.hours);
    expect(digits()).toEqual(["00", "05", "12", "08"]);
    rerender(element("en", fixtures("en").countdown.days));
    expect(digits()).toEqual(["03", "04", "30", "45"]);
    act(() => void vi.advanceTimersByTime(1000));
    expect(digits()).toEqual(["03", "04", "30", "44"]);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("stops ticking when it leaves the page", () => {
    const { unmount } = setup("en", fixtures("en").countdown.days);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("works in strict mode, which subscribes twice, with one timer", () => {
    render(<StrictMode>{element("en", fixtures("en").countdown.days)}</StrictMode>);
    expect(vi.getTimerCount()).toBe(1);
    act(() => void vi.advanceTimersByTime(1000));
    expect(digits()).toEqual(["03", "04", "30", "44"]);
  });

  it("three digits of days stay three digits", () => {
    setup("en", fixtures("en").countdown.long);
    expect(digits()).toEqual(["128", "07", "05", "09"]);
    expect(spoken()).toBe("128 days, 7 hours, 5 minutes, 9 seconds");
  });

  describe("after hydration", () => {
    async function hydrate(countdown: Countdown, locale: Locale = "en") {
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element(locale, countdown));
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      await act(async () => {
        hydrateRoot(container, element(locale, countdown), { onRecoverableError });
      });
      return { container, onRecoverableError, error };
    }

    it("finds the server's markup the same, and ticks on from the browser's clock", async () => {
      // The server rendered at `now`; the browser is a minute later.
      vi.setSystemTime(at(fixtureNow, MINUTE));
      const { container, onRecoverableError, error } = await hydrate(fixtures("en").countdown.days);
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(digits(container)).toEqual(["03", "04", "29", "45"]);
      act(() => void vi.advanceTimersByTime(1000));
      expect(digits(container)).toEqual(["03", "04", "29", "44"]);
      container.remove();
    });

    it("says it is over when the browser's clock is past the end, with no mismatch", async () => {
      vi.setSystemTime(at(fixtureNow, 4 * DAY));
      const { container, onRecoverableError, error } = await hydrate(fixtures("en").countdown.days);
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(ended(container)).toBe("This offer has ended");
      expect(container.querySelector("[role=timer]")).toBeNull();
      container.remove();
    });

    it("writes the end time the same on the server and in the browser", async () => {
      // The label is the part both sides write: it must not depend on the reader's time zone.
      const { container, onRecoverableError } = await hydrate(fixtures("de").countdown.days, "de");
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector("[data-slot=countdown-timer-label]")?.textContent).toBe(
        "Das Angebot endet am 4. Okt. 2026, 13:30 UTC",
      );
      container.remove();
    });
  });
});

describe("what a reader is told", () => {
  it("names the timer for what it counts down to, with the end time as text", () => {
    setup("en", fixtures("en").countdown.days);
    const timer = screen.getByRole("timer", { name: "Offer ends Oct 4, 2026, 1:30 PM UTC" });
    // The name is the visible line above it.
    expect(timer.getAttribute("aria-labelledby")).toBe(
      document.querySelector("[data-slot=countdown-timer-label]")?.id,
    );
  });

  it("is not announced as it ticks: the timer is not live, and nothing live changes", () => {
    setup("en", fixtures("en").countdown.days);
    const timer = screen.getByRole("timer");
    expect(timer.getAttribute("aria-live")).toBe("off");
    // The only live region is the one that says it ended; it stays empty while the digits move.
    const live = [...document.querySelectorAll("[aria-live], [role=status], [role=alert]")];
    expect(live.filter((each) => each !== timer)).toHaveLength(1);
    const region = document.querySelector("[data-slot=countdown-timer-ended]");
    expect(region?.getAttribute("aria-live")).toBe("polite");
    for (let second = 0; second < 5; second++) {
      act(() => void vi.advanceTimersByTime(1000));
      expect(region?.textContent).toBe("");
    }
  });

  it("announces the end, once, in the region that was there all along", () => {
    setup("en", fixtures("en").countdown.seconds);
    const region = document.querySelector("[data-slot=countdown-timer-ended]");
    expect(region?.getAttribute("role")).toBe("status");
    expect(region?.textContent).toBe("");
    act(() => void vi.advanceTimersByTime(45 * SECOND));
    // The same element, now with text: a screen reader says it.
    expect(document.querySelector("[data-slot=countdown-timer-ended]")).toBe(region);
    expect(region?.textContent).toBe("This offer has ended");
  });

  it("hides the digits from assistive technology and says the time once, in a sentence", () => {
    setup("en", fixtures("en").countdown.days);
    const grid = document.querySelector("[data-unit]")?.parentElement;
    expect(grid?.getAttribute("aria-hidden")).toBe("true");
    expect(spoken()).toBe("3 days, 4 hours, 30 minutes, 45 seconds");
    expect(document.querySelector("[role=timer] .sr-only")?.parentElement).toBe(
      screen.getByRole("timer"),
    );
  });

  it("leaves out the units that are zero in what it says", () => {
    setup("en", fixtures("en").countdown.hours);
    expect(spoken()).toBe("5 hours, 12 minutes, 8 seconds");
    setup("en", endsIn(DAY + 5 * SECOND));
    expect(spoken(document.body.lastElementChild!)).toBe("1 day, 5 seconds");
  });

  it("gives two countdowns on a page names of their own", () => {
    const { container } = render(
      <>
        {element("en", fixtures("en").countdown.days)}
        {element("en", fixtures("en").countdown.hours)}
      </>,
    );
    const ids = [...container.querySelectorAll("[data-slot=countdown-timer-label]")].map(
      (label) => label.id,
    );
    expect(new Set(ids).size).toBe(2);
    expect(
      screen.getAllByRole("timer").map((each) => each.getAttribute("aria-labelledby")),
    ).toEqual(ids);
  });
});

describe("in each language", () => {
  const spokenOf = (locale: Locale, parts: [number, number, number, number]) => {
    const long = (value: number, unit: Intl.NumberFormatOptions["unit"]) =>
      new Intl.NumberFormat(htmlLang[locale], {
        style: "unit",
        unit,
        unitDisplay: "long",
      }).format(value);
    return new Intl.ListFormat(htmlLang[locale], { type: "unit", style: "long" }).format([
      long(parts[0], "day"),
      long(parts[1], "hour"),
      long(parts[2], "minute"),
      long(parts[3], "second"),
    ]);
  };

  it.each([
    ["en", ["days", "hr", "min", "sec"]],
    ["el", ["ημέρες", "ώ.", "λ.", "δευτ."]],
    ["de", ["Tg.", "Std.", "Min.", "Sek."]],
    ["fr", ["j", "h", "min", "s"]],
  ] as const)("names the units with Intl's short unit names in %s", (locale, names) => {
    setup(locale, fixtures(locale).countdown.days);
    expect(unitNames()).toEqual(names);
  });

  it("uses the singular where the language does", () => {
    setup("en", endsIn(DAY + HOUR + MINUTE + SECOND));
    expect(unitNames()).toEqual(["day", "hr", "min", "sec"]);
    expect(spoken()).toBe("1 day, 1 hour, 1 minute, 1 second");
  });

  it.each(LOCALES)("says the time left in words in %s, from Intl", (locale) => {
    setup(locale, fixtures(locale).countdown.days);
    expect(spoken()).toBe(spokenOf(locale, [3, 4, 30, 45]));
  });

  it.each(LOCALES)("writes the end time the way the market does, in %s", (locale) => {
    setup(locale, fixtures(locale).countdown.days);
    const copy = catalogs[locale].molecules.countdownTimer;
    const date = formatDate(fixtures(locale).countdown.days.endsAt, htmlLang[locale], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: "UTC",
    });
    expect(document.querySelector("[data-slot=countdown-timer-label]")?.textContent).toBe(
      formatMessage(copy.label, { date }, htmlLang[locale]),
    );
  });

  it.each([
    ["en", "Offer ends Oct 4, 2026, 1:30 PM UTC"],
    ["de", "Das Angebot endet am 4. Okt. 2026, 13:30 UTC"],
  ] as const)("reads the label in %s", (locale, label) => {
    setup(locale, fixtures(locale).countdown.days);
    expect(screen.getByRole("timer", { name: label })).toBeTruthy();
  });

  it("writes the end time in the time zone it is given, not the reader's", () => {
    setup("en", fixtures("en").countdown.days, { timeZone: "America/New_York" });
    expect(document.querySelector("[data-slot=countdown-timer-label]")?.textContent).toBe(
      "Offer ends Oct 4, 2026, 9:30 AM EDT",
    );
  });

  it.each(LOCALES)("says it ended in %s", (locale) => {
    setup(locale, fixtures(locale).countdown.ended);
    expect(ended()).toBe(catalogs[locale].molecules.countdownTimer.ended);
  });
});

describe("sizes and long labels", () => {
  it("draws four equal columns that can shrink, with digits that keep their width", () => {
    setup("en", fixtures("en").countdown.days);
    const grid = document.querySelector("[data-unit]")?.parentElement;
    expect(grid?.className).toContain("grid-cols-4");
    for (const unit of document.querySelectorAll("[data-unit]")) {
      expect(unit.className).toContain("min-w-0");
      expect(unit.firstElementChild?.className).toContain("tabular-nums");
    }
  });

  it.each(["de", "el"] as const)("lets the longest words, in %s, wrap", (locale) => {
    const { container } = setup(locale, fixtures(locale).countdown.long);
    for (const each of container.querySelectorAll("*")) {
      expect(String(each.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
    }
    for (const name of container.querySelectorAll("[data-unit] > :last-child")) {
      expect(name.className).toContain("wrap-anywhere");
    }
    expect(container.querySelector("[data-slot=countdown-timer-label]")?.className).toContain(
      "wrap-break-word",
    );
  });

  it("takes the width it is given and merges the class", () => {
    const { container } = setup("en", fixtures("en").countdown.days, { className: "max-w-none" });
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("max-w-none");
    expect(root.className).not.toContain("max-w-sm");
    expect(root.className).toContain("w-full");
  });

  it("passes the container's own props on", () => {
    const { container } = setup("en", fixtures("en").countdown.days, { id: "sale-timer" });
    expect(container.firstElementChild?.id).toBe("sale-timer");
  });

  it("is not a control: nothing to tab to", () => {
    const { container } = setup("en", fixtures("en").countdown.days);
    expect(container.querySelectorAll("a, button, input, [tabindex]")).toHaveLength(0);
  });
});

describe("the clock", () => {
  it("rounds up, so 0 means over", () => {
    expect(secondsLeft(10_000, 0)).toBe(10);
    expect(secondsLeft(10_000, 9_999)).toBe(1);
    expect(secondsLeft(10_000, 10_000)).toBe(0);
    expect(secondsLeft(10_000, 10_001)).toBe(0);
    expect(secondsLeft(10_000, 20_000)).toBe(0);
  });

  it("returns the same reading until the time changes, and asks nothing while nobody listens", () => {
    const clock = createClock(Date.now() + 60 * SECOND);
    expect(clock.getSnapshot()).toBe(60);
    // Time passes without a listener: the reading is the one it took.
    vi.setSystemTime(at(fixtureNow, 5 * SECOND));
    expect(clock.getSnapshot()).toBe(60);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reads again when someone listens, and wakes them once for each second", () => {
    const clock = createClock(Date.now() + 60 * SECOND);
    clock.getSnapshot();
    vi.setSystemTime(at(fixtureNow, 5 * SECOND));
    const listener = vi.fn();
    const unsubscribe = clock.subscribe(listener);
    expect(clock.getSnapshot()).toBe(55);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(3 * SECOND);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(clock.getSnapshot()).toBe(52);
    unsubscribe();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5 * SECOND);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("stops at zero and stays there", () => {
    const clock = createClock(Date.now() + 2 * SECOND);
    const listener = vi.fn();
    clock.subscribe(listener);
    vi.advanceTimersByTime(2 * SECOND);
    expect(clock.getSnapshot()).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10 * SECOND);
    expect(clock.getSnapshot()).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("is already at zero, with no timer, for an end in the past", () => {
    const clock = createClock(Date.now() - 1);
    clock.subscribe(() => {});
    expect(clock.getSnapshot()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
