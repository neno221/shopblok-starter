import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, countryName, formatMessage, LOCALES, type Locale } from "@shopblok/i18n";
import type { Address } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { AddressCard, type AddressCardProps } from "./address-card";

// `next/link` becomes the anchor it renders, so a test can read the `prefetch` it was given.
vi.mock("next/link", () => ({
  default: ({
    prefetch,
    children,
    ...props
  }: { prefetch?: boolean | null; children?: React.ReactNode } & Record<string, unknown>) => (
    <a data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

const source = readFileSync(path.join(import.meta.dirname, "address-card.tsx"), "utf8");
const htmlLang = (locale: Locale) => commerceFixtures[locale].market.htmlLang;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

function setup(locale: Locale = "en", props: Partial<AddressCardProps> = {}) {
  const fixture = commerceFixtures[locale];
  return render(
    <AddressCard
      address={fixture.addresses[0]!}
      copy={catalogs[locale].molecules.addressCard}
      locale={fixture.market.htmlLang}
      {...props}
    />,
  );
}

/** The lines of the `<address>`, one string each. */
const lines = (container: HTMLElement) =>
  [...container.querySelectorAll("address > span")].map((line) => plain(line.textContent));

const { addressSamples, addresses } = commerceFixtures.en;
const at = (country: string): Address => {
  const found = [...addresses, ...Object.values(addressSamples).filter((a) => "id" in a)].find(
    (address) => (address as Address).countryCode === country,
  );
  if (found === undefined) throw new Error(`no address in ${country}`);
  return found as Address;
};

describe("AddressCard", () => {
  describe("structure", () => {
    it("is a server component: it formats and holds no state, so no 'use client'", () => {
      expect(source).not.toMatch(/^\s*["']use client["']/m);
    });

    it("is an article named by the name on it, with an <address> inside", () => {
      const { container } = setup("en", { address: at("us") });
      const card = screen.getByRole("article", { name: "Jordan Ellis" });
      expect(card.getAttribute("data-slot")).toBe("address-card");
      expect(container.querySelector("address")).toBeTruthy();
      expect(card.contains(container.querySelector("address"))).toBe(true);
    });

    it("passes the article's own props on, and merges the class", () => {
      const { container } = setup("en", { id: "addr-1", className: "max-w-sm" });
      const card = container.querySelector("article");
      expect(card?.id).toBe("addr-1");
      expect(card?.className).toContain("max-w-sm");
      expect(card?.className).toContain("min-w-0");
    });

    it("gives two cards on one page ids of their own, each named by its own name", () => {
      const { container } = render(
        <>
          {addresses.slice(0, 2).map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              copy={catalogs.en.molecules.addressCard}
              locale="en-US"
            />
          ))}
        </>,
      );
      const ids = [...container.querySelectorAll("[id]")].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(
        screen.getAllByRole("article").map((card) => card.getAttribute("aria-labelledby")),
      ).toEqual(ids);
    });

    it("renders on the server as plain markup: an <address> with its lines", () => {
      const markup = renderToString(
        <AddressCard
          address={at("ch")}
          copy={catalogs.en.molecules.addressCard}
          locale="en-US"
          editHref="/us/account/addresses/addr_ch"
          removeAction="/api/addresses/remove"
        />,
      );
      expect(markup).toContain("<address");
      expect(markup).toContain("CH-8001 Zürich");
      expect(markup).toContain('href="/us/account/addresses/addr_ch"');
      expect(markup).toContain('action="/api/addresses/remove"');
      expect(markup).toContain('method="post"');
      expect(markup).toContain('name="addressId" value="addr_ch"');
    });
  });

  describe("the lines, in the country's own order and wording", () => {
    it("Cyprus: the name, the street, the postal code before the city, the country, the phone", () => {
      const { container } = setup("en", { address: at("cy") });
      expect(lines(container)).toEqual([
        "Ελένη Χαραλάμπους",
        "Λεωφόρος Μακαρίου Γ΄ 45",
        "1065 Λευκωσία",
        "Cyprus",
        "Phone +357 22 000 142",
      ]);
    });

    it("the United States: the company and the second street line, then `City, ST ZIP`", () => {
      const { container } = setup("en", { address: at("us") });
      expect(lines(container)).toEqual([
        "Jordan Ellis",
        "Northside Design Co.",
        "482 Maple Avenue",
        "Suite 210",
        "Brooklyn, NY 11215",
        "United States",
        "Phone +1 718 555 0148",
      ]);
    });

    it("Germany: the postal code before the city, the country in the page's language", () => {
      const { container } = setup("de", { address: at("de") });
      expect(lines(container)).toEqual([
        "Lena Hartmann",
        "Lindenstraße 27",
        "10969 Berlin",
        "Deutschland",
        "Telefon +49 30 23125 042",
      ]);
    });

    it("Switzerland: the company before the name, and the CH- prefix in front of the code", () => {
      const { container } = setup("en", {
        address: { ...at("ch"), company: "Atelier Meier AG" },
      });
      expect(lines(container).slice(0, 4)).toEqual([
        "Atelier Meier AG",
        "Noah Meier",
        "Bahnhofstrasse 42",
        "CH-8001 Zürich",
      ]);
      expect(lines(container)[4]).toBe("Switzerland");
    });

    it("the United Kingdom: the post town and the postcode each on a line", () => {
      const { container } = setup("en", { address: addressSamples.gb });
      expect(lines(container)).toEqual([
        "Amelia Brooks",
        "7 Orchard Row",
        "Manchester",
        "M2 5BQ",
        "United Kingdom",
        "Phone +44 161 496 0142",
      ]);
    });

    it("France: the company first, then the name, the street and `ZIP City`", () => {
      const { container } = setup("fr", { address: addressSamples.fr });
      expect(lines(container)).toEqual([
        "Atelier Laurent",
        "Camille Laurent",
        "12 rue des Lilas",
        "Bâtiment B",
        "69003 Lyon",
        "France",
        "Téléphone +33 4 65 71 00 42",
      ]);
    });

    it("Japan, a country no market seeds: the Latin order on an English page, from the data alone", () => {
      const { container } = setup("en", { address: addressSamples.jp });
      expect(lines(container)).toEqual([
        "Yuki Tanaka",
        "1-2-3 Kita-Aoyama, Minato-ku, Tokyo",
        "107-0061",
        "Japan",
        "Phone +81 3 5555 0142",
      ]);
    });

    it("a country missing from the format data gets the generic order, not an error", () => {
      const { container } = setup("en", { address: addressSamples.generic });
      expect(lines(container)).toEqual([
        "Marta Suárez",
        "Calle Triana 12",
        "Las Palmas",
        "Gran Canaria 35002",
        "Canary Islands",
      ]);
    });

    it("Singapore, whose format has no city: no city line and no empty row (D65)", () => {
      const { container } = setup("en", { address: addressSamples.sg });
      expect(lines(container)).toEqual([
        "Wei Ling Tan",
        "10 Anson Road, #12-08",
        "SINGAPORE 079903",
        "Singapore",
      ]);
    });

    it("draws an address without a city in each of the seven countries whose format has none", () => {
      for (const countryCode of ["ae", "gi", "jp", "ky", "mo", "nr", "sg"]) {
        const { container, unmount } = setup("en", {
          address: { firstName: "Ada", lastName: "Lovelace", address1: "1 Main St", countryCode },
        });
        const text = lines(container);
        // In the country's order (Macau puts the street first).
        expect(text, countryCode).toEqual(expect.arrayContaining(["Ada Lovelace", "1 Main St"]));
        expect(text.join("|"), countryCode).not.toMatch(/undefined|\|\||^\||\|$/);
        unmount();
      }
    });

    it("leaves out what the address does not have: no phone line, no empty row", () => {
      const { container } = setup("en", {
        address: {
          firstName: "Ada",
          lastName: "Lovelace",
          address1: "1 Main St",
          city: "London",
          countryCode: "gb",
        },
      });
      expect(lines(container)).toEqual(["Ada Lovelace", "1 Main St", "London", "United Kingdom"]);
      expect(container.querySelector("[data-kind=phone]")).toBeNull();
    });

    it("sets the name apart as the heaviest line, and says which line is which", () => {
      const { container } = setup("en", { address: at("us") });
      const kinds = [...container.querySelectorAll("address > span")].map((line) =>
        line.getAttribute("data-kind"),
      );
      expect(kinds).toEqual([
        "name",
        "company",
        "street",
        "street",
        "locality",
        "country",
        "phone",
      ]);
      expect(container.querySelector("[data-kind=name]")?.className).toContain("font-semibold");
      expect(container.querySelector("[data-kind=street]")?.className).not.toContain(
        "font-semibold",
      );
    });

    it.each(LOCALES)("names the country in %s through Intl", (locale) => {
      const { container } = setup(locale, { address: at("ch") });
      expect(container.querySelector("[data-kind=country]")?.textContent).toBe(
        countryName("ch", htmlLang(locale)),
      );
    });

    it("writes every line as a block, so a long one wraps inside the card", () => {
      const { container } = setup("en", { address: at("us") });
      for (const line of container.querySelectorAll("address > span"))
        expect(line.className).toContain("block");
      expect(container.querySelector("address")?.className).toContain("wrap-anywhere");
    });
  });

  describe("the default marks", () => {
    it("says shipping, billing, or both, in words in a badge", () => {
      const cases: [Partial<Address>, string[]][] = [
        [{ isDefaultShipping: true, isDefaultBilling: false }, ["Default shipping"]],
        [{ isDefaultShipping: false, isDefaultBilling: true }, ["Default billing"]],
        [
          { isDefaultShipping: true, isDefaultBilling: true },
          ["Default shipping", "Default billing"],
        ],
        [{ isDefaultShipping: false, isDefaultBilling: false }, []],
        [{ isDefaultShipping: undefined, isDefaultBilling: undefined }, []],
      ];
      for (const [flags, marks] of cases) {
        const { container, unmount } = setup("en", { address: { ...at("us"), ...flags } });
        const found = [...container.querySelectorAll("[data-slot=badge]")].map(
          (b) => b.textContent,
        );
        expect(found).toEqual(marks);
        if (marks.length === 0)
          expect(container.querySelector("[data-slot=address-card-marks]")).toBeNull();
        unmount();
      }
    });

    it("lists the marks as a list, so a reader hears how many there are", () => {
      setup("en", { address: at("us") });
      const list = screen.getByRole("list");
      expect(
        within(list)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["Default shipping", "Default billing"]);
    });

    it.each(LOCALES)("reads in %s", (locale) => {
      const copy = catalogs[locale].molecules.addressCard;
      setup(locale);
      expect(screen.getByText(copy.defaultShipping)).toBeTruthy();
      expect(screen.getByText(copy.defaultBilling)).toBeTruthy();
    });
  });

  describe("the edit link", () => {
    it("is a link to where the address is edited, named for the address it belongs to", () => {
      setup("en", { address: at("cy"), editHref: "/us/account/addresses/addr_cy" });
      const link = screen.getByRole("link", {
        name: "Edit the address of Ελένη Χαραλάμπους, Λευκωσία",
      });
      expect(link.getAttribute("href")).toBe("/us/account/addresses/addr_cy");
      expect(link.textContent).toBe("Edit");
    });

    it("names an address without a city by its street", () => {
      setup("en", { address: addressSamples.sg, editHref: "/sg/account/addresses/addr_sg" });
      expect(
        screen.getByRole("link", { name: "Edit the address of Wei Ling Tan, 10 Anson Road, #12-08" }),
      ).toBeTruthy();
    });

    it("is not drawn without a href", () => {
      setup();
      expect(screen.queryByRole("link")).toBeNull();
    });

    it("passes prefetch on to the link, and leaves it unset otherwise", () => {
      const { unmount } = setup("en", { editHref: "/e", prefetch: false });
      expect(screen.getByRole("link").getAttribute("data-prefetch")).toBe("false");
      unmount();
      setup("en", { editHref: "/e" });
      expect(screen.getByRole("link").getAttribute("data-prefetch")).toBe("undefined");
    });

    it("is a 44 px box with the ring at full strength: a link with a button's look", () => {
      setup("en", { editHref: "/e" });
      const link = screen.getByRole("link");
      expect(link.className).toContain("min-h-11");
      expect(link.className).toContain("px-4");
      expect(link.className).toContain("focus-visible:ring-ring");
      expect(link.className).not.toMatch(/ring-ring\/\d/);
    });
  });

  describe("the remove button", () => {
    it("is a button in a form of its own, named for the address it removes", () => {
      const { container } = setup("en", {
        address: at("cy"),
        removeAction: "/api/addresses/remove",
      });
      const button = screen.getByRole("button", {
        name: "Remove the address of Ελένη Χαραλάμπους, Λευκωσία",
      }) as HTMLButtonElement;
      expect(button.type).toBe("submit");
      expect(button.textContent).toBe("Remove");
      const form = button.closest("form");
      expect(form?.getAttribute("action")).toBe("/api/addresses/remove");
      expect(form?.getAttribute("method")).toBe("post");
      expect(form?.querySelector<HTMLInputElement>('[name="addressId"]')?.value).toBe("addr_cy");
      expect(container.querySelectorAll("form")).toHaveLength(1);
    });

    it("leaves the method to React for a function action, and sends no id for an address without one", () => {
      const { id: _id, ...unsaved } = at("us");
      const { container } = setup("en", { address: unsaved, removeAction: () => {} });
      expect(container.querySelector("form")?.getAttribute("method")).toBeNull();
      expect(container.querySelector('[name="addressId"]')).toBeNull();
    });

    it("is not drawn without an action, and neither is its status region", () => {
      const { container } = setup("en", { editHref: "/e" });
      expect(screen.queryByRole("button")).toBeNull();
      expect(container.querySelector("form")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("tells the cards in a list apart: no two removes share a name", () => {
      render(
        <>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              copy={catalogs.en.molecules.addressCard}
              locale="en-US"
              removeAction="/api/remove"
            />
          ))}
        </>,
      );
      const names = screen
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"));
      expect(names).toHaveLength(4);
      expect(new Set(names).size).toBe(4);
    });

    it.each(LOCALES)("starts its name with the visible word in %s (WCAG 2.5.3)", (locale) => {
      const copy = catalogs[locale].molecules.addressCard;
      setup(locale, { editHref: "/e", removeAction: "/r" });
      const remove = screen.getByRole("button");
      const edit = screen.getByRole("link");
      // The visible text is part of the name, in either case: speech input says what it sees.
      expect(plain(remove.getAttribute("aria-label")).toLowerCase()).toContain(
        copy.remove.toLowerCase(),
      );
      expect(plain(edit.getAttribute("aria-label")).toLowerCase()).toContain(
        copy.edit.toLowerCase(),
      );
      expect(remove.textContent).toBe(copy.remove);
      expect(edit.textContent).toBe(copy.edit);
    });

    it("submits with the keyboard", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      const { container } = setup("en", { removeAction: "/api/remove", editHref: "/e" });
      container
        .querySelector("form")
        ?.addEventListener("submit", onSubmit as unknown as EventListener);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link"));
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("button"));
      await user.keyboard("{Enter}");
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("is a 44 px box, and may wrap a long label inside the card", () => {
      setup("en", { removeAction: "/r" });
      const button = screen.getByRole("button");
      expect(button.className).toContain("min-h-11");
      expect(button.className).toContain("max-w-full");
      expect(button.className).not.toMatch(/whitespace-nowrap/);
    });

    describe("while it is being removed", () => {
      it("keeps the button, says so, and stops it submitting twice", async () => {
        const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
        const user = userEvent.setup();
        const { container } = setup("en", {
          address: at("cy"),
          removeAction: "/r",
          removing: true,
        });
        container
          .querySelector("form")
          ?.addEventListener("submit", onSubmit as unknown as EventListener);
        const button = screen.getByRole("button", {
          name: "Removing the address of Ελένη Χαραλάμπους, Λευκωσία",
        }) as HTMLButtonElement;
        expect(button.type).toBe("button");
        expect(button.getAttribute("aria-disabled")).toBe("true");
        expect(button.disabled).toBe(false);
        expect(button.getAttribute("aria-busy")).toBe("true");
        expect(button.textContent).toBe("Removing…");
        await user.click(button);
        button.focus();
        await user.keyboard("{Enter}");
        expect(onSubmit).not.toHaveBeenCalled();
        const first = container.querySelector<HTMLButtonElement>('button[type="submit"]');
        expect(first?.disabled).toBe(true);
        expect(first?.hidden).toBe(true);
        expect(container.querySelectorAll('button[type="submit"]:not([disabled])')).toHaveLength(0);
      });

      it("says it in a status region that is the same one as in every other state", () => {
        const { container, rerender } = setup("en", { removeAction: "/r" });
        const region = screen.getByRole("status");
        expect(region.getAttribute("aria-live")).toBe("polite");
        expect(region.textContent).toBe("");
        rerender(
          <AddressCard
            address={addresses[0]!}
            copy={catalogs.en.molecules.addressCard}
            locale="en-US"
            removeAction="/r"
            removing
          />,
        );
        expect(screen.getByRole("status")).toBe(region);
        expect(region.textContent).toBe(`Removing the address of Jordan Ellis, Brooklyn`);
        expect(container.querySelectorAll("button[hidden]")).toHaveLength(1);
      });

      it("leaves focus on the button", () => {
        const props = {
          address: addresses[0]!,
          copy: catalogs.en.molecules.addressCard,
          locale: "en-US",
          removeAction: "/r",
        };
        const { rerender } = render(<AddressCard {...props} />);
        screen.getByRole("button").focus();
        rerender(<AddressCard {...props} removing />);
        expect(document.activeElement).toBe(screen.getByRole("button"));
      });
    });
  });

  describe("sizes and long labels", () => {
    it.each(["de", "el"] as const)(
      "lets the longest address, in %s, wrap inside the card",
      (locale) => {
        const { long, market } = commerceFixtures[locale];
        const { container } = setup(locale, {
          address: {
            ...long.address,
            countryCode: market.country,
            isDefaultShipping: true,
            isDefaultBilling: true,
          },
          editHref: "/e",
          removeAction: "/r",
        });
        for (const element of container.querySelectorAll("*")) {
          expect(String(element.getAttribute("class") ?? "")).not.toMatch(CLIPPING_CLASSES);
        }
        const text = plain(container.querySelector("address")?.textContent);
        expect(text).toContain(plain(long.address.address1));
        expect(text).toContain(plain(long.address.company));
        expect(container.querySelector("article")?.className).toContain("min-w-0");
        // The marks, the link and the button wrap in a row of their own.
        expect(container.querySelector("[data-slot=address-card-marks]")?.className).toContain(
          "flex-wrap",
        );
        expect(container.querySelector("[data-slot=address-card-actions]")?.className).toContain(
          "flex-wrap",
        );
      },
    );

    it("reads its names in the page's language with the longest fixtures, still starting with the visible word", () => {
      for (const locale of ["de", "el"] as const) {
        const { long } = commerceFixtures[locale];
        const copy = catalogs[locale].molecules.addressCard;
        const { unmount } = setup(locale, {
          address: { ...long.address, countryCode: commerceFixtures[locale].market.country },
          removeAction: "/r",
        });
        const label = screen.getByRole("button").getAttribute("aria-label");
        expect(label).toBe(
          formatMessage(
            copy.removeLabel,
            { name: `${long.address.firstName} ${long.address.lastName}`, city: long.address.city ?? long.address.address1 },
            htmlLang(locale),
          ),
        );
        unmount();
      }
    });
  });
});
