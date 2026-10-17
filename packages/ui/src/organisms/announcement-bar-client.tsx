// Ours (T35, SETUP.md "Navigation and headers (T35)"; D44). AnnouncementBar's client part: the
// message in view, the timer that moves it on, and the controls. A client component because the
// shown message, the pause and the close are state. It takes everything made: the server renders
// each message (its text and link) and the position text ("2 of 3") for each, so this file imports
// no formatter and no catalog, and a page that closes the bar is the only reason it ships.
//
// WCAG 2.2.2 (Pause, Stop, Hide): a bar of several messages has a visible pause control (a button
// that says "Pause" or "Play" in words, 44 px), and rotation also stops by itself while the pointer
// is over the bar or focus is inside it, so a reader who is reading or aiming at the link never has
// the message taken away. Pressing Play while the pointer or focus is still in the bar overrides
// that hold until both have left, because a Play that did nothing until the reader moved away
// would look broken. A reader who prefers reduced motion gets a bar that starts paused and never
// moves on its own (read with `useSyncExternalStore`, whose server snapshot is "no preference", so
// the server and the first client render agree and no state is set in an effect); Play is still
// theirs to press. Nothing is animated: a message is swapped, not faded, so there is no motion to
// turn off. Previous and next also pause: a reader who steps through the messages has taken
// control, and a message that moved again by itself would take away the one they chose.
//
// The live region follows the WAI-ARIA carousel pattern: `aria-live="off"` while the bar moves by
// itself (a region that speaks every 6 s would talk over the page), `polite` whenever it does not,
// so a change the reader asked for with Previous or Next is announced, and the position ("2 of 3")
// is read ahead of each message for a reader who cannot see it change.
//
// The bar keeps its height as messages of different lengths rotate: every message sits in the one
// grid cell and the shown one is visible, the others `invisible` (laid out, not drawn, not
// focusable, `aria-hidden` and `inert`), so the cell is as tall as the longest message at this width
// and nothing is clipped or jumps; a shorter message sits in the middle of the cell. The layout
// follows the bar's own width (container queries, `@lg`), not the window's: the design system
// draws a bar in a 190 px cell at any window width, and a drawer or a column would do the same.
// The server renders the first message visible and the rest hidden, so a reader without
// JavaScript has the first message, and the controls (which would do nothing) are hidden with
// `noscript:` (`@media (scripting: none)`).
//
// Closing removes the bar. Focus goes to the control that follows it in the page (`focusAfter`),
// where the next Tab would have gone, rather than to `<body>`, where a keyboard reader would start
// again from the top. `onDismiss` runs after that, for a client parent that remembers the choice.
"use client";

import { Icon } from "@shopblok/ui/atoms/icon";
import { IconButton } from "@shopblok/ui/atoms/icon-button";
import { cn } from "@shopblok/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { focusAfter } from "./focus-after";

/** The shortest a message stays (SPEC §13, WCAG 2.2.1): the contract's own minimum. */
const MIN_ROTATE_SECONDS = 5;

type AnnouncementSlide = {
  /** Stable across renders: the key. */
  id: string;
  /** "2 of 3", in the page's language, read ahead of the message. */
  position: string;
  /** The message's text and link, rendered on the server. */
  content: ReactNode;
};

