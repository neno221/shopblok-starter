// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). PaymentMethodsManager's tests,
// in Testing Library and happy-dom: a list named "Saved payment methods" of SavedPaymentMethodCards,
// "Set as default" under each card that is not the default (a form that posts unless its action is a
// function, a name that starts with its visible words), the add tile only when the shop can add one,
// what is in flight (the default button held and said politely, the card's removal held), the empty
// state, a long German and Greek label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { PaymentMethodsManager as ManagerContent } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { PaymentMethodsManager, type PaymentMethodsManagerProps } from "./payment-methods-manager";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const NOW = "2026-10-18T09:00:00.000Z";
const copyOf = (locale: Locale): PaymentMethodsManagerProps["copy"] => ({
  manager: catalogs[locale].organisms.paymentMethodsManager,
  card: catalogs[locale].molecules.savedPaymentMethodCard,
  brands: catalogs[locale].atoms.payment,
});
const walletOf = (locale: Locale, which: "cards" | "empty" = "cards"): ManagerContent =>
  commerceFixtures[locale].account.paymentMethods[which];

function element(
  locale: Locale = "en",
  which: "cards" | "empty" = "cards",
  props: Partial<PaymentMethodsManagerProps> = {},
) {
  return (
    <PaymentMethodsManager
      {...walletOf(locale, which)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      now={NOW}
      prefetch={false}
      defaultAction="/account/payment-methods/default"
      removeAction="/account/payment-methods/remove"
      {...props}
    />
  );
}

const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const slots = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");
const cardName = (locale: Locale, card: ManagerContent["cards"][number]) =>
  formatMessage(
    copyOf(locale).card.card,
    { brand: copyOf(locale).brands[card.brand], last4: card.last4 },
    htmlLang[locale],
  );

describe("PaymentMethodsManager", () => {
  it.each(LOCALES)("is a list named 'Saved payment methods' of every card, in %s", (locale) => {
    render(element(locale));
    const list = screen.getByRole("list", { name: copyOf(locale).manager.list });
    const entries = slots("payment-methods-manager-entry", list);
    const cards = walletOf(locale).cards;
    expect(entries).toHaveLength(cards.length);
    cards.forEach((card, index) =>
      expect(entries[index]?.textContent).toContain(cardName(locale, card)),
    );
  });

  it.each(LOCALES)(
    "offers 'Set as default' under each card that is not the default, in %s",
    (locale) => {
      render(element(locale));
      const words = copyOf(locale).manager;
      const forms = slots("payment-methods-manager-default");
      const others = walletOf(locale).cards.filter((card) => !card.isDefault);
      expect(forms).toHaveLength(others.length);
      others.forEach((card, index) => {
        const form = forms[index] as HTMLFormElement;
        expect(form.getAttribute("method")).toBe("post");
        expect(
          (form.querySelector('input[name="paymentMethodId"]') as HTMLInputElement).value,
        ).toBe(card.id);
        const name = formatMessage(
          words.makeDefaultLabel,
          { card: cardName(locale, card) },
          htmlLang[locale],
        );
        const button = within(form).getByRole("button", { name });
        expect(name.startsWith(words.makeDefault)).toBe(true);
        expect(button.textContent).toBe(words.makeDefault);
        expect(button.className).toContain("min-h-11");
        expect(form.querySelector(':scope > [role="status"]')?.textContent).toBe("");
      });
    },
  );

  it("leaves the method to a server action", () => {
    render(element("en", "cards", { defaultAction: async () => {} }));
    for (const form of slots("payment-methods-manager-default"))
      expect(form.hasAttribute("method")).toBe(false);
  });

  it("draws the add tile only when the shop can add a card", () => {
    const { unmount } = render(element("en"));
    const add = screen.getByRole("link", { name: "Add a payment method" });
    expect(add.getAttribute("href")).toBe(walletOf("en").addHref);
    expect(add.className).toContain("min-h-24");
    unmount();
    render(element("en", "cards", { addHref: undefined }));
    expect(slot("payment-methods-manager-add")).toBeNull();
  });

  it("holds the card being made the default and says so politely", () => {
    const target = walletOf("en").cards[1];
    render(
      element("en", "cards", { pending: { paymentMethodId: target?.id ?? "", action: "default" } }),
    );
    const form = slots("payment-methods-manager-default")[0] as HTMLFormElement;
    const button = within(form).getByRole("button", { name: "Saving…" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(form.querySelector(':scope > [role="status"]')?.textContent).toBe("Saving…");
  });

  it("holds the card being removed: its confirmation says 'Removing…'", async () => {
    const target = walletOf("en").cards[2];
    render(
      element("en", "cards", { pending: { paymentMethodId: target?.id ?? "", action: "remove" } }),
    );
    const entry = slots("payment-methods-manager-entry")[2] as HTMLElement;
    await userEvent.setup().click(within(entry).getAllByRole("button")[0] as HTMLElement);
    await waitFor(() =>
      expect(slot("saved-payment-method-confirm-status")?.textContent).toBe("Removing…"),
    );
  });

  it.each(LOCALES)("says there is no card, with the add link, in %s", (locale) => {
    render(element(locale, "empty"));
    const words = copyOf(locale).manager;
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: words.emptyTitle })).toBeTruthy();
    expect(screen.getByRole("link", { name: words.add }).getAttribute("href")).toBe(
      walletOf(locale, "empty").addHref,
    );
  });

  it("draws an empty wallet with no link when the shop cannot add one", () => {
    render(element("en", "empty", { addHref: undefined }));
    expect(screen.queryByRole("link")).toBeNull();
  });

  it.each(longLabels)("wraps a long %s label and cuts nothing", (locale, long) => {
    render(
      element(locale, "cards", {
        copy: {
          ...copyOf(locale),
          manager: { ...copyOf(locale).manager, add: long.linkLabel, makeDefault: long.action },
        },
      }),
    );
    const root = slot("payment-methods-manager") as HTMLElement;
    expect(classesIn(root).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    expect(screen.getByText(long.linkLabel).className).toContain("wrap-anywhere");
    for (const each of screen.getAllByText(long.action))
      expect(each.className).toContain("wrap-anywhere");
  });
});
