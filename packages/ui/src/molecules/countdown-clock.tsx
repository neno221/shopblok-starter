// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"): the part of CountdownTimer that
// moves, split out so that only this reaches the browser (CountdownTimer formats the sentence and
// the "ended" text on the server and passes them in as strings, so no message formatter ships here).
// A client component, because the time left changes after the page is built. It reads the clock
// through `useSyncExternalStore` (D44's way for a per-visitor value, and what the lint rule
// `react-hooks/set-state-in-effect` leaves open): the server snapshot is the time left at `now`, the
// time the server rendered at, never `Date.now()` (D50), so the first render, on the server and in
// hydration, is the same; from then on the browser's snapshot is `Date.now()` and a timer wakes the
// store at each whole second of the time left, until it reaches zero and the timer stops for good.
// The digits are drawn `aria-hidden` and a sentence ("3 days, 4 hours, …") carries the same time
// for assistive technology, so the numbers are not read as twelve fragments. The `timer` role has
// `aria-live="off"`: it is not announced every second. When the time runs out an always-present
// `role="status"` says it ended (WCAG 4.1.3), once. Units come from `Intl.NumberFormat`'s unit
// style, not `Intl.DurationFormat`, which Node 22.22 does not have (D50). The unit names and the
// sentence are words from the runtime's ICU, which the server's Node and the reader's browser may
// not write identically (their CLDR versions differ), so those two elements are marked
// `suppressHydrationWarning`; the digits are not, because a different number is a real mismatch.
"use client";

import { VisuallyHidden } from "@shopblok/ui/atoms/visually-hidden";
import { cn } from "@shopblok/ui/lib/utils";
import { useId, useMemo, useSyncExternalStore } from "react";
import type * as React from "react";

const UNITS = [
  { unit: "day", seconds: 86_400 },
  { unit: "hour", seconds: 3_600 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
] as const;

type Unit = (typeof UNITS)[number]["unit"];

/**
 * Whole seconds from `nowMs` to `endsMs`, rounded up so that the last second shows 1 and 0 means
 * over, and never below 0.
 */
function secondsLeft(endsMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endsMs - nowMs) / 1000));
}

type Clock = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
};

/**
 * The browser's side of one countdown: the whole seconds left to `endsMs` by `Date.now()`. It
 * keeps its last reading (a snapshot has to be the same on every call until the time changes), asks
 * the clock only while someone listens, wakes exactly when the reading changes, and stops asking
 * when it reaches 0.
 */
function createClock(endsMs: number): Clock {
  const listeners = new Set<() => void>();
  let reading: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const read = () => secondsLeft(endsMs, Date.now());

  // The reading drops by one when the time left falls to a whole number of seconds.
  const schedule = () => {
    const rest = (endsMs - Date.now()) % 1000;
    timer = setTimeout(tick, rest <= 0 ? 1000 + rest : rest);
  };

  function tick() {
    timer = undefined;
    const next = read();
    if (next !== reading) {
      reading = next;
      for (const listener of [...listeners]) listener();
    }
    if (next > 0 && listeners.size > 0) schedule();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      // What was read while rendering may be older than this subscription: read it again, and
      // React renders again if it differs.
      reading = read();
      if (timer === undefined && reading > 0) schedule();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          clearTimeout(timer);
          timer = undefined;
          reading = undefined;
        }
      };
    },
    getSnapshot() {
      reading ??= read();
      return reading;
    },
  };
}

// Building an Intl formatter costs far more than formatting with one, and a countdown formats
// eight numbers a second. @shopblok/i18n has the same caches, but importing it would bring its
// catalogs and the message formatter into the browser for these three calls.
const formats = new Map<string, Intl.NumberFormat | Intl.ListFormat>();

function cached<T extends Intl.NumberFormat | Intl.ListFormat>(key: string, make: () => T): T {
  let format = formats.get(key) as T | undefined;
  if (format === undefined) {
    format = make();
    formats.set(key, format);
  }
  return format;
}

const digitsOf = (locale: string) =>
  cached(
    `${locale}|digits`,
    () =>
      new Intl.NumberFormat(locale, {
        minimumIntegerDigits: 2,
        useGrouping: false,
      }),
  );

const unitOf = (locale: string, unit: Unit, display: "short" | "long") =>
  cached(
    `${locale}|${unit}|${display}`,
    () =>
      new Intl.NumberFormat(locale, {
        style: "unit",
        unit,
        unitDisplay: display,
      }),
  );

