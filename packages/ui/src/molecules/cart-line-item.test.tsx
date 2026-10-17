import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, formatMoney, LOCALES, type Locale } from "@shopblok/i18n";
import type { CartLine } from "@shopblok/registry/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../test-support/long-labels";
import { CartLineItem, type CartLineItemProps } from "./cart-line-item";

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

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
/** Intl and the catalogs may write a no-break space where a test has a plain one. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const cart = (locale: Locale) => commerceFixtures[locale].cart;
const samples = (locale: Locale) => commerceFixtures[locale].cartSamples;
const line = (locale: Locale, index: number): CartLine => {
  const found = cart(locale).lines[index];
  if (found === undefined) throw new Error(`no line ${index}`);
  return found;
};

function setup(
  locale: Locale = "en",
  props: Partial<CartLineItemProps> = {},
  cartLine: CartLine = line(locale, 0),
) {
  return render(
    <CartLineItem
      line={cartLine}
      copy={catalogs[locale].molecules.cartLineItem}
      locale={htmlLang[locale]}
      {...props}
    />,
  );
}

/** The name the line's controls carry in English: the title, with its options in brackets. */
const NAME = "Merino Ankle Socks, 3-Pack (Color: Charcoal, Size: 39–42)";
const stepper = () =>
  screen.getByRole("textbox", { name: `Quantity, ${NAME}` }) as HTMLInputElement;
const removeButton = () => screen.getByRole("button", { name: `Remove ${NAME}` });
const article = () => screen.getByRole("article");
const slot = (name: string) => article().querySelector(`[data-slot="${name}"]`) as HTMLElement;