type AnnouncementBarClientProps = {
  slides: AnnouncementSlide[];
  /** Seconds each message stays; never less than 5. */
  rotateSeconds: number;
  dismissible: boolean;
  /** The words of the landmark and the controls. */
  labels: {
    region: string;
    pause: string;
    play: string;
    previous: string;
    next: string;
    dismiss: string;
  };
  /** Starts paused (the design system's states). */
  defaultPaused?: boolean;
  /** The message shown first (the design system's states). */
  defaultIndex?: number;
  /** Called after the reader closes the bar. */
  onDismiss?: () => void;
  className?: string;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const readReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
/** The server cannot know; the first client render agrees with it and React reads the media query next. */
const noPreference = () => false;

/** A message that exists: a whole number from 0 to `count - 1`. */
function inRange(index: number, count: number): number {
  return Math.min(Math.max(Number.isInteger(index) ? index : 0, 0), Math.max(count - 1, 0));
}

// The look of a control on the bar's `primary` ground: the ghost button, in the bar's own colours.
const controlClass =
  "text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground";

function AnnouncementBarClient({
  slides,
  rotateSeconds,
  dismissible,
  labels,
  defaultPaused = false,
  defaultIndex = 0,
  onDismiss,
  className,
}: AnnouncementBarClientProps) {
  const count = slides.length;
  const several = count > 1;
  const [index, setIndex] = useState(() => inRange(defaultIndex, count));
  // What the reader chose with the pause control; until they do, the bar's own start decides.
  const [choice, setChoice] = useState<"play" | "pause">();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Play pressed while the pointer or focus is in the bar: the hold below does not apply.
  const [override, setOverride] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    noPreference,
  );
  const barRef = useRef<HTMLElement>(null);

  const playing =
    several && (choice === undefined ? !defaultPaused && !reducedMotion : choice === "play");
  const held = (hovered || focused) && !override;
  const running = playing && !held && !dismissed;
  const shown = inRange(index, count);
  // A number that is not one (NaN) would be a timeout of 0, and a bar that changes every frame.
  const seconds = Number.isFinite(rotateSeconds)
    ? Math.max(MIN_ROTATE_SECONDS, rotateSeconds)
    : MIN_ROTATE_SECONDS;

  // Timers start here, never during render, so the server and the first client render agree. One
  // timeout per message: a change of message, of the hold or of the pause starts a fresh one.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex((current) => (current + 1) % count), seconds * 1000);
    return () => clearTimeout(timer);
  }, [running, shown, count, seconds]);

  if (dismissed) return null;

  const step = (by: 1 | -1) => {
    setIndex((current) => (inRange(current, count) + by + count) % count);
    setChoice("pause");
  };

  const toggle = () => {
    if (playing) {
      setChoice("pause");
      return;
    }
    setChoice("play");
    setOverride(hovered || focused);
  };

  const dismiss = () => {
    if (barRef.current !== null) focusAfter(barRef.current);
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <section
      ref={barRef}
      aria-label={labels.region}
      data-slot="announcement-bar"
      data-state={several ? (running ? "rotating" : "paused") : "single"}
      // A touch has no hover to hold the bar: its tap would pause it until the next tap elsewhere.
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
        if (!focused) setOverride(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        setFocused(false);
        if (!hovered) setOverride(false);
      }}
      className={cn("@container w-full bg-primary text-primary-foreground", className)}
    >
      <div className="mx-auto flex w-full max-w-page flex-wrap items-center gap-x-2 px-2">
        <div
          data-slot="announcement-bar-messages"
          aria-live={several ? (running ? "off" : "polite") : undefined}
          // Narrower than `@lg` the controls take the row under the message, so the message has the width.
          className={cn(
            "grid min-w-0 grid-cols-[minmax(0,1fr)]",
            several ? "basis-full @lg:flex-1 @lg:basis-0" : "flex-1",
          )}
        >
          {slides.map((slide, position) => {
            const current = position === shown;
            return (
              <div
                key={slide.id}
                data-slot="announcement-bar-message"
                data-current={current ? "true" : undefined}
                aria-hidden={current ? undefined : true}
                inert={current ? undefined : true}
                className={cn(
                  "col-start-1 row-start-1 flex min-w-0 flex-wrap content-center items-center justify-center gap-x-2 text-center text-sm",
                  current ? undefined : "invisible",
                )}
              >
                {several ? <span className="sr-only">{slide.position}. </span> : null}
                {slide.content}
              </div>
            );
          })}
        </div>
        {several ? (
          <div
            data-slot="announcement-bar-controls"
            className={cn(
              "flex max-w-full flex-wrap items-center noscript:hidden",
              !dismissible && "@max-lg:mx-auto",
            )}
          >
            <IconButton
              variant="ghost"
              data-slot="announcement-bar-pause"
              label={playing ? labels.pause : labels.play}
              onClick={toggle}
              className={controlClass}
            >
              <Icon icon={playing ? PauseIcon : PlayIcon} />
            </IconButton>
            <IconButton
              variant="ghost"
              data-slot="announcement-bar-previous"
              label={labels.previous}
              onClick={() => step(-1)}
              className={controlClass}
            >
              <Icon icon={ChevronLeftIcon} className="rtl:rotate-180" />
            </IconButton>
            {/* Drawn for the eye; the position is read ahead of each message. */}
            <span
              data-slot="announcement-bar-position"
              aria-hidden="true"
              className="min-w-10 px-1 text-center text-xs tabular-nums"
            >
              {slides[shown]?.position}
            </span>
            <IconButton
              variant="ghost"
              data-slot="announcement-bar-next"
              label={labels.next}
              onClick={() => step(1)}
              className={controlClass}
            >
              <Icon icon={ChevronRightIcon} className="rtl:rotate-180" />
            </IconButton>
          </div>
        ) : null}
        {dismissible ? (
          <IconButton
            variant="ghost"
            data-slot="announcement-bar-dismiss"
            label={labels.dismiss}
            onClick={dismiss}
            className={cn(controlClass, "ms-auto noscript:hidden")}
          >
            <Icon icon={XIcon} />
          </IconButton>
        ) : null}
      </div>
    </section>
  );
}

export { AnnouncementBarClient, MIN_ROTATE_SECONDS };
export type { AnnouncementBarClientProps, AnnouncementSlide };
