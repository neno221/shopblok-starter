import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { VerificationRequest } from "@shopblok/registry/contracts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { VerificationNotice, type VerificationNoticeProps } from "./verification-notice";
import { createCooldown } from "./verification-resend";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
const requests = (locale: Locale) => commerceFixtures[locale].checkoutFlow.verification;
/** `seconds` as Intl writes it for the locale ("42 sec"): the runtime's own words. */
const seconds = (locale: Locale, count: number) =>
  new Intl.NumberFormat(htmlLang[locale], {
    style: "unit",
    unit: "second",
    unitDisplay: "short",
  }).format(count);
/** The sentence about the wait, as the copy and Intl make it. */
const cooldown = (locale: Locale, count: number) =>
  formatMessage(
    catalogs[locale].molecules.verificationNotice.cooldown,
    { time: seconds(locale, count) },
    htmlLang[locale],
  );

function element(
  locale: Locale,
  request: VerificationRequest,
  props: Partial<VerificationNoticeProps> = {},
) {
  return (
    <VerificationNotice
      {...request}
      copy={catalogs[locale].molecules.verificationNotice}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}

function setup(
  locale: Locale,
  request: VerificationRequest,
  props?: Partial<VerificationNoticeProps>,
) {
  return render(element(locale, request, props));
}

const resend = () =>
  document.querySelector<HTMLButtonElement>("[data-slot=verification-notice-resend]")!;
const hint = () => document.querySelector("[data-slot=verification-notice-cooldown]");
const region = () => screen.getByRole("status");
const SECOND = 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(fixtureNow));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("VerificationNotice", () => {
  describe("structure", () => {
    it("is a form named by its heading, which is an h2 unless asked otherwise", () => {
      setup("en", requests("en").waiting);
      const form = screen.getByRole("form", { name: "Check your email" });
      expect(form.tagName).toBe("FORM");
      expect(screen.getByRole("heading", { level: 2, name: "Check your email" })).toBeTruthy();
    });

    it("takes the heading's level from the page's outline", () => {
      setup("en", requests("en").waiting, { headingLevel: 1 });
      expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
      expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    });

    it("names the address the link was sent to, in the sentence, in the semibold weight", () => {
      setup("en", requests("en").waiting);
      const sentence = document.querySelector("[data-slot=verification-notice-sent]");
      expect(sentence?.tagName).toBe("P");
      expect(plain(sentence?.textContent)).toBe(
        "We sent a link to alex.morgan@example.com. Open it to verify your address.",
      );
      const address = sentence?.querySelector("[data-slot=verification-notice-email]");
      expect(address?.textContent).toBe("alex.morgan@example.com");
      expect(address?.className).toContain("font-semibold");
      // A long address has nowhere else to break.
      expect(address?.className).toContain("wrap-anywhere");
      // The slot character that cut the sentence never reaches the page.
      expect(sentence?.textContent).not.toContain("");
    });

    it("puts the address wherever the language's sentence needs it", () => {
      const base = catalogs.en.molecules.verificationNotice;
      for (const sent of ["{email} will get a link.", "Link sent: {email}", "{email}"]) {
        const { unmount } = setup("en", requests("en").waiting, { copy: { ...base, sent } });
        expect(
          plain(document.querySelector("[data-slot=verification-notice-sent]")?.textContent),
        ).toBe(sent.replace("{email}", "alex.morgan@example.com"));
        unmount();
      }
    });

    it("tells a shopper whose mail has not come where to look", () => {
      setup("en", requests("en").waiting);
      expect(screen.getByText("Nothing in your inbox? Check your spam folder.")).toBeTruthy();
    });

    it("carries the address in a hidden field, so the server knows whom to write to", () => {
      const { container } = setup("en", requests("en").waiting);
      const field = container.querySelector<HTMLInputElement>("input[type=hidden]");
      expect(field?.name).toBe("email");
      expect(field?.value).toBe("alex.morgan@example.com");
      // The only field: nothing for a shopper to fill in.
      expect(container.querySelectorAll("input:not([type=hidden]), select, textarea")).toHaveLength(
        0,
      );
    });

    it("is posted: a URL action posts, and so does no action; a function leaves it to React", () => {
      const { container, rerender } = setup("en", requests("en").waiting, {
        action: "/api/verify/resend",
      });
      let form = container.querySelector("form");
      expect(form?.getAttribute("action")).toBe("/api/verify/resend");
      expect(form?.getAttribute("method")).toBe("post");
      rerender(element("en", requests("en").waiting));
      form = container.querySelector("form");
      expect(form?.getAttribute("method")).toBe("post");
      rerender(element("en", requests("en").waiting, { action: () => {} }));
      expect(container.querySelector("form")?.getAttribute("method")).toBeNull();
    });

    it("renders on the server, as markup a browser can submit without JavaScript", () => {
      const markup = renderToStaticMarkup(
        element("en", requests("en").ready, { action: "/api/verify/resend" }),
      );
      expect(markup).toContain("<form ");
      expect(markup).toContain('method="post"');
      expect(markup).toContain('action="/api/verify/resend"');
      expect(markup).toContain('type="hidden"');
      expect(markup).toContain('name="email"');
      expect(markup).toContain('value="alex.morgan@example.com"');
      expect(markup).toContain('type="submit"');
      expect(markup).toContain("Send a new link");
      expect(markup).not.toContain("<script");
    });

    it("renders the wait the server was told, which does not run down without JavaScript", () => {
      const markup = renderToStaticMarkup(element("en", requests("en").waiting));
      expect(markup).toContain(cooldown("en", 42));
      expect(markup).toContain('type="button"');
      expect(markup).not.toContain('type="submit"');
    });

    it("passes the form's own props on, and merges the class", () => {
      const { container } = setup("en", requests("en").waiting, {
        id: "verify-notice",
        className: "max-w-md",
      });
      const form = container.querySelector("form");
      expect(form?.id).toBe("verify-notice");
      expect(form?.className).toContain("max-w-md");
      expect(form?.className).toContain("w-full");
    });

    it("gives two notices on one page ids of their own", () => {
      const { container } = render(
        <>
          {[0, 1].map((key) => (
            <div key={key}>{element("en", requests("en").waiting)}</div>
          ))}
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(screen.getAllByRole("form")).toHaveLength(2);
    });
  });

  describe("the wait", () => {
    it("keeps the button, unavailable, while the server's wait runs", () => {
      setup("en", requests("en").waiting);
      const button = screen.getByRole("button", { name: "Send a new link" }) as HTMLButtonElement;
      expect(button).toBe(resend());
      expect(button.type).toBe("button");
      // Base UI's focusableWhenDisabled: aria-disabled, so it stays in the tab order.
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.disabled).toBe(false);
    });

    it("says how long is left, and the button is described by it", () => {
      setup("en", requests("en").waiting);
      expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 42)));
      expect(plain(hint()?.textContent)).toMatch(/^You can ask for a new link in 42\s?sec\w*\.$/);
      expect(resend().getAttribute("aria-describedby")).toBe(hint()?.id);
    });

    it("offers the button at once when there is no wait", () => {
      setup("en", requests("en").ready);
      expect(resend().type).toBe("submit");
      expect(resend().getAttribute("aria-disabled")).toBeNull();
      expect(resend().getAttribute("aria-describedby")).toBeNull();
      expect(hint()).toBeNull();
      // Nothing was waited for, so there is nothing to announce.
      expect(region().textContent).toBe("");
    });

    it("counts down in the browser, a second at a time", () => {
      setup("en", requests("en").waiting);
      expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 42)));
      act(() => void vi.advanceTimersByTime(SECOND));
      expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 41)));
      act(() => void vi.advanceTimersByTime(10 * SECOND));
      expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 31)));
      expect(resend().type).toBe("button");
    });

    it("does not announce the seconds: the line is not live and not in the region", () => {
      setup("en", requests("en").waiting);
      expect(hint()?.hasAttribute("aria-live")).toBe(false);
      expect(hint()?.closest("[aria-live]")).toBeNull();
      expect(hint()?.closest("[role=status], [role=timer]")).toBeNull();
      const before = region().textContent;
      act(() => void vi.advanceTimersByTime(20 * SECOND));
      expect(region().textContent).toBe(before);
    });

    it("makes the button work and says so, once, when the wait is over", () => {
      setup("en", requests("en").waiting);
      act(() => void vi.advanceTimersByTime(41 * SECOND));
      expect(resend().type).toBe("button");
      expect(region().textContent).toBe("");
      act(() => void vi.advanceTimersByTime(SECOND));
      expect(resend().type).toBe("submit");
      expect(resend().getAttribute("aria-disabled")).toBeNull();
      expect(hint()).toBeNull();
      expect(region().textContent).toBe("You can ask for a new link now.");
      // Said once: nothing more happens as time goes on.
      act(() => void vi.advanceTimersByTime(60 * SECOND));
      expect(region().textContent).toBe("You can ask for a new link now.");
      expect(vi.getTimerCount()).toBe(0);
    });

    it("announces in the region that is always there, so a reader hears the change", () => {
      setup("en", requests("en").waiting);
      const before = region();
      act(() => void vi.advanceTimersByTime(42 * SECOND));
      expect(region()).toBe(before);
      expect(before.getAttribute("aria-live")).toBe("polite");
    });

    it("submits once the wait is over, and not before", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      setup("en", requests("en").waiting, { onSubmit });
      fireEvent.click(resend());
      expect(onSubmit).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(42 * SECOND));
      fireEvent.click(resend());
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("sends the address with the form", () => {
      let sent: [string, string][] = [];
      const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        sent = [...new FormData(event.currentTarget)].map(([name, value]) => [name, String(value)]);
      });
      setup("en", requests("en").ready, { onSubmit });
      fireEvent.click(resend());
      expect(sent).toEqual([["email", "alex.morgan@example.com"]]);
    });

    it("stops its timer when the notice goes away", () => {
      const { unmount } = setup("en", requests("en").waiting);
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("runs no timer when there is no wait", () => {
      setup("en", requests("en").ready);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("counts the same under StrictMode, which subscribes twice", () => {
      render(<StrictMode>{element("en", requests("en").waiting)}</StrictMode>);
      expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 42)));
      act(() => void vi.advanceTimersByTime(SECOND));
      expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 41)));
      expect(vi.getTimerCount()).toBe(1);
    });
  });

  describe("the states", () => {
    it("keeps one status region in the page in every state", () => {
      for (const status of ["sent", "sending", "resent", "error"] as const) {
        for (const request of [requests("en").waiting, requests("en").ready]) {
          const { unmount } = setup("en", request, { status });
          expect(region().getAttribute("aria-live")).toBe("polite");
          expect(screen.getAllByRole("status")).toHaveLength(1);
          unmount();
        }
      }
    });

    it("is the first send by default: nothing in the region but the wait", () => {
      const { container } = setup("en", requests("en").waiting);
      expect(container.querySelector("form")?.getAttribute("data-status")).toBe("sent");
      expect(region().textContent).toBe("");
    });

    describe("sending", () => {
      it("keeps the button, named for what is happening, and stops it submitting twice", () => {
        setup("en", requests("en").ready, { status: "sending" });
        const button = screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement;
        expect(button).toBe(resend());
        expect(button.type).toBe("button");
        expect(button.getAttribute("aria-disabled")).toBe("true");
        expect(button.disabled).toBe(false);
        expect(button.getAttribute("aria-busy")).toBe("true");
        expect(screen.queryByRole("button", { name: "Send a new link" })).toBeNull();
        expect(within(region()).getByText("Sending…")).toBeTruthy();
      });

      it("submits nothing on a click", () => {
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        setup("en", requests("en").ready, { status: "sending", onSubmit });
        fireEvent.click(resend());
        expect(onSubmit).not.toHaveBeenCalled();
      });

      it("draws the spinner hidden from assistive technology, and shows no wait", () => {
        setup("en", requests("en").waiting, { status: "sending" });
        const spinner = resend().querySelector("[data-slot=spinner]");
        expect(spinner?.closest("[aria-hidden=true]")).toBeTruthy();
        expect(hint()).toBeNull();
        expect(resend().getAttribute("aria-describedby")).toBeNull();
      });

      it("keeps focus on the button when the send begins", async () => {
        vi.useRealTimers();
        const user = userEvent.setup();
        const { rerender } = setup("en", requests("en").ready);
        await user.tab();
        expect(document.activeElement).toBe(resend());
        rerender(element("en", requests("en").ready, { status: "sending" }));
        // The same button, not a new one: a keyboard user is not thrown out of the form.
        expect(document.activeElement).toBe(resend());
        expect(document.activeElement?.textContent).toContain("Sending…");
      });
    });

    describe("resent", () => {
      it("says a new link was sent, in the region, with a mark as well as words", () => {
        setup("en", requests("en").waiting, { status: "resent" });
        const message = within(region()).getByText("We sent a new link.");
        expect(message.parentElement?.querySelector("svg[aria-hidden=true]")).toBeTruthy();
      });

      it("starts the wait again from the same number", () => {
        const { rerender } = setup("en", requests("en").ready);
        rerender(element("en", requests("en").ready, { status: "sending" }));
        rerender(
          element("en", { ...requests("en").ready, resendInSeconds: 42 }, { status: "resent" }),
        );
        expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 42)));
        expect(resend().type).toBe("button");
        act(() => void vi.advanceTimersByTime(5 * SECOND));
        expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 37)));
      });

      it("restarts a wait that was running when the server says the same number again", () => {
        const { rerender } = setup("en", requests("en").waiting);
        act(() => void vi.advanceTimersByTime(30 * SECOND));
        expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 12)));
        rerender(element("en", requests("en").waiting, { status: "resent" }));
        expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 42)));
        // And a wait of a new length starts from that length.
        rerender(
          element("en", { ...requests("en").waiting, resendInSeconds: 90 }, { status: "resent" }),
        );
        expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 90)));
      });

      it("keeps the same button and region through the change", () => {
        const { rerender } = setup("en", requests("en").ready);
        const button = resend();
        const live = region();
        rerender(element("en", requests("en").ready, { status: "sending" }));
        rerender(element("en", requests("en").waiting, { status: "resent" }));
        expect(resend()).toBe(button);
        expect(region()).toBe(live);
        expect(live.textContent).toBe("We sent a new link.");
      });

      it("adds the news that a link can be asked for again when the new wait is over", () => {
        setup("en", requests("en").waiting, { status: "resent" });
        act(() => void vi.advanceTimersByTime(42 * SECOND));
        expect(region().textContent).toBe("We sent a new link.You can ask for a new link now.");
        expect(resend().type).toBe("submit");
      });
    });

    describe("error", () => {
      it("says the email could not be sent, in the region, with an icon as well as words", () => {
        setup("en", requests("en").ready, { status: "error" });
        const message = within(region()).getByText(
          "We could not send the email. Please try again.",
        );
        expect(message.parentElement?.querySelector("svg[aria-hidden=true]")).toBeTruthy();
        expect(message.parentElement?.className).toContain("text-destructive");
      });

      it("still offers the resend", () => {
        setup("en", requests("en").ready, { status: "error" });
        expect(resend().type).toBe("submit");
        expect(resend().getAttribute("aria-disabled")).toBeNull();
        expect(resend().textContent).toBe("Send a new link");
      });

      it("keeps the server's wait if it set one: the error does not lift it", () => {
        setup("en", requests("en").waiting, { status: "error" });
        expect(resend().type).toBe("button");
        expect(plain(hint()?.textContent)).toBe(plain(cooldown("en", 42)));
      });

      it("announces the change from a quiet region to the message", () => {
        const { rerender } = setup("en", requests("en").ready);
        const live = region();
        expect(live.textContent).toBe("");
        rerender(element("en", requests("en").ready, { status: "error" }));
        expect(region()).toBe(live);
        expect(live.textContent).toBe("We could not send the email. Please try again.");
      });
    });
  });

  describe("keyboard use", () => {
    it("tabs to the button while the wait runs, where it is unavailable but findable", async () => {
      vi.useRealTimers();
      const user = userEvent.setup();
      setup("en", requests("en").waiting);
      await user.tab();
      expect(document.activeElement).toBe(resend());
    });

    it("sends with Enter and with Space once the wait is over", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      vi.useRealTimers();
      const user = userEvent.setup();
      setup("en", requests("en").ready, { onSubmit });
      await user.tab();
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
      await user.keyboard(" ");
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("sends nothing with Enter while the wait runs", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      vi.useRealTimers();
      const user = userEvent.setup();
      setup("en", requests("en").waiting, { onSubmit });
      await user.tab();
      await user.keyboard("{Enter}");
      await user.keyboard(" ");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("after hydration", () => {
    async function hydrate(locale: Locale, request: VerificationRequest) {
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(element(locale, request));
      const onRecoverableError = vi.fn();
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      await act(async () => {
        hydrateRoot(container, element(locale, request), { onRecoverableError });
      });
      return { container, onRecoverableError, error };
    }

    it("finds the server's markup the same, and counts on from the browser's clock", async () => {
      // The server rendered a minute before: the wait is counted from when the browser subscribes.
      vi.setSystemTime(new Date(Date.parse(fixtureNow) + 60 * SECOND));
      const { container, onRecoverableError, error } = await hydrate("en", requests("en").waiting);
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      const line = () => container.querySelector("[data-slot=verification-notice-cooldown]");
      expect(plain(line()?.textContent)).toBe(plain(cooldown("en", 42)));
      act(() => void vi.advanceTimersByTime(SECOND));
      expect(plain(line()?.textContent)).toBe(plain(cooldown("en", 41)));
      container.remove();
    });

    it.each(["de", "el"] as const)(
      "hydrates the markup in %s without a mismatch",
      async (locale) => {
        const { container, onRecoverableError, error } = await hydrate(
          locale,
          requests(locale).waiting,
        );
        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
        container.remove();
      },
    );

    it("hydrates a notice with no wait without a timer", async () => {
      const { container, onRecoverableError } = await hydrate("en", requests("en").ready);
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
      container.remove();
    });
  });

  describe("the cooldown store", () => {
    it("reads the number it was given until something listens", () => {
      const store = createCooldown(5);
      expect(store.getSnapshot()).toBe(5);
      vi.advanceTimersByTime(3 * SECOND);
      expect(store.getSnapshot()).toBe(5);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("counts from the moment of the first listener, waking it at each second", () => {
      const store = createCooldown(3);
      const listener = vi.fn();
      const stop = store.subscribe(listener);
      expect(store.getSnapshot()).toBe(3);
      vi.advanceTimersByTime(SECOND);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getSnapshot()).toBe(2);
      vi.advanceTimersByTime(2 * SECOND);
      expect(listener).toHaveBeenCalledTimes(3);
      expect(store.getSnapshot()).toBe(0);
      // At 0 it is done for good.
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(10 * SECOND);
      expect(listener).toHaveBeenCalledTimes(3);
      stop();
    });

    it("stops asking the clock when the last listener goes", () => {
      const store = createCooldown(10);
      const stop = store.subscribe(() => {});
      expect(vi.getTimerCount()).toBe(1);
      stop();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("has nothing to count for a wait of 0", () => {
      const store = createCooldown(0);
      const stop = store.subscribe(() => {});
      expect(store.getSnapshot()).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
      stop();
    });
  });

  describe("the copy", () => {
    it.each(LOCALES)("reads in %s: heading, sentence, button and wait", (locale) => {
      setup(locale, requests(locale).waiting);
      const copy = catalogs[locale].molecules.verificationNotice;
      expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
      expect(
        plain(document.querySelector("[data-slot=verification-notice-sent]")?.textContent),
      ).toBe(
        plain(
          formatMessage(copy.sent, { email: requests(locale).waiting.email }, htmlLang[locale]),
        ),
      );
      expect(plain(document.body.textContent)).toContain(plain(copy.spam));
      expect(screen.getByRole("button", { name: copy.resend })).toBeTruthy();
      expect(plain(hint()?.textContent)).toBe(plain(cooldown(locale, 42)));
    });

    it.each(LOCALES)("says sending, resent, error and ready in %s", (locale) => {
      const copy = catalogs[locale].molecules.verificationNotice;
      let view = setup(locale, requests(locale).ready, { status: "sending" });
      expect(resend().textContent).toBe(copy.sending);
      view.unmount();
      view = setup(locale, requests(locale).waiting, { status: "resent" });
      expect(region().textContent).toContain(copy.resent);
      act(() => void vi.advanceTimersByTime(42 * SECOND));
      expect(region().textContent).toContain(copy.ready);
      view.unmount();
      view = setup(locale, requests(locale).ready, { status: "error" });
      expect(region().textContent).toContain(copy.error);
    });

    it("writes the seconds in the language of the page", () => {
      const written = LOCALES.map((locale) => seconds(locale, 42));
      expect(new Set(written).size).toBeGreaterThan(1);
    });
  });

  describe("sizes and long labels", () => {
    it("makes the button at least 44 px high (D32)", () => {
      setup("en", requests("en").ready);
      expect(resend().className).toContain("min-h-11");
    });

    it("lays the button out at its own width when the notice is wide, and across when narrow", () => {
      const { container } = setup("en", requests("en").ready);
      expect(container.querySelector("form")?.className).toContain("@container");
      expect(
        container.querySelector("[data-slot=verification-notice-actions]")?.className,
      ).toContain("@md:items-start");
    });

    it("uses the focus ring at full strength on the button", () => {
      setup("en", requests("en").ready);
      expect(resend().className).toContain("focus-visible:ring-ring");
      expect(resend().className).not.toMatch(/ring-ring\/\d/);
    });

    it("dims an unavailable button without hiding it, and ignores the pointer on it", () => {
      setup("en", requests("en").waiting);
      expect(resend().className).toContain("aria-disabled:opacity-50");
      expect(resend().className).toContain("aria-disabled:pointer-events-none");
    });

    it.each(["de", "el"] as const)("lets the longest copy, in %s, wrap", (locale) => {
      const { container } = setup(locale, requests(locale).long, { status: "error" });
      for (const node of container.querySelectorAll("*")) {
        expect(String(node.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
      // The whole address is in the page, and free to break anywhere.
      const address = container.querySelector("[data-slot=verification-notice-email]");
      expect(address?.textContent).toBe(requests(locale).long.email);
      expect(address?.className).toContain("wrap-anywhere");
      expect(container.querySelector("form")?.className).toContain("min-w-0");
      expect(resend().className).toContain("max-w-full");
      expect(resend().querySelector("span")?.className).toContain("wrap-break-word");
    });

    it("uses only logical properties", () => {
      const { container } = setup("en", requests("en").waiting, { status: "resent" });
      const classes = [...container.querySelectorAll("*")]
        .map((node) => node.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right|text-left|text-right)-/);
    });
  });
});
