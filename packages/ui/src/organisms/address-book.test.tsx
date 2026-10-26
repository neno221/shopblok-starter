// Ours (T39, SETUP.md "Cart, checkout and account organisms (T39)"). AddressBook's tests, in Testing
// Library and happy-dom: a list named "Saved addresses" of AddressCards, "Set as default" under each
// address that is not the default (a form that posts unless its action is a function, a name that
// starts with its visible words), the add tile, what is in flight (the button held, "Saving…" said in
// a region that is always there, the card's removal held), the empty state, a long German and Greek
// label, and the four catalogs.
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { AddressBook as AddressBookContent } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { AddressBook, type AddressBookProps } from "./address-book";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const copyOf = (locale: Locale): AddressBookProps["copy"] => ({
  book: catalogs[locale].organisms.addressBook,
  card: catalogs[locale].molecules.addressCard,
});
const bookOf = (locale: Locale, which: "full" | "empty" = "full"): AddressBookContent =>
  commerceFixtures[locale].account.addressBook[which];

function element(
  locale: Locale = "en",
  which: "full" | "empty" = "full",
  props: Partial<AddressBookProps> = {},
) {
  return (
    <AddressBook
      {...bookOf(locale, which)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      prefetch={false}
      defaultAction="/account/addresses/default"
      removeAction="/account/addresses/remove"
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

describe("AddressBook", () => {
  it.each(LOCALES)("is a list named 'Saved addresses' of every address, in %s", (locale) => {
    render(element(locale));
    const list = screen.getByRole("list", { name: copyOf(locale).book.list });
    const entries = slots("address-book-entry", list);
    expect(entries).toHaveLength(bookOf(locale).entries.length);
    bookOf(locale).entries.forEach(({ address }, index) => {
      expect(entries[index]?.textContent).toContain(address.city);
    });
    expect(list.className).toContain("@xl:grid-cols-2");
  });

  it.each(LOCALES)(
    "offers 'Set as default' under each address that is not the default, in %s",
    (locale) => {
      render(element(locale));
      const words = copyOf(locale).book;
      const forms = slots("address-book-default");
      const others = bookOf(locale).entries.filter(
        ({ address }) => address.isDefaultShipping !== true,
      );
      expect(forms).toHaveLength(others.length);
      others.forEach(({ address }, index) => {
        const form = forms[index] as HTMLFormElement;
        expect(form.getAttribute("method")).toBe("post");
        expect(form.getAttribute("action")).toBe("/account/addresses/default");
        expect((form.querySelector('input[name="addressId"]') as HTMLInputElement).value).toBe(
          address.id,
        );
        const name = formatMessage(
          words.makeDefaultLabel,
          { name: `${address.firstName} ${address.lastName}`.trim(), city: address.city ?? address.address1 },
          htmlLang[locale],
        );
        const button = within(form).getByRole("button", { name });
        // The visible words start the name (WCAG 2.5.3).
        expect(name.startsWith(words.makeDefault)).toBe(true);
        expect(button.textContent).toBe(words.makeDefault);
        expect(button.getAttribute("type")).toBe("submit");
        expect(button.className).toContain("min-h-11");
      });
      // The regions are there from the first render, empty.
      for (const form of forms)
        expect(form.querySelector(':scope > [role="status"]')?.textContent).toBe("");
    },
  );

  it("leaves the method to a server action, and draws no default button without an action", () => {
    const { unmount } = render(element("en", "full", { defaultAction: async () => {} }));
    for (const form of slots("address-book-default"))
      expect(form.hasAttribute("method")).toBe(false);
    unmount();
    render(element("en", "full", { defaultAction: undefined }));
    expect(slots("address-book-default")).toHaveLength(0);
  });

  it.each(LOCALES)("ends with a 44 px tile that adds an address, in %s", (locale) => {
    render(element(locale));
    const add = screen.getByRole("link", { name: copyOf(locale).book.add });
    expect(add).toBe(slot("address-book-add"));
    expect(add.getAttribute("href")).toBe(bookOf(locale).addHref);
    expect(add.getAttribute("data-prefetch")).toBe("false");
    expect(add.className).toContain("min-h-24");
    expect(add.className).toContain("border-dashed");
    expect(add.closest("li")?.parentElement).toBe(
      screen.getByRole("list", { name: copyOf(locale).book.list }),
    );
  });

  it("holds the address being made the default and says so politely", () => {
    const target = bookOf("en").entries[2]?.address;
    render(element("en", "full", { pending: { addressId: target?.id ?? "", action: "default" } }));
    const form = slots("address-book-default")[1] as HTMLFormElement;
    const button = within(form).getByRole("button", { name: "Saving…" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("type")).toBe("button");
    expect(form.querySelector(':scope > [role="status"]')?.textContent).toBe("Saving…");
    expect((form.firstElementChild as HTMLButtonElement).disabled).toBe(true);
    // The others are as they were.
    expect(
      within(slots("address-book-default")[0] as HTMLElement).getByRole("button").textContent,
    ).toBe("Set as default");
  });

  it("holds the address being removed", () => {
    const target = bookOf("en").entries[1]?.address;
    render(element("en", "full", { pending: { addressId: target?.id ?? "", action: "remove" } }));
    const entry = slots("address-book-entry")[1] as HTMLElement;
    expect(within(entry).getByRole("button", { name: /Removing/ })).toBeTruthy();
  });

  it.each(LOCALES)("says there is no address and links to add one, in %s", (locale) => {
    render(element(locale, "empty"));
    const words = copyOf(locale).book;
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: words.emptyTitle })).toBeTruthy();
    expect(screen.getByRole("link", { name: words.add }).getAttribute("href")).toBe(
      bookOf(locale, "empty").addHref,
    );
  });

  it.each(longLabels)("wraps a long %s label and cuts nothing", (locale, long) => {
    render(
      element(locale, "full", {
        copy: {
          ...copyOf(locale),
          book: { ...copyOf(locale).book, add: long.linkLabel, makeDefault: long.action },
        },
      }),
    );
    const root = slot("address-book") as HTMLElement;
    expect(classesIn(root).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
    expect(screen.getByText(long.linkLabel).className).toContain("wrap-anywhere");
    for (const each of screen.getAllByText(long.action))
      expect(each.className).toContain("wrap-anywhere");
  });
});
