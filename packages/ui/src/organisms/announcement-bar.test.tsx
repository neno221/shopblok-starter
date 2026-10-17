import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { AnnouncementBar as AnnouncementBarContent } from "@shopblok/registry/contracts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode } from "react";
import type * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { AnnouncementBar, type AnnouncementBarProps } from "./announcement-bar";
import { focusAfter } from "./focus-after";

// next/link needs no router here; the stand-in is an anchor that shows the `prefetch` it was given.
vi.mock("next/link", () => ({
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: React.ComponentProps<"a"> & { prefetch?: boolean | null }) => (
    <a href={String(href)} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale) => catalogs[locale].organisms.announcementBar;
const announcements = (locale: Locale) => commerceFixtures[locale].header.announcements;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

function element(
  locale: Locale,
  content: AnnouncementBarContent,
  props: Partial<AnnouncementBarProps> = {},
) {
  return (
    <AnnouncementBar
      {...content}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      {...props}
    />
  );
}

const setup = (
  locale: Locale,
  content: AnnouncementBarContent,
  props?: Partial<AnnouncementBarProps>,
) => render(element(locale, content, props));

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const bar = () => slot("announcement-bar") as HTMLElement;
const messagesBox = () => slot("announcement-bar-messages") as HTMLElement;
const current = () =>
  document.querySelector<HTMLElement>('[data-slot="announcement-bar-message"][data-current]');
/** The text of the message in view, without the position read ahead of it. */
const shown = () => current()?.querySelector('[data-slot="announcement-bar-text"]')?.textContent;
const pause = () => slot("announcement-bar-pause") as HTMLElement;
const previous = () => slot("announcement-bar-previous") as HTMLElement;
const next = () => slot("announcement-bar-next") as HTMLElement;
const dismissButton = () => slot("announcement-bar-dismiss") as HTMLElement;
const position = () => slot("announcement-bar-position")?.textContent;

const SECOND = 1000;
const wait = (seconds: number) => act(() => void vi.advanceTimersByTime(seconds * SECOND));

/** `prefers-reduced-motion`, as a test sets it: a media query whose answer can change. */
function reducedMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        media: query,
        get matches() {
          return query === "(prefers-reduced-motion: reduce)" && matches;
        },
        addEventListener: (_type: string, listener: () => void) => void listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) =>
          void listeners.delete(listener),
      }) as unknown as MediaQueryList,
  );
  return {
    set(value: boolean) {
      matches = value;
      act(() => {
        for (const listener of [...listeners]) listener();
      });
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AnnouncementBar", () => {
  describe("the landmark and the messages", () => {
    it.each(LOCALES)("is a region named by the copy, in %s", (locale) => {
      setup(locale, announcements(locale).rotating);
      expect(screen.getByRole("region", { name: copyOf(locale).region })).toBe(bar());
    });

    it.each(LOCALES)("shows one message with its link, in %s", (locale) => {
      const { messages } = announcements(locale).single;
      const [only] = messages;
      setup(locale, announcements(locale).single);
      expect(shown()).toBe(only?.message);
      const link = screen.getByRole("link", { name: only?.link?.label });
      expect(link.getAttribute("href")).toBe(only?.link?.href);
    });

    it("draws a message without a link as its text alone", () => {
      setup("en", { messages: [{ message: "Free returns within 30 days" }], dismissible: false });
      expect(shown()).toBe("Free returns within 30 days");
      expect(screen.queryAllByRole("link")).toHaveLength(0);
    });

    it("draws nothing for no messages, not an empty strip", () => {
      const { container } = setup("en", { messages: [], dismissible: true });
      expect(container.innerHTML).toBe("");
    });

    it("gives one message no controls and no timer: it has nothing to rotate or pause", () => {
      setup("en", announcements("en").single);
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(pause()).toBeNull();
      expect(previous()).toBeNull();
      expect(next()).toBeNull();
      expect(position()).toBeUndefined();
      expect(bar().getAttribute("data-state")).toBe("single");
      // Nothing is live either: its one message never changes.
      expect(messagesBox().hasAttribute("aria-live")).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("keeps a link's address as written, even an absolute one marked external, in the same tab", () => {
      setup("en", {
        messages: [
          {
            message: "Visit our partner",
            link: { label: "Partner", href: "https://example.com/partner", external: true },
          },
        ],
        dismissible: false,
      });
      const link = screen.getByRole("link", { name: "Partner" });
      expect(link.getAttribute("href")).toBe("https://example.com/partner");
      // The copy has no "opens in a new tab" note, so none opens one (WCAG 3.2.5).
      expect(link.hasAttribute("target")).toBe(false);
    });
  });

  describe("several messages: the pause control (WCAG 2.2.2)", () => {
    it.each(LOCALES)("has a pause control, previous and next, named in %s", (locale) => {
      setup(locale, announcements(locale).rotating);
      const copy = copyOf(locale);
      expect(screen.getByRole("button", { name: copy.pause })).toBe(pause());
      expect(screen.getByRole("button", { name: copy.previous })).toBe(previous());
      expect(screen.getByRole("button", { name: copy.next })).toBe(next());
    });

    it("has its pause control, and pressing it stops the rotation", () => {
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      // A rotating bar without this button fails here: it is not found.
      const control = screen.getByRole("button", { name: "Pause announcements" });
      expect(control).toBe(pause());
      expect(shown()).toBe(messages[0]?.message);
      wait(6);
      expect(shown()).toBe(messages[1]?.message);
      fireEvent.click(control);
      // Not a second, not a minute, not an hour later.
      wait(6);
      wait(60);
      wait(3600);
      expect(shown()).toBe(messages[1]?.message);
      expect(bar().getAttribute("data-state")).toBe("paused");
      expect(vi.getTimerCount()).toBe(0);
    });

    it("says Play once paused, and Play starts it again", () => {
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      fireEvent.click(pause());
      expect(screen.getByRole("button", { name: "Play announcements" })).toBe(pause());
      wait(30);
      expect(shown()).toBe(messages[0]?.message);
      fireEvent.click(pause());
      expect(screen.getByRole("button", { name: "Pause announcements" })).toBe(pause());
      wait(6);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("has a 44 px pause control with an icon that is not its name", () => {
      setup("en", announcements("en").rotating);
      expect(pause().className).toContain("size-11");
      expect(pause().getAttribute("aria-label")).toBe("Pause announcements");
      expect(pause().querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      // Words, not only a picture: the button is named, and the icon changes with the action.
      const before = pause().innerHTML;
      fireEvent.click(pause());
      expect(pause().innerHTML).not.toBe(before);
    });

    it("puts the pause control, previous and next after the message, and the close button last", () => {
      setup("en", announcements("en").rotating);
      // Tab follows the document order, and skips what is inert; user-event does not know `inert`,
      // so the order is read from the markup.
      const order = [...bar().querySelectorAll("a[href], button")]
        .filter((control) => control.closest("[inert]") === null)
        .map((control) => control.getAttribute("data-slot"));
      expect(order).toEqual([
        "announcement-bar-link",
        "announcement-bar-pause",
        "announcement-bar-previous",
        "announcement-bar-next",
        "announcement-bar-dismiss",
      ]);
    });
  });

  describe("rotation", () => {
    it("moves on every six seconds when the shop does not say, and starts over after the last", () => {
      setup("en", { ...announcements("en").rotating, rotateSeconds: undefined });
      const { messages } = announcements("en").rotating;
      expect(shown()).toBe(messages[0]?.message);
      wait(5.9);
      expect(shown()).toBe(messages[0]?.message);
      wait(0.1);
      expect(shown()).toBe(messages[1]?.message);
      wait(6);
      expect(shown()).toBe(messages[2]?.message);
      wait(6);
      expect(shown()).toBe(messages[0]?.message);
    });

    it("moves on every rotateSeconds when the shop says", () => {
      setup("en", { ...announcements("en").rotating, rotateSeconds: 10 });
      const { messages } = announcements("en").rotating;
      wait(9.9);
      expect(shown()).toBe(messages[0]?.message);
      wait(0.1);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("never changes a message faster than five seconds, the contract's own minimum", () => {
      setup("en", { ...announcements("en").rotating, rotateSeconds: 1 });
      const { messages } = announcements("en").rotating;
      wait(4.9);
      expect(shown()).toBe(messages[0]?.message);
      wait(0.1);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("treats a time that is not a number as the minimum, not as a timeout of nothing", () => {
      setup("en", { ...announcements("en").rotating, rotateSeconds: Number.NaN });
      const { messages } = announcements("en").rotating;
      expect(vi.getTimerCount()).toBe(1);
      wait(4.9);
      expect(shown()).toBe(messages[0]?.message);
      wait(0.1);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("keeps one timer going, and one move for each interval, under StrictMode", () => {
      render(<StrictMode>{element("en", announcements("en").rotating)}</StrictMode>);
      const { messages } = announcements("en").rotating;
      expect(vi.getTimerCount()).toBe(1);
      wait(6);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("shows exactly one message at a time: the others are hidden, inert and not read", () => {
      setup("en", announcements("en").rotating);
      for (const index of [0, 1, 2]) {
        const slides = [...document.querySelectorAll('[data-slot="announcement-bar-message"]')];
        expect(slides).toHaveLength(3);
        slides.forEach((slide, each) => {
          const isShown = each === index;
          expect(slide.hasAttribute("data-current"), `message ${each} at ${index}`).toBe(isShown);
          expect(slide.getAttribute("aria-hidden"), `message ${each} at ${index}`).toBe(
            isShown ? null : "true",
          );
          expect(slide.hasAttribute("inert"), `message ${each} at ${index}`).toBe(!isShown);
          expect(slide.classList.contains("invisible"), `message ${each} at ${index}`).toBe(
            !isShown,
          );
        });
        // A link in a hidden message is not reachable by a reader.
        expect(screen.getAllByRole("link")).toHaveLength(1);
        wait(6);
      }
    });

    it("stacks every message in one grid cell, so the bar keeps its height as they rotate", () => {
      setup("en", announcements("en").rotating);
      expect(messagesBox().className).toContain("grid");
      for (const slide of document.querySelectorAll('[data-slot="announcement-bar-message"]')) {
        expect(slide.className).toContain("col-start-1");
        expect(slide.className).toContain("row-start-1");
        // Hidden messages keep their box (`invisible`); `hidden` would let the bar shrink.
        expect(slide.className).not.toMatch(/(?:^|\s)hidden(?:\s|$)/);
      }
    });

    it("stops its timer when it unmounts", () => {
      const { unmount } = setup("en", announcements("en").rotating);
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("starts at defaultIndex, and clamps one that is not a message", () => {
      const { messages } = announcements("en").rotating;
      const { unmount } = setup("en", announcements("en").rotating, { defaultIndex: 1 });
      expect(shown()).toBe(messages[1]?.message);
      unmount();
      const cases: [number, number][] = [
        [99, 2],
        [-3, 0],
        [1.5, 0],
        [Number.NaN, 0],
      ];
      for (const [given, expected] of cases) {
        const view = setup("en", announcements("en").rotating, { defaultIndex: given });
        expect(shown(), `defaultIndex ${given}`).toBe(messages[expected]?.message);
        view.unmount();
      }
    });

    it("starts paused with defaultPaused and stays at the message it was given", () => {
      const { messages } = announcements("en").rotating;
      setup("en", announcements("en").rotating, { defaultPaused: true, defaultIndex: 1 });
      expect(vi.getTimerCount()).toBe(0);
      wait(120);
      expect(shown()).toBe(messages[1]?.message);
      expect(pause().getAttribute("aria-label")).toBe("Play announcements");
      expect(bar().getAttribute("data-state")).toBe("paused");
    });
  });

  describe("while the reader is on the bar", () => {
    it("holds still while the pointer is over it, and moves on a full interval after it leaves", () => {
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      wait(4);
      fireEvent.pointerEnter(bar());
      wait(60);
      expect(shown()).toBe(messages[0]?.message);
      fireEvent.pointerLeave(bar());
      wait(5.9);
      expect(shown()).toBe(messages[0]?.message);
      wait(0.1);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("is not held by a touch, which has no hover to leave", () => {
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      fireEvent.pointerEnter(bar(), { pointerType: "touch" });
      wait(6);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("holds still while focus is inside it, and moves on after focus leaves", () => {
      render(
        <>
          {element("en", announcements("en").rotating)}
          <button type="button">After</button>
        </>,
      );
      const { messages } = announcements("en").rotating;
      act(() => (screen.getAllByRole("link")[0] as HTMLElement).focus());
      expect(bar().contains(document.activeElement)).toBe(true);
      wait(60);
      expect(shown()).toBe(messages[0]?.message);
      // Moving between the bar's own controls is not leaving it.
      act(() => next().focus());
      wait(60);
      expect(shown()).toBe(messages[0]?.message);
      act(() => screen.getByRole("button", { name: "After" }).focus());
      wait(5.9);
      expect(shown()).toBe(messages[0]?.message);
      wait(0.1);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("keeps the pause label as the reader set it while it is held", () => {
      setup("en", announcements("en").rotating);
      fireEvent.pointerEnter(bar());
      expect(pause().getAttribute("aria-label")).toBe("Pause announcements");
      expect(bar().getAttribute("data-state")).toBe("paused");
    });

    it("lets Play start it even though focus is still on the button, until focus leaves", () => {
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      act(() => pause().focus());
      fireEvent.click(pause());
      expect(pause().getAttribute("aria-label")).toBe("Play announcements");
      fireEvent.click(pause());
      expect(pause().getAttribute("aria-label")).toBe("Pause announcements");
      wait(6);
      expect(shown()).toBe(messages[1]?.message);
      // Once focus has left, the hold applies again the next time it comes back.
      act(() => pause().blur());
      act(() => pause().focus());
      wait(60);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("lets Play start it with the pointer still over the bar, until the pointer leaves", () => {
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      fireEvent.pointerEnter(bar());
      fireEvent.click(pause());
      fireEvent.click(pause());
      wait(6);
      expect(shown()).toBe(messages[1]?.message);
      fireEvent.pointerLeave(bar());
      fireEvent.pointerEnter(bar());
      wait(60);
      expect(shown()).toBe(messages[1]?.message);
    });
  });

  describe("previous and next", () => {
    it("steps to the next message and back, going round at the ends", () => {
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      fireEvent.click(next());
      expect(shown()).toBe(messages[1]?.message);
      fireEvent.click(next());
      fireEvent.click(next());
      expect(shown()).toBe(messages[0]?.message);
      fireEvent.click(previous());
      expect(shown()).toBe(messages[2]?.message);
      fireEvent.click(previous());
      expect(shown()).toBe(messages[1]?.message);
    });

    it("takes over: after a step the bar stays on the message the reader chose", () => {
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      fireEvent.click(next());
      expect(pause().getAttribute("aria-label")).toBe("Play announcements");
      wait(120);
      expect(shown()).toBe(messages[1]?.message);
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each(LOCALES)("says where it is in words, as the copy has it, in %s", (locale) => {
      setup(locale, announcements(locale).rotating);
      const words = (current: number) =>
        formatMessage(copyOf(locale).position, { current, total: 3 }, htmlLang[locale]);
      // Drawn for the eye, and read ahead of the message for a reader who cannot see it change.
      expect(plain(position())).toBe(plain(words(1)));
      expect(plain(current()?.querySelector(".sr-only")?.textContent)).toBe(`${plain(words(1))}.`);
      fireEvent.click(next());
      expect(plain(position())).toBe(plain(words(2)));
      expect(plain(current()?.querySelector(".sr-only")?.textContent)).toBe(`${plain(words(2))}.`);
      fireEvent.click(next());
      expect(plain(position())).toBe(plain(words(3)));
    });

    it("reads 2 of 3 in English", () => {
      setup("en", announcements("en").rotating);
      fireEvent.click(next());
      expect(position()).toBe("2 of 3");
    });

    it("hides the drawn position from assistive technology, so it is not read twice", () => {
      setup("en", announcements("en").rotating);
      expect(slot("announcement-bar-position")?.getAttribute("aria-hidden")).toBe("true");
    });

    it("has 44 px previous and next buttons whose arrows turn in a right-to-left page", () => {
      setup("en", announcements("en").rotating);
      for (const button of [previous(), next()]) {
        expect(button.className).toContain("size-11");
        expect(button.querySelector("svg")?.getAttribute("class")).toContain("rtl:rotate-180");
      }
    });
  });

  describe("the live region (the WAI-ARIA carousel pattern)", () => {
    it("is off while the bar moves by itself, so a change every six seconds is not spoken", () => {
      setup("en", announcements("en").rotating);
      expect(messagesBox().getAttribute("aria-live")).toBe("off");
      wait(6);
      expect(messagesBox().getAttribute("aria-live")).toBe("off");
      // The bar has no other live region, and nothing that interrupts.
      expect(document.querySelectorAll("[aria-live]")).toHaveLength(1);
      expect(document.querySelector('[aria-live="assertive"], [role="alert"]')).toBeNull();
    });

    it("is polite whenever the bar does not move by itself, so a change the reader asked for is announced", () => {
      setup("en", announcements("en").rotating);
      fireEvent.pointerEnter(bar());
      expect(messagesBox().getAttribute("aria-live")).toBe("polite");
      fireEvent.pointerLeave(bar());
      expect(messagesBox().getAttribute("aria-live")).toBe("off");
      fireEvent.click(pause());
      expect(messagesBox().getAttribute("aria-live")).toBe("polite");
      fireEvent.click(pause());
      expect(messagesBox().getAttribute("aria-live")).toBe("off");
      fireEvent.click(next());
      expect(messagesBox().getAttribute("aria-live")).toBe("polite");
    });

    it("is polite for a bar that starts paused", () => {
      setup("en", announcements("en").rotating, { defaultPaused: true });
      expect(messagesBox().getAttribute("aria-live")).toBe("polite");
    });
  });

  describe("a reader who prefers reduced motion", () => {
    it("gets a bar that starts paused and never moves on its own", () => {
      reducedMotion(true);
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      expect(bar().getAttribute("data-state")).toBe("paused");
      expect(screen.getByRole("button", { name: "Play announcements" })).toBe(pause());
      expect(messagesBox().getAttribute("aria-live")).toBe("polite");
      expect(vi.getTimerCount()).toBe(0);
      wait(3600);
      expect(shown()).toBe(messages[0]?.message);
    });

    it("can still be played by the reader, and paused again", () => {
      reducedMotion(true);
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      fireEvent.click(pause());
      wait(6);
      expect(shown()).toBe(messages[1]?.message);
      fireEvent.click(pause());
      wait(60);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("follows the setting when it changes while the page is open", () => {
      const motion = reducedMotion(false);
      setup("en", announcements("en").rotating);
      const { messages } = announcements("en").rotating;
      expect(bar().getAttribute("data-state")).toBe("rotating");
      motion.set(true);
      expect(bar().getAttribute("data-state")).toBe("paused");
      wait(60);
      expect(shown()).toBe(messages[0]?.message);
      motion.set(false);
      expect(bar().getAttribute("data-state")).toBe("rotating");
      wait(6);
      expect(shown()).toBe(messages[1]?.message);
    });

    it("does not override what the reader chose when the setting changes", () => {
      const motion = reducedMotion(false);
      setup("en", announcements("en").rotating);
      fireEvent.click(pause());
      motion.set(true);
      motion.set(false);
      expect(bar().getAttribute("data-state")).toBe("paused");
    });

    it("animates nothing: no transition or animation class on the bar's own parts", () => {
      setup("en", announcements("en").rotating);
      const classes = [...bar().querySelectorAll("*")]
        .filter((each) => !each.matches("button, button *"))
        .map((each) => each.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)(?:transition|animate|duration|delay|ease)-?/);
    });
  });

  describe("closing it", () => {
    function withNeighbours(props: Partial<AnnouncementBarProps> = {}) {
      return render(
        <>
          <button type="button">Before</button>
          {element("en", announcements("en").rotating, props)}
          <a href="/home">Home</a>
          <button type="button">After</button>
        </>,
      );
    }

    it("has a 44 px close button only when the shop allows it", () => {
      const view = setup("en", announcements("en").single);
      expect(dismissButton()).toBeNull();
      view.unmount();
      setup("en", announcements("en").long);
      expect(screen.getByRole("button", { name: "Close announcements" })).toBe(dismissButton());
      expect(dismissButton().className).toContain("size-11");
    });

    it.each(LOCALES)("names the close button in %s", (locale) => {
      setup(locale, announcements(locale).rotating);
      expect(screen.getByRole("button", { name: copyOf(locale).dismiss })).toBe(dismissButton());
    });

    it("removes the bar, stops its timer and calls onDismiss once, after the reader closes it", () => {
      const onDismiss = vi.fn();
      withNeighbours({ onDismiss });
      expect(onDismiss).not.toHaveBeenCalled();
      fireEvent.click(dismissButton());
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(bar()).toBeNull();
      expect(screen.queryByRole("region")).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
      wait(60);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("moves focus to the control that follows the bar, where Tab would have gone", () => {
      withNeighbours();
      act(() => dismissButton().focus());
      expect(document.activeElement).toBe(dismissButton());
      fireEvent.click(dismissButton());
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Home" }));
      expect(document.activeElement).not.toBe(document.body);
    });

    it("moves focus on with the keyboard too, and the reader can go on from there", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      withNeighbours();
      await act(async () => dismissButton().focus());
      await user.keyboard("{Enter}");
      expect(bar()).toBeNull();
      expect(document.activeElement).toBe(screen.getByRole("link", { name: "Home" }));
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    });

    it("closes the bar when it is the last thing on the page, and does not throw", () => {
      render(element("en", announcements("en").rotating));
      act(() => dismissButton().focus());
      expect(() => fireEvent.click(dismissButton())).not.toThrow();
      expect(bar()).toBeNull();
    });

    it("works without an onDismiss", () => {
      setup("en", announcements("en").long);
      expect(() => fireEvent.click(dismissButton())).not.toThrow();
      expect(bar()).toBeNull();
    });
  });

  describe("long messages in German and Greek", () => {
    it.each(["de", "el"] as const)("wraps the long message in %s and cuts nothing", (locale) => {
      setup(locale, announcements(locale).long);
      const [only] = announcements(locale).long.messages;
      expect(shown()).toBe(only?.message);
      expect(only?.message.length).toBeGreaterThan(100);
      for (const each of [bar(), ...bar().querySelectorAll("*")]) {
        expect(each.getAttribute("class") ?? "", each.tagName).not.toMatch(CLIPPING_CLASSES);
      }
      expect(slot("announcement-bar-text")?.className).toContain("wrap-break-word");
      // The bar grows with the text: no fixed height anywhere.
      expect(bar().innerHTML).not.toMatch(/(?:^|[\s"])(?:h|max-h)-(?:\d|\[)/);
    });

    it.each(["de", "el", "fr"] as const)(
      "keeps the controls and the link at 44 px under a long message, in %s",
      (locale) => {
        setup(locale, {
          ...announcements(locale).long,
          messages: [
            ...announcements(locale).long.messages,
            ...announcements(locale).rotating.messages,
          ],
        });
        for (const button of [pause(), previous(), next(), dismissButton()]) {
          expect(button.className).toContain("size-11");
        }
        const link = slot("announcement-bar-link") as HTMLElement;
        expect(link.className).toContain("min-h-11");
        expect(link.className).toContain("min-w-11");
        expect(link.className).not.toMatch(CLIPPING_CLASSES);
      },
    );

    it("lays the controls under the message in a narrow bar and beside it in a wide one, by the bar's width", () => {
      setup("en", announcements("en").rotating);
      // The message has the whole row first; from `@lg` of the bar's own width it shares the row with
      // the controls. A container query, not the window's `sm`: a bar in a drawer or a 190 px cell
      // of the design system is as narrow at any window width.
      expect(bar().className).toContain("@container");
      expect(messagesBox().className).toContain("basis-full");
      expect(messagesBox().className).toContain("@lg:flex-1");
      expect(slot("announcement-bar-controls")?.className).toContain("flex-wrap");
      expect(bar().innerHTML).not.toMatch(/(?:^|[\s"])(?:max-)?sm:/);
    });
  });

  describe("without JavaScript", () => {
    it("hides the controls, which would do nothing, and keeps the first message and its link", () => {
      const html = renderToString(element("en", announcements("en").rotating));
      const view = document.createElement("div");
      view.innerHTML = html;
      expect(slot("announcement-bar-controls", view)?.className).toContain("noscript:hidden");
      expect(slot("announcement-bar-dismiss", view)?.className).toContain("noscript:hidden");
      const first = slot("announcement-bar-message", view);
      expect(first?.hasAttribute("data-current")).toBe(true);
      expect(first?.getAttribute("aria-hidden")).toBeNull();
      expect(first?.querySelector("a")?.getAttribute("href")).toBe(
        announcements("en").rotating.messages[0]?.link?.href,
      );
    });
  });

  describe("on the server", () => {
    it("renders the first message shown and the others in the markup, hidden", () => {
      const html = renderToString(element("en", announcements("en").rotating));
      const view = document.createElement("div");
      view.innerHTML = html;
      const slides = [...view.querySelectorAll('[data-slot="announcement-bar-message"]')];
      expect(slides).toHaveLength(3);
      expect(slides.map((slide) => slide.hasAttribute("data-current"))).toEqual([
        true,
        false,
        false,
      ]);
      expect(slides.map((slide) => slide.getAttribute("aria-hidden"))).toEqual([
        null,
        "true",
        "true",
      ]);
      expect(slides.map((slide) => slide.hasAttribute("inert"))).toEqual([false, true, true]);
      // A reader without JavaScript, and a crawler, find every message.
      for (const each of announcements("en").rotating.messages)
        expect(html).toContain(each.message);
    });

    it("renders the message defaultIndex names", () => {
      const html = renderToString(element("en", announcements("en").rotating, { defaultIndex: 2 }));
      const view = document.createElement("div");
      view.innerHTML = html;
      expect(
        view.querySelector('[data-current] [data-slot="announcement-bar-text"]')?.textContent,
      ).toBe(announcements("en").rotating.messages[2]?.message);
    });

    it("starts no timer while rendering", () => {
      renderToString(element("en", announcements("en").rotating));
      expect(vi.getTimerCount()).toBe(0);
    });

    it("gives the same markup at any clock", () => {
      vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
      const early = renderToString(element("en", announcements("en").rotating));
      vi.setSystemTime(new Date("2040-01-01T00:00:00Z"));
      expect(renderToString(element("en", announcements("en").rotating))).toBe(early);
    });
  });

  describe("after hydration", () => {
    async function hydrate(locale: Locale, content: AnnouncementBarContent) {
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element(locale, content));
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      await act(async () => {
        hydrateRoot(container, element(locale, content), { onRecoverableError });
      });
      return { container, onRecoverableError, error };
    }

    it.each(LOCALES)(
      "finds the server's markup the same, in %s, and starts rotating",
      async (locale) => {
        const { container, onRecoverableError, error } = await hydrate(
          locale,
          announcements(locale).rotating,
        );
        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
        const { messages } = announcements(locale).rotating;
        expect(shown()).toBe(messages[0]?.message);
        // The timer starts in an effect, after hydration.
        expect(vi.getTimerCount()).toBe(1);
        wait(6);
        expect(shown()).toBe(messages[1]?.message);
        container.remove();
      },
    );

    it("hydrates a single message without a timer", async () => {
      const { container, onRecoverableError } = await hydrate("en", announcements("en").single);
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
      container.remove();
    });

    it("hydrates for a reader who prefers reduced motion with no mismatch, then reads the setting", async () => {
      // The server cannot know the setting, so it renders "no preference"; the browser's next render
      // finds the media query and pauses the bar.
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element("en", announcements("en").rotating));
      expect(container.innerHTML).toContain("Pause announcements");
      reducedMotion(true);
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      await act(async () => {
        hydrateRoot(container, element("en", announcements("en").rotating), { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(pause().getAttribute("aria-label")).toBe("Play announcements");
      expect(vi.getTimerCount()).toBe(0);
      wait(60);
      expect(shown()).toBe(announcements("en").rotating.messages[0]?.message);
      container.remove();
    });
  });

  describe("props", () => {
    it("passes className to the region", () => {
      setup("en", announcements("en").single, { className: "sticky top-0" });
      expect(bar().className).toContain("sticky top-0");
      expect(bar().className).toContain("bg-primary");
    });

    it("leaves each link's prefetch to Next unless the caller says", () => {
      setup("en", announcements("en").rotating, { prefetch: undefined });
      expect(document.querySelectorAll("a")).toHaveLength(3);
      for (const anchor of document.querySelectorAll("a")) {
        expect(anchor.getAttribute("data-prefetch")).toBe("undefined");
      }
    });

    it("turns prefetching off for every link with prefetch={false}", () => {
      setup("en", announcements("en").rotating, { prefetch: false });
      expect(document.querySelectorAll("a")).toHaveLength(3);
      for (const anchor of document.querySelectorAll("a")) {
        expect(anchor.getAttribute("data-prefetch")).toBe("false");
      }
    });

    it("keeps its colours to the tokens: primary ground, primary-foreground text", () => {
      setup("en", announcements("en").rotating);
      expect(bar().className).toContain("bg-primary");
      expect(bar().className).toContain("text-primary-foreground");
      const link = within(bar()).getAllByRole("link")[0] as HTMLElement;
      expect(link.className).toContain("text-primary-foreground");
      expect(link.className).not.toContain("text-primary ");
    });
  });
});

describe("the client file (D49)", () => {
  const source = readFileSync(
    path.join(import.meta.dirname, "announcement-bar-client.tsx"),
    "utf8",
  );
  // What the file imports, from the module specifiers (its header comment names other files).
  const specifiers = [...source.matchAll(/(?:from\s+|import\(\s*)["']([^"']+)["']/g)].map(
    (match) => match[1] ?? "",
  );

  it("is a client component", () => {
    expect(source).toMatch(/^"use client";?$/m);
    expect(specifiers.length).toBeGreaterThan(4);
  });

  it("imports no formatter, no catalog and no fixture: it takes the words made", () => {
    expect(specifiers.filter((each) => /@shopblok\/(?:i18n|registry|fixtures)/.test(each))).toEqual(
      [],
    );
  });

  it("sets no state in an effect: its timer's callback does, and nothing else", () => {
    const effects = [...source.matchAll(/useEffect\(\(\) => \{([\s\S]*?)\n {2}\}, \[/g)].map(
      (match) => match[1] ?? "",
    );
    expect(effects).toHaveLength(1);
    // The one effect sets state only inside the timeout, never in its own body.
    expect(effects[0]?.replace(/setTimeout\([\s\S]*?seconds \* 1000\)/, "")).not.toMatch(
      /set[A-Z]\w*\(/,
    );
  });

  it("reads the reduced motion setting with useSyncExternalStore and a server snapshot of no preference", () => {
    expect(source).toContain("useSyncExternalStore(");
    expect(source).toContain("const noPreference = () => false");
  });
});

describe("the server file", () => {
  const source = readFileSync(path.join(import.meta.dirname, "announcement-bar.tsx"), "utf8");

  it("is not a client component, and formats without the catalogs", () => {
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    expect(source).toContain('from "@shopblok/i18n/format"');
    // A type import of `Messages` is erased; a value import of the index would bring the catalogs.
    expect(source).not.toMatch(/^import (?!type)[^;]*from "@shopblok\/i18n";/m);
  });
});

describe("focusAfter", () => {
  it("skips what Tab would skip: disabled, inert, hidden, tabindex -1, and what is inside the element", () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <section id="from"><button id="inside">Inside</button></section>
      <button disabled>Disabled</button>
      <div inert><button>Inert</button></div>
      <div hidden><button>Hidden</button></div>
      <button tabindex="-1">Not in the order</button>
      <input type="hidden" />
      <a href="/x" id="target">Target</a>
      <button>Last</button>`;
    expect(focusAfter(document.getElementById("from") as HTMLElement)).toBe(true);
    expect(document.activeElement?.id).toBe("target");
    document.body.innerHTML = "";
  });

  it("finds nothing when the element is the last one on the page", () => {
    document.body.innerHTML = `<button>Before</button><section id="from"><button>Inside</button></section>`;
    expect(focusAfter(document.getElementById("from") as HTMLElement)).toBe(false);
    document.body.innerHTML = "";
  });
});
