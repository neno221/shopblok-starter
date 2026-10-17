import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures, fixtureNow } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import type { SavedPaymentMethod } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PortalContainerProvider } from "../primitives/portal-container";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import {
  SavedPaymentMethodCard,
  type SavedPaymentMethodCardProps,
} from "./saved-payment-method-card";

const here = import.meta.dirname;
const cardSource = readFileSync(path.join(here, "saved-payment-method-card.tsx"), "utf8");
const removeSource = readFileSync(path.join(here, "saved-payment-method-remove.tsx"), "utf8");
/** The code without its comments, which say the words the code must not hold. */
const withoutComments = (source: string) =>
  source
    .split("\n")
    .filter((line) => !/^\s*(?:\/\/|\/\*\*|\*)/.test(line))
    .join("\n");
const cardCode = withoutComments(cardSource);
const removeCode = withoutComments(removeSource);

/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const saved = (locale: Locale = "en") => commerceFixtures[locale].savedPaymentMethods;
const visa = (locale: Locale = "en") => saved(locale)[0] as SavedPaymentMethod;

function props(
  locale: Locale,
  card: SavedPaymentMethod,
  extra: Partial<SavedPaymentMethodCardProps> = {},
): SavedPaymentMethodCardProps {
  return {
    card,
    copy: {
      card: catalogs[locale].molecules.savedPaymentMethodCard,
      brands: catalogs[locale].atoms.payment,
    },
    locale: commerceFixtures[locale].market.htmlLang,
    now: fixtureNow,
    ...extra,
  };
}

function setup(
  card: SavedPaymentMethod = visa(),
  extra: Partial<SavedPaymentMethodCardProps> = {},
  locale: Locale = "en",
) {
  return render(<SavedPaymentMethodCard {...props(locale, card, extra)} />);
}

/** A card with the fields a test is about. */
const cardOf = (change: Partial<SavedPaymentMethod> = {}): SavedPaymentMethod => ({
  id: "spm_test",
  brand: "visa",
  last4: "4242",
  expiryMonth: 8,
  expiryYear: 2028,
  isDefault: false,
  ...change,
});

const article = (container: HTMLElement) =>
  container.querySelector("[data-slot=saved-payment-method-card]") as HTMLElement;
const trigger = () => screen.getByRole("button", { name: "Remove Visa ending in 4242" });
const popup = () => document.querySelector<HTMLElement>("[data-slot=saved-payment-method-confirm]");
const dialog = () => screen.findByRole("alertdialog", { name: "Remove this payment method?" });