const listOf = (locale: string) =>
  cached(`${locale}|list`, () => new Intl.ListFormat(locale, { type: "unit", style: "long" }));

/** The days, hours, minutes and seconds in `total` seconds, each as the locale writes it. */
function describe(total: number, locale: string) {
  let rest = total;
  const parts = UNITS.map(({ unit, seconds }) => {
    const value = Math.floor(rest / seconds);
    rest -= value * seconds;
    // "days", "hr", "min", "sec": the unit part of the short form, which follows the plural.
    const name =
      unitOf(locale, unit, "short")
        .formatToParts(value)
        .find((part) => part.type === "unit")?.value ?? "";
    return {
      unit,
      value,
      digits: digitsOf(locale).format(value),
      name,
      spoken: unitOf(locale, unit, "long").format(value),
    };
  });
  // Spoken: "3 days, 4 hours, 30 minutes, 45 seconds", leaving out the units that are 0.
  const spoken = listOf(locale).format(parts.filter((part) => part.value > 0).map((p) => p.spoken));
  return { parts, spoken };
}

type CountdownClockProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** When it ends: an ISO time with its offset. */
  endsAt: string;
  /** The time the server rendered at: what the first render counts from (D50). */
  now: string;
  /** A BCP 47 tag such as `el-CY`: the market's `<html lang>`. */
  locale: string;
  /** What the timer counts down to, with the end time in text: the timer's name, shown above it. */
  label: string;
  /** What is said when it is over. */
  endedText: string;
  /**
   * Stays at `now` and never reads the browser's clock: the design system's states, drawn at the
   * fixtures' fixed time, would otherwise all read "ended" once the real date passes them (PR 55
   * review). A store leaves it off.
   */
  frozen?: boolean;
};

/** A clock that never moves: the reading at `now`, for a frozen countdown. */
function createFrozenClock(seconds: number): Clock {
  return { subscribe: () => () => {}, getSnapshot: () => seconds };
}

function CountdownClock({
  endsAt,
  now,
  locale,
  label,
  endedText,
  frozen = false,
  className,
  ...props
}: CountdownClockProps) {
  const labelId = useId();
  const endsMs = Date.parse(endsAt);
  const nowMs = Date.parse(now);
  const clock = useMemo(
    () => (frozen ? createFrozenClock(secondsLeft(endsMs, nowMs)) : createClock(endsMs)),
    [frozen, endsMs, nowMs],
  );
  const left = useSyncExternalStore(clock.subscribe, clock.getSnapshot, () =>
    secondsLeft(endsMs, nowMs),
  );
  const ended = left <= 0;
  const { parts, spoken } = describe(left, locale);
  return (
    <div
      data-slot="countdown-timer"
      data-state={ended ? "ended" : "running"}
      className={cn("flex w-full max-w-sm min-w-0 flex-col", className)}
      {...props}
    >
      {ended ? null : (
        <>
          <p
            id={labelId}
            data-slot="countdown-timer-label"
            className="mb-2 text-sm leading-snug wrap-break-word text-muted-foreground"
          >
            {label}
          </p>
          <div
            role="timer"
            aria-live="off"
            aria-labelledby={labelId}
            data-slot="countdown-timer-clock"
          >
            <div aria-hidden="true" className="grid grid-cols-4 gap-2">
              {parts.map((part) => (
                <div
                  key={part.unit}
                  data-unit={part.unit}
                  className="flex min-w-0 flex-col items-center rounded-md bg-muted px-1 py-2 text-center"
                >
                  <span className="text-2xl leading-none font-semibold tabular-nums">
                    {part.digits}
                  </span>
                  <span
                    suppressHydrationWarning
                    className="mt-1.5 max-w-full text-xs leading-tight wrap-anywhere text-muted-foreground"
                  >
                    {part.name}
                  </span>
                </div>
              ))}
            </div>
            <VisuallyHidden suppressHydrationWarning>{spoken}</VisuallyHidden>
          </div>
        </>
      )}
      <p role="status" aria-live="polite" data-slot="countdown-timer-ended">
        {ended ? (
          <span className="inline-flex rounded-md bg-muted px-3 py-2 text-sm leading-snug wrap-break-word text-muted-foreground">
            {endedText}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export { CountdownClock, createClock, secondsLeft };
export type { CountdownClockProps };