describe("CartLineItem", () => {
  describe("structure", () => {
    it("is an article named by its title, which is an h3 link to the product", () => {
      setup();
      const found = screen.getByRole("article", { name: "Merino Ankle Socks, 3-Pack" });
      const heading = within(found).getByRole("heading", { level: 3 });
      const link = within(heading).getByRole("link", { name: "Merino Ankle Socks, 3-Pack" });
      expect(link.getAttribute("href")).toBe("/us/products/merino-ankle-socks");
      // The title is the line's only link: the picture is decoration beside it.
      expect(within(found).getAllByRole("link")).toHaveLength(1);
    });

    it("takes the title's heading level from the page's outline", () => {
      setup("en", { heading: "h2" });
      expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
      expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
    });

    it("passes the article's own props on, and merges the class", () => {
      setup("en", { id: "line-1", className: "max-w-md", "data-testid": "x" } as never);
      expect(article().id).toBe("line-1");
      expect(article().className).toContain("max-w-md");
      expect(article().className).toContain("@container");
      expect(article().getAttribute("data-testid")).toBe("x");
    });

    it("passes prefetch on to the title link, and leaves it unset otherwise", () => {
      const { unmount } = setup("en", { prefetch: false });
      expect(screen.getByRole("link").getAttribute("data-prefetch")).toBe("false");
      unmount();
      setup("en");
      expect(screen.getByRole("link").getAttribute("data-prefetch")).toBe("undefined");
    });

    it("draws the picture as decoration, and a muted frame of the same shape when there is none", () => {
      const { container, unmount } = setup();
      expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
      expect(slot("cart-line-item-no-image")).toBeNull();
      unmount();
      const none = setup("en", {}, samples("en").lines.noImage);
      expect(none.container.querySelector("img")).toBeNull();
      const frame = slot("cart-line-item-no-image");
      expect(frame.getAttribute("aria-hidden")).toBe("true");
      expect(frame.className).toContain("aspect-[4/5]");
      // The same column as a picture: the media box is there either way.
      expect(slot("cart-line-item-media").className).toContain("w-20");
    });

    it.each(LOCALES)("shows every option as text, one to a line, in %s", (locale) => {
      setup(locale);
      const copy = catalogs[locale].molecules.cartLineItem;
      const list = slot("cart-line-item-options");
      expect(list.tagName).toBe("UL");
      const items = within(list).getAllByRole("listitem");
      expect(items.map((item) => plain(item.textContent))).toEqual(
        line(locale, 0).options.map((option) =>
          plain(formatMessage(copy.option, option, htmlLang[locale])),
        ),
      );
    });

    it("writes the options in the line's words: Color: Charcoal, Size: 39–42", () => {
      setup();
      const items = within(slot("cart-line-item-options")).getAllByRole("listitem");
      expect(items.map((item) => item.textContent)).toEqual(["Color: Charcoal", "Size: 39–42"]);
    });

    it("has no list of options for a product without any", () => {
      setup("en", {}, samples("en").lines.noOptions);
      expect(slot("cart-line-item-options")).toBeNull();
    });
  });

  describe("the controls' names", () => {
    it("names the quantity field, its two buttons and the remove button for the line and its options", () => {
      setup();
      expect(stepper().value).toBe("2");
      expect(screen.getByRole("button", { name: `Decrease quantity, ${NAME}` })).toBeTruthy();
      expect(screen.getByRole("button", { name: `Increase quantity, ${NAME}` })).toBeTruthy();
      expect(removeButton()).toBeTruthy();
    });

    it("names them for the title alone when the product has no options", () => {
      setup("en", {}, samples("en").lines.noOptions);
      const title = samples("en").lines.noOptions.title;
      expect(screen.getByRole("textbox", { name: `Quantity, ${title}` })).toBeTruthy();
      expect(screen.getByRole("button", { name: `Remove ${title}` })).toBeTruthy();
    });

    it("tells two lines of one product apart by their options", () => {
      const first = line("en", 0);
      const other: CartLine = {
        ...first,
        id: "line_other",
        options: [
          { option: "Color", value: "Navy" },
          { option: "Size", value: "43–46" },
        ],
      };
      render(
        <>
          <CartLineItem line={first} copy={catalogs.en.molecules.cartLineItem} locale="en-US" />
          <CartLineItem line={other} copy={catalogs.en.molecules.cartLineItem} locale="en-US" />
        </>,
      );
      const names = screen
        .getAllByRole("button", { name: /^Remove / })
        .map((each) => each.ariaLabel ?? each.getAttribute("aria-label"));
      expect(names).toHaveLength(2);
      expect(new Set(names).size).toBe(2);
      expect(names[1]).toBe("Remove Merino Ankle Socks, 3-Pack (Color: Navy, Size: 43–46)");
    });

    it.each(LOCALES)("keeps the line's name in every control, in %s", (locale) => {
      setup(locale);
      const copy = catalogs[locale].molecules.cartLineItem;
      const found = line(locale, 0);
      const options = new Intl.ListFormat(htmlLang[locale], {
        type: "unit",
        style: "short",
      }).format(
        found.options.map((option) => formatMessage(copy.option, option, htmlLang[locale])),
      );
      const name = formatMessage(copy.named, { title: found.title, options }, htmlLang[locale]);
      for (const message of [
        copy.quantity,
        copy.decrease,
        copy.increase,
        copy.remove,
        copy.updateLabel,
      ]) {
        const label = formatMessage(message, { line: name }, htmlLang[locale]);
        expect(article().querySelector(`[aria-label="${CSS.escape(label)}"]`), label).toBeTruthy();
      }
    });

    it("has a visible word in the update button's name (WCAG 2.5.3)", () => {
      setup();
      const update = slot("cart-line-item-update-fallback").querySelector("button");
      expect(update?.textContent).toBe("Update");
      expect(update?.getAttribute("aria-label")?.toLowerCase()).toContain("update");
    });
  });

  describe("the two forms (D48)", () => {
    it("posts lineId and quantity from the quantity form, and lineId from the remove form", () => {
      setup("en", { updateAction: "/cart/update", removeAction: "/cart/remove" });
      const update = slot("cart-line-item-update") as HTMLFormElement;
      expect(update.getAttribute("action")).toBe("/cart/update");
      expect(update.getAttribute("method")).toBe("post");
      expect([...new FormData(update).entries()]).toEqual([
        ["lineId", "line_01"],
        ["quantity", "2"],
      ]);
      const remove = slot("cart-line-item-remove") as HTMLFormElement;
      expect(remove.getAttribute("action")).toBe("/cart/remove");
      expect(remove.getAttribute("method")).toBe("post");
      expect([...new FormData(remove).entries()]).toEqual([["lineId", "line_01"]]);
    });

    it("leaves the method to React for a function, which it posts as a server action", () => {
      setup("en", { updateAction: () => {}, removeAction: () => {} });
      expect(slot("cart-line-item-update").getAttribute("method")).toBeNull();
      expect(slot("cart-line-item-remove").getAttribute("method")).toBeNull();
    });

    it("posts without an action too (PR 56 review)", () => {
      setup();
      expect(slot("cart-line-item-update").getAttribute("method")).toBe("post");
      expect(slot("cart-line-item-remove").getAttribute("method")).toBe("post");
    });

    it("keeps the remove button out of the quantity form, so Enter in the field never removes the line", () => {
      setup();
      expect(removeButton().closest("form")).toBe(slot("cart-line-item-remove"));
      expect(removeButton().closest("form")).not.toBe(slot("cart-line-item-update"));
      // The quantity form has no submit button for the browser's implicit submission to press.
      expect(slot("cart-line-item-update").querySelectorAll('button[type="submit"]')).toHaveLength(
        0,
      );
    });

    it("sends the quantity form, and not the remove form, on Enter in the field", async () => {
      const submitted: (string | undefined)[] = [];
      const user = userEvent.setup();
      render(
        <div
          onSubmit={(event) => {
            event.preventDefault();
            submitted.push((event.target as HTMLElement).dataset["slot"]);
          }}
        >
          <CartLineItem
            line={line("en", 0)}
            copy={catalogs.en.molecules.cartLineItem}
            locale="en-US"
          />
        </div>,
      );
      await user.click(stepper());
      await user.keyboard("{ArrowUp}{Enter}");
      expect(submitted).toEqual(["cart-line-item-update"]);
      expect(stepper().value).toBe("3");
    });

    it("sends the remove form from the keyboard: Enter on the focused button", async () => {
      const submitted: [string | undefined, string | null][] = [];
      const user = userEvent.setup();
      render(
        <div
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.target as HTMLFormElement;
            submitted.push([form.dataset["slot"], new FormData(form).get("lineId") as string]);
          }}
        >
          <CartLineItem
            line={line("en", 0)}
            copy={catalogs.en.molecules.cartLineItem}
            locale="en-US"
          />
        </div>,
      );
      removeButton().focus();
      await user.keyboard("{Enter}");
      expect(submitted).toEqual([["cart-line-item-remove", "line_01"]]);
    });

    describe("without a script", () => {
      it("hides the stepper's form under `scripting: none`, and shows a native number field and a button in its place", () => {
        const markup = renderToString(
          <CartLineItem
            line={line("en", 0)}
            copy={catalogs.en.molecules.cartLineItem}
            locale="en-US"
            updateAction="/cart/update"
            removeAction="/cart/remove"
          />,
        );
        // The stepper's form: drawn, and hidden by the `noscript:` variant (`@media (scripting: none)`).
        expect(markup).toMatch(
          /<form data-slot="cart-line-item-update" class="[^"]*noscript:hidden/,
        );
        // The fallback: hidden by default, a flex row under the same media query.
        expect(markup).toMatch(
          /<form data-slot="cart-line-item-update-fallback" class="[^"]*\bhidden\b[^"]*noscript:flex/,
        );
        const fallback = markup.slice(markup.indexOf('data-slot="cart-line-item-update-fallback"'));
        const fallbackForm = fallback.slice(0, fallback.indexOf("</form>"));
        expect(fallbackForm).toContain('type="hidden" name="lineId" value="line_01"');
        expect(fallbackForm).toMatch(/<input[^>]*type="number"[^>]*/);
        expect(fallbackForm).toMatch(/name="quantity"/);
        expect(fallbackForm).toMatch(/min="1"/);
        expect(fallbackForm).toMatch(/required=""/);
        expect(fallbackForm).toMatch(/value="2"/);
        expect(fallbackForm).toContain('type="submit"');
        expect(fallbackForm).toContain(">Update</button>");
        // Both are plain forms with their action and a method that posts.
        expect(markup.match(/method="post"/g)).toHaveLength(3);
      });

      it("gives the native field the stock limit, and the line's quantity", () => {
        setup("en", {}, line("en", 2));
        const field = slot("cart-line-item-update-fallback").querySelector<HTMLInputElement>(
          'input[type="number"]',
        );
        expect(field?.max).toBe("3");
        expect(field?.min).toBe("1");
        expect(field?.value).toBe("1");
        expect(field?.name).toBe("quantity");
        expect(field?.required).toBe(true);
        expect(field?.getAttribute("aria-label")).toContain(
          "Quantity, Essential Organic Cotton Tee",
        );
      });

      it("posts the fallback's quantity with the line's id", () => {
        setup("en", { updateAction: "/cart/update" });
        const form = slot("cart-line-item-update-fallback") as HTMLFormElement;
        const field = form.querySelector<HTMLInputElement>('input[type="number"]');
        if (field === null) throw new Error("no field");
        field.value = "5";
        expect([...new FormData(form).entries()]).toEqual([
          ["lineId", "line_01"],
          ["quantity", "5"],
        ]);
      });

      it("renders the whole line on the server, as markup with the product's link, prices and buttons", () => {
        const markup = renderToString(
          <CartLineItem
            line={line("en", 1)}
            copy={catalogs.en.molecules.cartLineItem}
            locale="en-US"
            updateAction="/cart/update"
            removeAction="/cart/remove"
            prefetch={false}
          />,
        );
        expect(markup).toContain('href="/us/products/brushed-fleece-hoodie"');
        expect(markup).toContain("$54.00");
        expect(markup).toContain("$75.00");
        expect(markup).toContain('action="/cart/remove"');
        expect(markup).toContain('name="lineId" value="line_02"');
      });
    });
  });

  describe("stock", () => {
    it("says nothing about a line that is in stock", () => {
      setup();
      expect(article().getAttribute("data-stock")).toBe("in-stock");
      expect(article().querySelector("[data-slot=stock-indicator]")).toBeNull();
    });

    it.each(LOCALES)("says how many are left when a few are, in %s", (locale) => {
      setup(locale, {}, line(locale, 2));
      const copy = catalogs[locale].molecules.cartLineItem;
      const indicator = article().querySelector("[data-slot=stock-indicator]");
      expect(indicator?.getAttribute("data-status")).toBe("low");
      expect(plain(indicator?.textContent)).toBe(
        plain(formatMessage(copy.stock.low, { count: 3 }, htmlLang[locale])),
      );
    });

    it("says only 'Only 3 left' in English, and stops the stepper there", () => {
      setup("en", {}, line("en", 2));
      expect(screen.getByText("Only 3 left")).toBeTruthy();
      expect(stepperInputFor("Essential Organic Cotton Tee").value).toBe("1");
    });

    it("says 'Low stock' when the count is not known", () => {
      const unknown: CartLine = { ...line("en", 2), stock: { status: "low" } };
      setup("en", {}, unknown);
      expect(screen.getByText("Low stock")).toBeTruthy();
    });

    it("marks the plus button disabled when the quantity is the stock limit", () => {
      setup("en", {}, samples("en").lines.atLimit);
      const plus = screen.getByRole("button", { name: /^Increase quantity/ });
      expect(plus.getAttribute("aria-disabled") === "true" || plus.hasAttribute("disabled")).toBe(
        true,
      );
    });

    describe("out of stock", () => {
      it.each(LOCALES)("says so in words, with an icon, in %s", (locale) => {
        setup(locale, {}, samples(locale).lines.outOfStock);
        const copy = catalogs[locale].molecules.cartLineItem;
        expect(article().getAttribute("data-stock")).toBe("out");
        const indicator = article().querySelector("[data-slot=stock-indicator]");
        expect(indicator?.textContent).toBe(copy.stock.out);
        expect(indicator?.querySelector("svg[aria-hidden=true]")).toBeTruthy();
      });

      it("cannot change quantity: the stepper and the native field are disabled", () => {
        setup("en", {}, samples("en").lines.outOfStock);
        const title = samples("en").lines.outOfStock.title;
        const name = new RegExp(`^Quantity, ${title}`);
        for (const field of screen.getAllByRole("textbox", { name }) as HTMLInputElement[])
          expect(field.disabled).toBe(true);
        const native = slot("cart-line-item-update-fallback");
        expect(native.querySelector<HTMLInputElement>('input[type="number"]')?.disabled).toBe(true);
        expect(native.querySelector("button")?.disabled).toBe(true);
      });

      it("can still be removed: it is the way on", () => {
        setup("en", {}, samples("en").lines.outOfStock);
        const remove = screen.getByRole("button", { name: /^Remove / }) as HTMLButtonElement;
        expect(remove.disabled).toBe(false);
        expect(remove.type).toBe("submit");
        expect(remove.getAttribute("aria-disabled")).toBeNull();
      });
    });
  });

  describe("prices", () => {
    it.each(LOCALES)(
      "labels the line total and writes it in the locale's money, in %s",
      (locale) => {
        setup(locale);
        const copy = catalogs[locale].molecules.cartLineItem;
        const total = line(locale, 0).total;
        const found = slot("cart-line-item-total");
        expect(plain(found.textContent)).toBe(
          plain(
            `${copy.lineTotalLabel} ${formatMoney(total.amount, total.currencyCode, htmlLang[locale])}`,
          ),
        );
        // The label is read out and not shown.
        expect(found.querySelector("[data-slot=visually-hidden]")?.className).toContain("sr-only");
      },
    );

    it.each(LOCALES)(
      "labels the unit price, with the word the language puts beside it, in %s",
      (locale) => {
        setup(locale);
        const copy = catalogs[locale].molecules.cartLineItem;
        const unit = line(locale, 0).unitPrice;
        const price = formatMoney(unit.amount, unit.currencyCode, htmlLang[locale]);
        expect(plain(slot("cart-line-item-unit").textContent)).toBe(
          plain(
            `${copy.unitPriceLabel} ${formatMessage(copy.unitPrice, { price }, htmlLang[locale])}`,
          ),
        );
      },
    );

    it("puts the word where the language needs it: before the price, or nowhere", () => {
      const copy = catalogs.en.molecules.cartLineItem;
      const before = setup("en", {});
      before.unmount();
      const first = render(
        <CartLineItem
          line={line("en", 0)}
          copy={{ ...copy, unitPrice: "each {price}" }}
          locale="en-US"
        />,
      );
      expect(plain(slot("cart-line-item-unit").textContent)).toBe("Unit price each $20.00");
      first.unmount();
      render(
        <CartLineItem
          line={line("en", 0)}
          copy={{ ...copy, unitPrice: "{price}" }}
          locale="en-US"
        />,
      );
      expect(
        slot("cart-line-item-unit").querySelector("[data-slot=cart-line-item-unit-text]"),
      ).toBeNull();
      expect(plain(slot("cart-line-item-unit").textContent)).toBe("Unit price $20.00");
    });

    it("shows a sale: the sale price and the one it replaces, each with a label", () => {
      setup("en", {}, line("en", 1));
      const unit = slot("cart-line-item-unit");
      expect(plain(unit.textContent)).toContain("Sale price $54.00");
      expect(plain(unit.textContent)).toContain("Original price $75.00");
      expect(unit.querySelector("s")?.textContent).toContain("$75.00");
      // The line total is the sale price times the quantity, not struck through.
      expect(slot("cart-line-item-total").querySelector("s")).toBeNull();
    });

    it("keeps the prices to the end of the line, and beside the controls when there is room", () => {
      setup();
      expect(slot("cart-line-item-prices").className).toContain("ms-auto");
      expect(slot("cart-line-item-prices").className).toContain("text-end");
    });
  });

  describe("while the line is updating", () => {
    it("is busy, and says so in a status region that was there before", () => {
      const { rerender } = setup();
      const region = slot("cart-line-item-status");
      expect(region.getAttribute("role")).toBe("status");
      expect(region.getAttribute("aria-live")).toBe("polite");
      expect(region.textContent).toBe("");
      expect(article().getAttribute("aria-busy")).toBeNull();
      expect(article().hasAttribute("data-pending")).toBe(false);
      rerender(
        <CartLineItem
          line={line("en", 0)}
          copy={catalogs.en.molecules.cartLineItem}
          locale="en-US"
          pending
        />,
      );
      // The same element, so a screen reader sees its text change rather than a new region.
      expect(slot("cart-line-item-status")).toBe(region);
      expect(region.textContent).toBe("Updating…");
      expect(article().getAttribute("aria-busy")).toBe("true");
      expect(article().hasAttribute("data-pending")).toBe(true);
      expect(screen.getAllByRole("status")).toHaveLength(1);
    });

    it.each(LOCALES)(
      "says it in the locale's words, with a spinner nobody hears, in %s",
      (locale) => {
        setup(locale, { pending: true });
        const region = slot("cart-line-item-status");
        expect(plain(region.textContent)).toBe(
          plain(catalogs[locale].molecules.cartLineItem.updating),
        );
        expect(region.querySelector("[aria-hidden=true]")).toBeTruthy();
      },
    );

    it("makes the quantity read-only, keeping its focus and its value", () => {
      setup("en", { pending: true });
      expect(stepper().readOnly).toBe(true);
      expect(stepper().disabled).toBe(false);
      stepper().focus();
      expect(document.activeElement).toBe(stepper());
      expect(stepper().value).toBe("2");
    });

    it("makes the remove button inert but focusable: aria-disabled, and a button that does not submit", () => {
      setup("en", { pending: true });
      const remove = removeButton() as HTMLButtonElement;
      expect(remove.getAttribute("aria-disabled")).toBe("true");
      expect(remove.type).toBe("button");
      expect(remove.disabled).toBe(false);
      remove.focus();
      expect(document.activeElement).toBe(remove);
      expect(remove.className).toContain("aria-disabled:pointer-events-none");
    });

    it("sends nothing twice: a click on remove, Enter on it and Enter in the field submit no form", async () => {
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
      const user = userEvent.setup();
      render(
        <div onSubmit={onSubmit}>
          <CartLineItem
            line={line("en", 0)}
            copy={catalogs.en.molecules.cartLineItem}
            locale="en-US"
            pending
          />
        </div>,
      );
      await user.click(removeButton());
      await user.keyboard("{Enter}");
      await user.click(stepper());
      await user.keyboard("{ArrowUp}{Enter}");
      fireEvent.click(
        slot("cart-line-item-update-fallback").querySelector("button") as HTMLElement,
      );
      expect(onSubmit).not.toHaveBeenCalled();
      expect(stepper().value).toBe("2");
    });

    it("makes the native fallback button inert in the same way", () => {
      setup("en", { pending: true });
      const update = slot("cart-line-item-update-fallback").querySelector("button");
      expect(update?.type).toBe("button");
      expect(update?.getAttribute("aria-disabled")).toBe("true");
    });

    it("does not mark an idle remove button as inert", () => {
      setup();
      const remove = removeButton() as HTMLButtonElement;
      expect(remove.type).toBe("submit");
      expect(remove.getAttribute("aria-disabled")).toBeNull();
    });
  });

  describe("sizes (D32) and focus (D35)", () => {
    it("has a title link, a remove button and a native field and button of 44 px or more", () => {
      setup();
      expect(screen.getByRole("link").className).toContain("min-h-11");
      expect(removeButton().className).toContain("size-11");
      const fallback = slot("cart-line-item-update-fallback");
      expect(fallback.querySelector('input[type="number"]')?.className).toContain("h-11");
      expect(fallback.querySelector("button")?.className).toContain("min-h-11");
    });

    it("draws every ring at full strength: ring-ring, never tinted", () => {
      setup();
      for (const control of [screen.getByRole("link"), removeButton()]) {
        expect(control.className).toContain("focus-visible:ring-ring");
        expect(control.className).not.toMatch(/ring-ring\//);
      }
    });

    it("reaches the title, then the quantity, then the remove button by Tab, in that order", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole("link"));
      await user.tab();
      expect(document.activeElement).toBe(stepper());
      // The stepper's own buttons are for pointers: the field has the arrow keys.
      expect(
        screen.getByRole("button", { name: /^Increase quantity/ }).getAttribute("tabindex"),
      ).toBe("-1");
    });

    it("uses logical properties and no colour of its own", () => {
      const { container } = setup();
      const classes = [...container.querySelectorAll("[class]")]
        .map((element) => element.getAttribute("class") ?? "")
        .join(" ");
      expect(classes).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right)-/);
      expect(classes).not.toMatch(/(?:^|\s)(?:text|bg|border)-(?:red|blue|green|gray|black|white)/);
      expect(classes).not.toContain("dark:");
    });
  });

  describe("long strings", () => {
    it.each(["de", "el"] as const)("wraps the longest title, options and stock in %s", (locale) => {
      const { container } = setup(locale, {}, commerceFixtures[locale].long.cartLine);
      const long = commerceFixtures[locale].long.cartLine;
      // The link's name is the whole title, however much of it is drawn.
      expect(screen.getByRole("link", { name: long.title })).toBeTruthy();
      // Nothing cuts a string but the title's two-line clamp, which says so.
      const cutters = [...container.querySelectorAll("[class]")].filter((element) =>
        CLIPPING_CLASSES.test(element.getAttribute("class") ?? ""),
      );
      expect(cutters.map((element) => element.getAttribute("data-truncate"))).toEqual([""]);
      expect(cutters[0]?.className).toContain("line-clamp-2");
      expect(cutters[0]?.className).toContain("wrap-anywhere");
      // The options are written in full, and wrap anywhere.
      const items = within(slot("cart-line-item-options")).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      for (const [index, item] of items.entries()) {
        const option = long.options[index];
        expect(item.textContent).toContain(option?.value);
        expect(item.className).toContain("wrap-anywhere");
      }
      // Every box on the way down may shrink.
      expect(article().className).toContain("min-w-0");
    });

    it.each(["de", "el"] as const)("keeps the controls' names whole in %s", (locale) => {
      setup(locale, {}, commerceFixtures[locale].long.cartLine);
      const long = commerceFixtures[locale].long.cartLine;
      const remove = article().querySelector(`[data-slot=cart-line-item-remove] button`);
      expect(remove?.getAttribute("aria-label")).toContain(long.title);
      expect(remove?.getAttribute("aria-label")).toContain(long.options[0]?.value);
    });

    it("sits in the narrowest column: the layout follows the container, not the viewport", () => {
      setup();
      const grid = article().firstElementChild as HTMLElement;
      expect(grid.className).toContain("grid-cols-1");
      expect(grid.className).toContain("@xs:grid-cols-");
      expect(grid.className).toContain("@lg:grid-cols-");
      expect(grid.className).not.toMatch(/(?:^|\s)(?:sm|md|lg|xl):/);
    });
  });
});

/** The stepper of the line titled `title`. */
function stepperInputFor(title: string) {
  return screen.getByRole("textbox", {
    name: new RegExp(`^Quantity, ${title}`),
  }) as HTMLInputElement;
}