describe("SavedPaymentMethodCard", () => {
  describe("the files", () => {
    it("splits a server half from the one client part that holds the dialog", () => {
      expect(cardSource).not.toMatch(/^\s*["']use client["']/m);
      expect(removeSource).toMatch(/^"use client";$/m);
      // The client part formats nothing: every string comes in, so no message formatter ships.
      expect(removeSource).not.toMatch(/from "@shopblok\/i18n"/);
      expect(removeSource).not.toMatch(/formatMessage|Intl\./);
    });

    it("judges the expiry by `now`, never by the clock", () => {
      expect(cardCode).not.toMatch(/Date\.now\(|new Date\(\)/);
      expect(removeCode).not.toMatch(/Date\.now\(|new Date\(/);
    });

    it("uses no colour literal and no physical direction", () => {
      for (const source of [cardSource, removeSource]) {
        expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
        expect(source).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|text-(?:left|right)/);
        expect(source).not.toMatch(/\bdark:/);
      }
    });
  });

  describe("the card", () => {
    it("is an article named by its heading, which says the card in words", () => {
      const { container } = setup();
      const heading = screen.getByRole("heading", { level: 3, name: "Visa ending in 4242" });
      const card = article(container);
      expect(card.tagName).toBe("ARTICLE");
      expect(card.getAttribute("aria-labelledby")).toBe(heading.id);
      expect(screen.getByRole("article", { name: "Visa ending in 4242" })).toBe(card);
    });

    it("takes the heading's level from the page's outline", () => {
      setup(visa(), { headingLevel: 2 });
      expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
      expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
    });

    it("draws the brand's mark as decoration: the words already say the brand", () => {
      const { container } = setup();
      const mark = container.querySelector("[data-slot=payment-icon]");
      expect(mark?.getAttribute("data-brand")).toBe("visa");
      expect(mark?.getAttribute("aria-hidden")).toBe("true");
      expect(screen.queryAllByRole("img")).toHaveLength(0);
    });

    it("says when it expires, in month and year as numbers", () => {
      const { container } = setup();
      const expiry = container.querySelector("[data-slot=saved-payment-method-expiry]");
      expect(expiry?.textContent).toBe("Expires 08/2028");
      expect(article(container).hasAttribute("data-expired")).toBe(false);
    });

    it("pads the month to two digits and keeps the year whole", () => {
      const { container } = setup(cardOf({ expiryMonth: 3, expiryYear: 2031 }));
      expect(container.textContent).toContain("Expires 03/2031");
    });

    it("says who holds the card, and says nothing when no one is named", () => {
      const { container, unmount } = setup();
      const holder = container.querySelector("[data-slot=saved-payment-method-holder]");
      expect(holder?.textContent).toBe(`Cardholder: ${visa().holderName}`);
      unmount();
      const anonymous = setup(commerceFixtures.en.paymentSamples.anonymousCard).container;
      expect(anonymous.querySelector("[data-slot=saved-payment-method-holder]")).toBeNull();
      expect(anonymous.textContent).not.toContain("Cardholder");
    });

    it("marks the default card with a word, and no other", () => {
      const cards = saved();
      const { container, unmount } = setup(cards[0]);
      expect(cards[0]?.isDefault).toBe(true);
      expect(article(container).hasAttribute("data-default")).toBe(true);
      expect(container.querySelector("[data-slot=saved-payment-method-default]")?.textContent).toBe(
        "Default",
      );
      unmount();
      const other = setup(cards[1]).container;
      expect(cards[1]?.isDefault).toBe(false);
      expect(article(other).hasAttribute("data-default")).toBe(false);
      expect(other.querySelector("[data-slot=saved-payment-method-default]")).toBeNull();
    });

    it("passes the article's own props on, and merges the class", () => {
      const { container } = setup(visa(), { id: "mine", className: "max-w-md" });
      expect(article(container).id).toBe("mine");
      expect(article(container).className).toContain("max-w-md");
      expect(article(container).className).toContain("min-w-0");
    });

    it("has exactly one remove button, the one a person presses", () => {
      const { container } = setup();
      expect(container.querySelectorAll("[data-slot=saved-payment-method-remove]")).toHaveLength(1);
      expect(screen.getAllByRole("button")).toHaveLength(1);
      const button = trigger();
      expect(button.textContent).toBe("Remove");
      expect(button.getAttribute("aria-haspopup")).toBe("dialog");
      expect(button.className).toContain("min-h-11");
    });
  });

  describe("whether it has expired", () => {
    const expired = (card: SavedPaymentMethod, now: string) => {
      const { container, unmount } = setup(card, { now });
      const result = article(container).hasAttribute("data-expired");
      const text = container.querySelector("[data-slot=saved-payment-method-expiry]")?.textContent;
      unmount();
      return { result, text };
    };

    it("works through the last day of its month, in UTC, and is expired from the next", () => {
      const october = cardOf({ expiryMonth: 10, expiryYear: 2026 });
      expect(expired(october, "2026-10-01T00:00:00.000Z").result).toBe(false);
      expect(expired(october, "2026-10-31T23:59:59.999Z").result).toBe(false);
      expect(expired(october, "2026-11-01T00:00:00.000Z").result).toBe(true);
    });

    it("rolls over the year", () => {
      const december = cardOf({ expiryMonth: 12, expiryYear: 2026 });
      expect(expired(december, "2026-12-31T23:59:59.999Z").result).toBe(false);
      expect(expired(december, "2027-01-01T00:00:00.000Z").result).toBe(true);
      const january = cardOf({ expiryMonth: 1, expiryYear: 2027 });
      expect(expired(january, "2026-12-31T23:59:59.999Z").result).toBe(false);
    });

    it("is expired in an earlier year whatever the month", () => {
      const old = cardOf({ expiryMonth: 12, expiryYear: 2025 });
      expect(expired(old, "2026-01-01T00:00:00.000Z").result).toBe(true);
      expect(expired(old, "2026-10-01T09:00:00.000Z").result).toBe(true);
    });

    it("reads the fixtures' own samples as designed: last month expired, this month still good", () => {
      const { expiredCard, expiringCard } = commerceFixtures.en.paymentSamples;
      expect(expired(expiredCard, fixtureNow)).toEqual({ result: true, text: "Expired 09/2026" });
      expect(expired(expiringCard, fixtureNow)).toEqual({ result: false, text: "Expires 10/2026" });
    });

    it("says it in words with an icon, not by colour alone", () => {
      const { expiredCard } = commerceFixtures.en.paymentSamples;
      const { container } = setup(expiredCard);
      const expiry = container.querySelector("[data-slot=saved-payment-method-expiry]");
      expect(expiry?.textContent).toBe("Expired 09/2026");
      expect(expiry?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(expiry?.className).toContain("text-destructive");
      expect(expiry?.className).toContain("font-medium");
    });

    it("does not read the clock: the same `now` gives the same card in any year", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(new Date("2040-06-15T12:00:00.000Z"));
        const { container } = setup(cardOf({ expiryMonth: 8, expiryYear: 2028 }));
        expect(article(container).hasAttribute("data-expired")).toBe(false);
        expect(container.textContent).toContain("Expires 08/2028");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("remove: without JavaScript", () => {
    it("is a GET form to the confirmation page when there is one, its button the submit", () => {
      const markup = renderToString(
        <SavedPaymentMethodCard
          {...props("en", visa(), { confirmHref: "/account/payment-methods/spm_01/remove" })}
        />,
      );
      expect(markup).toContain('<form data-slot="saved-payment-method-remove-wrapper"');
      expect(markup).toContain('action="/account/payment-methods/spm_01/remove"');
      expect(markup).toContain('method="get"');
      expect(markup).toMatch(
        /<button[^>]*type="submit"[^>]*data-slot="saved-payment-method-remove"/,
      );
      expect(markup).toContain('aria-label="Remove Visa ending in 4242"');
      // The popup is not in the markup until it is opened.
      expect(markup).not.toContain("saved-payment-method-confirm");
    });

    it("is a plain button that submits nothing when there is no page to go to", () => {
      const markup = renderToString(<SavedPaymentMethodCard {...props("en", visa())} />);
      expect(markup).toContain('<div data-slot="saved-payment-method-remove-wrapper"');
      expect(markup).not.toContain("<form");
      expect(markup).toMatch(
        /<button[^>]*type="button"[^>]*data-slot="saved-payment-method-remove"/,
      );
    });

    it("renders the card itself whole on the server: the words, the expiry, the holder", () => {
      const markup = renderToString(<SavedPaymentMethodCard {...props("en", visa())} />);
      expect(markup).toContain("Visa ending in 4242");
      expect(markup).toContain("Expires 08/2028");
      expect(markup).toContain(`Cardholder: ${visa().holderName}`);
      expect(markup).toContain("Default");
    });
  });

  describe("remove: the confirmation", () => {
    it("opens an alert dialog named by the question and described by the card", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(trigger());
      const alert = await screen.findByRole("alertdialog", {
        name: "Remove this payment method?",
        description: "Visa ending in 4242 will be removed from your saved payment methods.",
      });
      expect(alert).toBe(popup());
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(alert.getAttribute("data-slot")).toBe("saved-payment-method-confirm");
      // No corner close button: the answer is Cancel or Remove, and nothing else.
      expect(
        within(alert)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Cancel", "Remove"]);
    });

    it("puts focus on Cancel, the least destructive choice", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(trigger());
      const alert = await dialog();
      const cancel = within(alert).getByRole("button", { name: "Cancel" });
      await waitFor(() => expect(document.activeElement).toBe(cancel));
    });

    it("keeps Tab inside, between Cancel and Remove", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(trigger());
      const alert = await dialog();
      const cancel = within(alert).getByRole("button", { name: "Cancel" });
      const remove = within(alert).getByRole("button", { name: "Remove" });
      await waitFor(() => expect(document.activeElement).toBe(cancel));
      await user.tab();
      expect(document.activeElement).toBe(remove);
      await user.tab();
      expect(alert.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(cancel);
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(remove);
    });

    it("hides the page behind from assistive technology while it is open", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(trigger());
      await dialog();
      expect(screen.queryByRole("article")).toBeNull();
      expect(screen.queryByRole("button", { name: "Remove Visa ending in 4242" })).toBeNull();
    });

    it("closes on Escape with focus back on the remove button", async () => {
      const user = userEvent.setup();
      setup();
      const button = trigger();
      await user.click(button);
      await dialog();
      await user.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      expect(document.activeElement).toBe(button);
    });

    it("closes with Cancel, focus back on the remove button, and removes nothing", async () => {
      const user = userEvent.setup();
      const action = vi.fn();
      setup(visa(), { action });
      const button = trigger();
      await user.click(button);
      const alert = await dialog();
      await user.click(within(alert).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      expect(document.activeElement).toBe(button);
      expect(action).not.toHaveBeenCalled();
    });

    it("is not dismissed by a press outside: it is a question that needs an answer", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(trigger());
      await dialog();
      const overlay = document.querySelector("[data-slot=dialog-overlay]");
      expect(overlay).toBeTruthy();
      await user.click(overlay as Element);
      expect(screen.getByRole("alertdialog")).toBeTruthy();
    });

    it("opens from the keyboard", async () => {
      const user = userEvent.setup();
      setup();
      trigger().focus();
      await user.keyboard("{Enter}");
      await dialog();
    });

    it("is drawn open with `defaultOpen`, the page left reachable with `modal={false}`", async () => {
      render(
        <>
          <button type="button">Before</button>
          <SavedPaymentMethodCard {...props("en", visa(), { defaultOpen: true, modal: false })} />
        </>,
      );
      await dialog();
      expect(screen.getByRole("button", { name: "Before" })).toBeTruthy();
      expect(screen.getByRole("article")).toBeTruthy();
    });

    it("lands in the container the PortalContainerProvider names (D45)", async () => {
      function Boxed() {
        const [box, setBox] = React.useState<HTMLDivElement | null>(null);
        return (
          <div ref={setBox} data-testid="box">
            <PortalContainerProvider container={box}>
              <SavedPaymentMethodCard
                {...props("en", visa(), { defaultOpen: true, modal: false })}
              />
            </PortalContainerProvider>
          </div>
        );
      }
      render(<Boxed />);
      const alert = await dialog();
      expect(screen.getByTestId("box").contains(alert)).toBe(true);
    });

    it("takes a class for the popup", async () => {
      render(
        <SavedPaymentMethodCard
          {...props("en", visa(), { defaultOpen: true, popupClassName: "sm:max-w-sm" })}
        />,
      );
      await dialog();
      expect(popup()?.className).toContain("sm:max-w-sm");
    });

    it("names the trigger and the popup by the selectors the design system presses", async () => {
      const user = userEvent.setup();
      const { container } = setup();
      const triggers = container.querySelectorAll("[data-slot=saved-payment-method-remove]");
      expect(triggers).toHaveLength(1);
      await user.click(triggers[0] as Element);
      await dialog();
      expect(document.querySelectorAll("[data-slot=saved-payment-method-confirm]")).toHaveLength(1);
    });
  });

  describe("remove: with JavaScript, the link to the confirmation page is not followed", () => {
    it("opens the dialog and does not submit the form", async () => {
      const user = userEvent.setup();
      const { container } = setup(visa(), {
        confirmHref: "/account/payment-methods/spm_01/remove",
      });
      const submit = vi.fn((event: Event) => event.preventDefault());
      container.querySelector("form")?.addEventListener("submit", submit);
      await user.click(trigger());
      await dialog();
      expect(submit).not.toHaveBeenCalled();
    });

    it("opens from the keyboard the same way", async () => {
      const user = userEvent.setup();
      const { container } = setup(visa(), {
        confirmHref: "/account/payment-methods/spm_01/remove",
      });
      const submit = vi.fn((event: Event) => event.preventDefault());
      container.querySelector("form")?.addEventListener("submit", submit);
      trigger().focus();
      await user.keyboard("{Enter}");
      await dialog();
      expect(submit).not.toHaveBeenCalled();
    });
  });

  describe("remove: sending the answer", () => {
    it("calls a function action with the card's id as `paymentMethodId`", async () => {
      const user = userEvent.setup();
      const action = vi.fn(async (_data: FormData) => {});
      setup(visa(), { action });
      await user.click(trigger());
      const alert = await dialog();
      await user.click(within(alert).getByRole("button", { name: "Remove" }));
      await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
      expect(action.mock.calls[0]?.[0].get("paymentMethodId")).toBe("spm_01");
    });

    it("posts to a URL action, the id in a hidden field", async () => {
      render(
        <SavedPaymentMethodCard
          {...props("en", visa(), { action: "/api/payment-methods/remove", defaultOpen: true })}
        />,
      );
      const alert = await dialog();
      const form = alert.querySelector("form");
      expect(form?.getAttribute("action")).toBe("/api/payment-methods/remove");
      expect(form?.getAttribute("method")).toBe("post");
      const hidden = form?.querySelector("input[type=hidden]") as HTMLInputElement;
      expect(hidden.name).toBe("paymentMethodId");
      expect(hidden.value).toBe("spm_01");
      expect(within(alert).getByRole("button", { name: "Remove" }).getAttribute("type")).toBe(
        "submit",
      );
    });

    it("leaves the method to React for a function, and sends no card number", async () => {
      render(
        <SavedPaymentMethodCard
          {...props("en", visa(), { action: () => {}, defaultOpen: true })}
        />,
      );
      const alert = await dialog();
      expect(alert.querySelector("form")?.getAttribute("method")).toBeNull();
      const names = [...alert.querySelectorAll("input")].map((input) => input.name);
      expect(names).toEqual(["paymentMethodId"]);
    });

    it("shows it is working while a function action runs, and cannot be sent twice", async () => {
      const user = userEvent.setup();
      const action = vi.fn(() => new Promise<void>(() => {}));
      setup(visa(), { action });
      await user.click(trigger());
      const alert = await dialog();
      await user.click(within(alert).getByRole("button", { name: "Remove" }));
      const busy = await within(alert).findByRole("button", { name: /Removing/ });
      expect(busy.getAttribute("aria-busy")).toBe("true");
      expect(busy.getAttribute("type")).toBe("button");
      expect(busy.getAttribute("aria-disabled")).toBe("true");
      await user.click(busy);
      expect(action).toHaveBeenCalledTimes(1);
    });
  });

  describe("remove: the states the caller sets", () => {
    const open = (status: SavedPaymentMethodCardProps["status"], action = vi.fn()) =>
      render(
        <SavedPaymentMethodCard
          {...props("en", visa(), { status, action, defaultOpen: true, modal: false })}
        />,
      );

    it("is idle: Remove is ready, and the status region is there but empty", async () => {
      open("idle");
      const alert = await dialog();
      const remove = within(alert).getByRole("button", { name: "Remove" });
      expect(remove.getAttribute("aria-busy")).toBeNull();
      expect(remove.getAttribute("aria-disabled")).toBeNull();
      const status = within(alert).getByRole("status");
      expect(status.textContent).toBe("");
      expect(status.getAttribute("data-slot")).toBe("saved-payment-method-confirm-status");
    });

    it("is removing: the same button, same place, saying so, unable to be pressed again", async () => {
      const user = userEvent.setup();
      const action = vi.fn();
      open("removing", action);
      const alert = await dialog();
      const busy = within(alert).getByRole("button", { name: /Removing/ });
      expect(busy.getAttribute("data-slot")).toBe("saved-payment-method-confirm-button");
      expect(busy.getAttribute("aria-busy")).toBe("true");
      expect(busy.getAttribute("aria-disabled")).toBe("true");
      expect(busy.getAttribute("type")).toBe("button");
      expect(busy.className).toContain("aria-disabled:pointer-events-none");
      // Announced, in the always-present region.
      expect(within(alert).getByRole("status").textContent).toContain("Removing…");
      await user.click(busy);
      expect(action).not.toHaveBeenCalled();
      // The spinner is a status of its own: it must not be the button's second name.
      expect(within(alert).getAllByRole("button")).toHaveLength(2);
    });

    it("is error: says so in words with an icon, and the dialog stays open with Remove ready", async () => {
      open("error");
      const alert = await dialog();
      const status = within(alert).getByRole("status");
      expect(status.textContent).toBe("We could not remove this payment method. Please try again.");
      expect(status.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(status.querySelector("p")?.className).toContain("text-destructive");
      const remove = within(alert).getByRole("button", { name: "Remove" });
      expect(remove.getAttribute("aria-busy")).toBeNull();
      expect(remove.getAttribute("type")).toBe("submit");
    });
  });

  describe("in every language", () => {
    it("writes the card, the expiry and the buttons in the locale's words", async () => {
      for (const locale of LOCALES) {
        const copy = catalogs[locale].molecules.savedPaymentMethodCard;
        const { container, unmount } = render(
          <>
            {saved(locale).map((card) => (
              <SavedPaymentMethodCard key={card.id} {...props(locale, card)} />
            ))}
          </>,
        );
        const text = plain(container.textContent);
        expect(text).toContain(copy.default);
        expect(text).toContain(copy.remove);
        expect(text).toContain("08/2028");
        expect(text).toContain("12/2027");
        expect(text).toContain("03/2029");
        if (locale !== "en") {
          expect(text).not.toMatch(/Expires|Default|Cardholder|ending in|Remove/);
        }
        expect(screen.getAllByRole("article")).toHaveLength(3);
        unmount();
      }
    });

    it("asks in the locale's words, with the card named in the question", async () => {
      for (const locale of LOCALES) {
        const copy = catalogs[locale].molecules.savedPaymentMethodCard;
        const { unmount } = render(
          <SavedPaymentMethodCard {...props(locale, visa(locale), { defaultOpen: true })} />,
        );
        const alert = await screen.findByRole("alertdialog", { name: copy.confirmTitle });
        expect(within(alert).getByRole("button", { name: copy.cancel })).toBeTruthy();
        expect(within(alert).getByRole("button", { name: copy.confirm })).toBeTruthy();
        expect(plain(alert.textContent)).toContain("4242");
        unmount();
      }
    });
  });

  describe("how it looks", () => {
    it("lays out in a row from a container size up, and in a column below, the button full width", () => {
      const { container } = setup();
      const card = article(container);
      // The card is the container, and a container cannot query itself: its children do.
      expect(card.className).toContain("@container");
      expect(card.className).not.toMatch(/(^|\s)@[\w[\]-]+:/);
      const layout = card.firstElementChild;
      expect(layout?.className).toContain("flex-col");
      expect(layout?.className).toContain("@sm:flex-row");
      // The mark goes above the details on a very narrow card, where "Προεπιλογή" would clip.
      const details = layout?.firstElementChild;
      expect(details?.className).toContain("flex-col");
      expect(details?.className).toContain("@min-[10rem]:flex-row");
      expect(trigger().className).toContain("w-full");
      expect(trigger().className).toContain("@sm:w-auto");
    });

    it("wraps the longest holder's name in German and Greek, and never widens the card", () => {
      for (const [locale, strings] of longLabels) {
        const long = commerceFixtures[locale].paymentSamples.longHolderCard;
        expect(long.holderName).toBe(strings.personName);
        const { container, unmount } = setup(long, {}, locale);
        const holder = container.querySelector("[data-slot=saved-payment-method-holder]");
        expect(holder?.textContent).toContain(strings.personName);
        expect(holder?.className).toContain("wrap-break-word");
        expect(article(container).className).toContain("min-w-0");
        for (const element of container.querySelectorAll("*")) {
          expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
        }
        unmount();
      }
    });

    it("keeps the mark and the button their size while the words give way", () => {
      const { container } = setup();
      const mark = container.querySelector("[data-slot=payment-icon]");
      expect(mark?.getAttribute("class")).toContain("shrink-0");
      expect(
        container.querySelector("[data-slot=saved-payment-method-remove-wrapper]")?.className,
      ).toContain("@sm:shrink-0");
    });

    it("draws the dialog's words so that a long one wraps", async () => {
      render(
        <SavedPaymentMethodCard
          {...props("de", commerceFixtures.de.paymentSamples.longHolderCard, { defaultOpen: true })}
        />,
      );
      const alert = await screen.findByRole("alertdialog");
      expect(alert.querySelector("[data-slot=dialog-description]")?.className).toContain(
        "wrap-break-word",
      );
      for (const element of alert.querySelectorAll("*")) {
        expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
      }
    });
  });
});
