// Ours (T38, SETUP.md "Product-page organisms (T38)"). BuyBox's tests, in Testing Library and
// happy-dom: the form and its parts in the four locales, every state of the fixtures (nothing chosen,
// the colour only, ready, three left, sold out), the choice (what it calls, what it follows, what it
// keeps when a parent renders again), the add button (never `disabled`, `aria-disabled` until every
// option has a value, a press that sends nothing and moves focus to what is missing, a press that
// sends exactly the choice), the quantity, the status region, the size guide's place, the ids, the
// keyboard, a long German and Greek label, the 44 px classes, the server's markup and a read of the
// files' imports (D49). Pixels are not measurable here: the layout, the clipping and the real 44 px
// belong to the design-system job's browser checks, which the lead runs.
// - The plan's mutation for this component is "an add-to-cart that is enabled with an option missing
//   fails its test". It is covered twice over: the button must say `aria-disabled="true"` while an
//   option is missing, and a press (a click, Enter on the button, Enter in the quantity field) must
//   not call the action. Taking away either half fails a test.
import { readFileSync } from "node:fs";
import path from "node:path";
import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES, type Locale } from "@shopblok/i18n";
import { formatList, formatMessage, formatMoney, formatNumber } from "@shopblok/i18n/format";
import type { BuyBox as BuyBoxContent, ProductDetail } from "@shopblok/registry/contracts";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES, longLabels } from "../test-support/long-labels";
import { BuyBox, type BuyBoxCopy, type BuyBoxProps } from "./buy-box";

const htmlLang = { en: "en-US", el: "el-CY", de: "de-DE", fr: "fr-CH" } as const;
const EM_DASH = String.fromCharCode(0x2014);

type State = "empty" | "partial" | "ready" | "low" | "soldOut";
const STATES: readonly State[] = ["empty", "partial", "ready", "low", "soldOut"];
const fixture = (locale: Locale, state: State): BuyBoxContent =>
  commerceFixtures[locale].productPage.buyBox[state];

function copyOf(locale: Locale): BuyBoxCopy {
  const catalog = catalogs[locale];
  return {
    buyBox: catalog.organisms.buyBox,
    variantSelector: catalog.molecules.variantSelector,
    priceBlock: catalog.molecules.priceBlock,
    quantityStepper: catalog.atoms.quantityStepper,
    stock: catalog.atoms.stock,
    rating: catalog.atoms.rating,
  };
}

function element(locale: Locale, state: State, props: Partial<BuyBoxProps> = {}) {
  return (
    <BuyBox
      {...fixture(locale, state)}
      copy={copyOf(locale)}
      locale={htmlLang[locale]}
      {...props}
    />
  );
}

/** Intl and the catalogs may write a no-break space, a narrow one or a word joiner. */
const plain = (text: string | null | undefined) => (text ?? "").replace(/[\s⁠]+/g, " ").trim();
const slot = (name: string, root: ParentNode = document) =>
  root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const form = () => slot("buy-box") as HTMLFormElement;
const addButton = () => slot("buy-box-add") as HTMLButtonElement;
const quantityInput = () => slot("quantity-stepper-input") as HTMLInputElement;
const groups = () => screen.getAllByRole("radiogroup");
const radiosOf = (group: HTMLElement) => within(group).getAllByRole("radio");
const focused = () => document.activeElement as HTMLElement | null;
const sent = (formData: FormData) => Object.fromEntries(formData.entries());
/** Every class of every element in `root` (SVG elements have no string `className`). */
const classesIn = (root: Element) =>
  [root, ...root.querySelectorAll("*")].map((each) => each.getAttribute("class") ?? "");
const tokens = (node: Element | null) => (node?.getAttribute("class") ?? "").split(/\s+/);
const source = (file: string) => readFileSync(path.join(import.meta.dirname, file), "utf8");

/** The money as the market writes it: the fixture's own currency, not a dollar in every market. */
const money = (locale: Locale, amount: number) =>
  plain(
    formatMoney(
      amount,
      fixture(locale, "ready").product.price.price.currencyCode,
      htmlLang[locale],
    ),
  );
const chosenName = (locale: Locale, option: string, value: string) =>
  formatMessage(
    catalogs[locale].molecules.variantSelector.chosen,
    { option, value },
    htmlLang[locale],
  );
const chooseLine = (locale: Locale, titles: string[]) =>
  formatMessage(
    catalogs[locale].organisms.buyBox.choose,
    { options: formatList(titles, htmlLang[locale]) },
    htmlLang[locale],
  );

/** A product whose black and M variant is on sale, to see the price follow the choice. */
function withSale(product: ProductDetail): ProductDetail {
  return {
    ...product,
    variants: product.variants.map((variant) =>
      variant.id === "var_heritage_hoodie_black_m"
        ? {
            ...variant,
            price: { amount: 49, currencyCode: "USD" },
            compareAt: { amount: 64, currencyCode: "USD" },
          }
        : variant,
    ),
  };
}

describe("BuyBox: the form and its parts", () => {
  it.each(LOCALES)(
    "is one form with a heading, a rating, a price and a button, in %s",
    (locale) => {
      const box = fixture(locale, "ready");
      const copy = copyOf(locale);
      const lang = htmlLang[locale];
      render(element(locale, "ready", { reviewsHref: "#reviews" }));
      expect(form().tagName).toBe("FORM");
      expect(screen.getByRole("heading", { level: 1, name: box.product.title })).toBe(
        slot("buy-box-title"),
      );
      // The stars are an image named by the catalog; the count is a link to the reviews.
      const average = formatNumber(box.product.rating?.average ?? 0, lang, {
        maximumFractionDigits: 1,
      });
      expect(slot("rating")?.getAttribute("aria-label")).toBe(
        formatMessage(copy.rating.label, { value: average, max: formatNumber(5, lang) }, lang),
      );
      const reviews = screen.getByRole("link", {
        name: formatMessage(copy.buyBox.reviews, { count: box.product.rating?.count ?? 0 }, lang),
      });
      expect(reviews.getAttribute("href")).toBe("#reviews");
      expect(plain(slot("price-block")?.textContent)).toContain(
        money(locale, box.product.price.price.amount),
      );
      expect(screen.getByRole("button", { name: copy.buyBox.add })).toBe(addButton());
      expect(screen.getByRole("list", { name: copy.buyBox.notes }).children).toHaveLength(
        box.notes.length,
      );
      expect(screen.getByText(box.notes[0] ?? "")).toBeTruthy();
    },
  );

  it.each(LOCALES)("names each option's radio group with its choice, in %s", (locale) => {
    const box = fixture(locale, "ready");
    render(element(locale, "ready"));
    const [colour, size] = box.product.options;
    const colourValue = colour?.values.find((value) => value.id === box.selection.colour);
    const sizeValue = size?.values.find((value) => value.id === box.selection.size);
    expect(
      screen.getByRole("radiogroup", {
        name: chosenName(locale, colour?.title ?? "", colourValue?.label ?? ""),
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("radiogroup", {
        name: chosenName(locale, size?.title ?? "", sizeValue?.label ?? ""),
      }),
    ).toBeTruthy();
  });

  it("draws the reviews count as words alone when the page gives no place to link to", () => {
    render(element("en", "ready"));
    expect(screen.queryByRole("link")).toBeNull();
    expect(slot("buy-box-reviews")?.tagName).toBe("SPAN");
    expect(slot("buy-box-reviews")?.textContent).toBe("128 reviews");
  });

  it("draws no rating line for a product without reviews", () => {
    const box = fixture("en", "ready");
    const { rerender } = render(
      element("en", "ready", { product: { ...box.product, rating: undefined } }),
    );
    expect(slot("buy-box-rating")).toBeNull();
    const rating = { average: 0, count: 0, distribution: [] };
    rerender(element("en", "ready", { product: { ...box.product, rating } }));
    expect(slot("buy-box-rating")).toBeNull();
  });

  it("draws the notes as a named list, and no list for no notes", () => {
    const { rerender } = render(element("en", "ready"));
    expect(
      within(screen.getByRole("list", { name: "Delivery and returns" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Ships in 2 to 4 business days", "Free returns within 30 days"]);
    rerender(element("en", "ready", { notes: [] }));
    expect(slot("buy-box-notes")).toBeNull();
  });

  it("takes a title at the level the page gives it, and ids to put on it", () => {
    const { rerender } = render(element("en", "ready"));
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    for (const level of [2, 3, 4] as const) {
      rerender(element("en", "ready", { headingLevel: level, titleId: `title-${level}` }));
      const heading = screen.getByRole("heading", { level });
      expect(heading.tagName).toBe(`H${level}`);
      expect(heading.id).toBe(`title-${level}`);
      expect(heading.textContent).toBe("Heritage Hoodie");
      expect(screen.queryAllByRole("heading")).toHaveLength(1);
    }
  });
});

describe("BuyBox: the states of the fixtures", () => {
  it.each(LOCALES)("shows nothing chosen, and says what to choose, in %s", (locale) => {
    const box = fixture(locale, "empty");
    render(element(locale, "empty"));
    const titles = box.product.options.map((option) => option.title);
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
    expect(addButton().textContent).toBe(catalogs[locale].organisms.buyBox.add);
    // The visible line is the button's description, and names every option that is missing.
    const line = slot("buy-box-choose") as HTMLElement;
    expect(addButton().getAttribute("aria-describedby")).toBe(line.id);
    expect(plain(line.textContent)).toBe(plain(chooseLine(locale, titles)));
    // The stock line is in the page and empty; no variant is named, so no id is sent.
    expect(slot("buy-box-stock")?.getAttribute("aria-live")).toBe("polite");
    expect(slot("buy-box-stock")?.textContent).toBe("");
    expect(sent(new FormData(form()))).toEqual({ quantity: "1", variantId: "" });
    expect(slot("price-block")?.hasAttribute("data-sale")).toBe(false);
  });

  it.each(LOCALES)("asks only for the options still missing after the colour, in %s", (locale) => {
    const box = fixture(locale, "partial");
    render(element(locale, "partial"));
    const [colour, size] = box.product.options;
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(plain(slot("buy-box-choose")?.textContent)).toBe(
      plain(chooseLine(locale, [size?.title ?? ""])),
    );
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
    expect(slot("buy-box-stock")?.textContent).toBe("");
    expect(sent(new FormData(form()))).toMatchObject({
      [`options.${colour?.id}`]: box.selection.colour,
      variantId: "",
    });
    expect(sent(new FormData(form()))).not.toHaveProperty(`options.${size?.id}`);
  });

  it.each(LOCALES)(
    "is ready with a variant chosen: it is in stock and can be sent, in %s",
    (locale) => {
      render(element(locale, "ready"));
      const button = addButton();
      expect(button.getAttribute("aria-disabled")).toBeNull();
      expect(button.hasAttribute("disabled")).toBe(false);
      expect(button.hasAttribute("aria-describedby")).toBe(false);
      expect(button.textContent).toBe(catalogs[locale].organisms.buyBox.add);
      expect(slot("buy-box-choose")).toBeNull();
      expect(slot("buy-box-stock")?.textContent).toBe(catalogs[locale].atoms.stock.inStock);
      expect(sent(new FormData(form()))).toEqual({
        "options.colour": "colour-black",
        "options.size": "size-m",
        quantity: "1",
        variantId: "var_heritage_hoodie_black_m",
      });
    },
  );

  it.each(LOCALES)("says how many are left, and stops the stepper there, in %s", async (locale) => {
    render(element(locale, "low"));
    expect(slot("buy-box-stock")?.textContent).toBe(
      formatMessage(catalogs[locale].atoms.stock.low, { count: 3 }, htmlLang[locale]),
    );
    expect(addButton().getAttribute("aria-disabled")).toBeNull();
    const user = userEvent.setup();
    const increase = screen.getByRole("button", {
      name: catalogs[locale].atoms.quantityStepper.increase,
    });
    await user.click(increase);
    await user.click(increase);
    await user.click(increase);
    expect(sent(new FormData(form())).quantity).toBe("3");
    expect(form().querySelector<HTMLInputElement>('input[name="quantity"]')?.max).toBe("3");
  });

  it.each(LOCALES)(
    "is sold out: it says so, sends nothing, and holds the quantity, in %s",
    (locale) => {
      const action = vi.fn();
      render(element(locale, "soldOut", { action }));
      expect(addButton().textContent).toBe(catalogs[locale].organisms.buyBox.soldOut);
      expect(addButton().getAttribute("aria-disabled")).toBe("true");
      expect(addButton().hasAttribute("disabled")).toBe(false);
      // Nothing is missing, so there is no "choose" line to describe the button.
      expect(slot("buy-box-choose")).toBeNull();
      expect(addButton().hasAttribute("aria-describedby")).toBe(false);
      expect(slot("buy-box-stock")?.textContent).toBe(catalogs[locale].atoms.stock.outOfStock);
      expect(quantityInput().disabled).toBe(true);
    },
  );

  it("draws a combination the product does not make as sold out, with no stock line", () => {
    const box = fixture("en", "ready");
    const product = {
      ...box.product,
      variants: box.product.variants.filter(
        (variant) => variant.id !== "var_heritage_hoodie_black_m",
      ),
    };
    render(element("en", "ready", { product }));
    expect(addButton().textContent).toBe("Sold out");
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
    expect(slot("buy-box-stock")?.textContent).toBe("");
    expect(sent(new FormData(form())).variantId).toBe("");
  });

  it.each(STATES)("never uses the disabled attribute on the add button: %s", (state) => {
    render(element("en", state));
    expect(addButton().hasAttribute("disabled")).toBe(false);
    expect(addButton().tabIndex).toBe(0);
  });
});

describe("BuyBox: the choice", () => {
  it("calls onSelectionChange with the whole choice, and draws the result", async () => {
    const onSelectionChange = vi.fn();
    render(element("en", "empty", { onSelectionChange }));
    const user = userEvent.setup();
    expect(onSelectionChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("radio", { name: "Black" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ colour: "colour-black" });
    expect(screen.getByRole("radiogroup", { name: "Color: Black" })).toBeTruthy();
    expect(plain(slot("buy-box-choose")?.textContent)).toBe("Choose Size to add it to the cart");
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
    await user.click(screen.getByRole("radio", { name: "M" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      colour: "colour-black",
      size: "size-m",
    });
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    // Every option has a value: the button is live, the stock is told, the variant is named.
    expect(addButton().getAttribute("aria-disabled")).toBeNull();
    expect(slot("buy-box-choose")).toBeNull();
    expect(slot("buy-box-stock")?.textContent).toBe("In stock");
    expect(sent(new FormData(form())).variantId).toBe("var_heritage_hoodie_black_m");
  });

  it("changes a value of a full choice, and keeps the other", async () => {
    const onSelectionChange = vi.fn();
    render(element("en", "ready", { onSelectionChange }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Oatmeal" }));
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      colour: "colour-oatmeal",
      size: "size-m",
    });
    expect(sent(new FormData(form())).variantId).toBe("var_heritage_hoodie_oatmeal_m");
  });

  it("changes the choice with the arrow keys, which select the value they land on", async () => {
    const onSelectionChange = vi.fn();
    render(element("en", "empty", { onSelectionChange }));
    const user = userEvent.setup();
    const [first] = radiosOf(groups()[0] as HTMLElement);
    (first as HTMLElement).focus();
    await user.keyboard("{ArrowRight}");
    expect(onSelectionChange).toHaveBeenLastCalledWith({ colour: "colour-oatmeal" });
    expect(screen.getByRole("radio", { name: "Oatmeal", checked: true })).toBeTruthy();
    expect(focused()).toBe(screen.getByRole("radio", { name: "Oatmeal" }));
  });

  it("shows the chosen variant's price and its compare-at, and the product's until then", async () => {
    const box = fixture("en", "partial");
    const product = withSale(box.product);
    render(element("en", "partial", { product }));
    const user = userEvent.setup();
    expect(plain(slot("price-block")?.textContent)).toContain("$64.00");
    expect(slot("price-block")?.hasAttribute("data-sale")).toBe(false);
    await user.click(screen.getByRole("radio", { name: "Black" }));
    await user.click(screen.getByRole("radio", { name: "M" }));
    // The box was partial (oatmeal); black and M is the sale variant.
    expect(slot("price-block")?.hasAttribute("data-sale")).toBe(true);
    expect(plain(slot("price-block")?.textContent)).toContain("$49.00");
    expect(plain(slot("price-block")?.textContent)).toContain("$64.00");
  });

  it("says 'from' for the product's price while the variant varies, and not after", async () => {
    const box = fixture("en", "empty");
    const product: ProductDetail = {
      ...box.product,
      price: { price: { amount: 59, currencyCode: "USD" }, varies: true },
    };
    render(element("en", "empty", { product }));
    const user = userEvent.setup();
    expect(slot("price-block")?.hasAttribute("data-varies")).toBe(true);
    expect(plain(slot("price-block")?.textContent)).toContain("$59.00");
    await user.click(screen.getByRole("radio", { name: "Black" }));
    await user.click(screen.getByRole("radio", { name: "M" }));
    expect(slot("price-block")?.hasAttribute("data-varies")).toBe(false);
    expect(plain(slot("price-block")?.textContent)).toContain("$64.00");
  });

  it("follows the selection prop when it changes to another choice", () => {
    const { rerender } = render(element("en", "ready"));
    expect(screen.getByRole("radiogroup", { name: "Size: M" })).toBeTruthy();
    rerender(element("en", "ready", { selection: { colour: "colour-forest", size: "size-l" } }));
    expect(screen.getByRole("radiogroup", { name: "Color: Forest green" })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Size: L" })).toBeTruthy();
    expect(sent(new FormData(form())).variantId).toBe("var_heritage_hoodie_forest_l");
    rerender(element("en", "ready", { selection: {} }));
    expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
  });

  it("keeps the shopper's choice when a parent renders again with an equal selection", async () => {
    const box = fixture("en", "ready");
    const { rerender } = render(element("en", "ready"));
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "L" }));
    expect(screen.getByRole("radiogroup", { name: "Size: L" })).toBeTruthy();
    // A new object with the same content, as a server component's props arrive: not a change.
    rerender(element("en", "ready", { selection: { ...box.selection } }));
    expect(screen.getByRole("radiogroup", { name: "Size: L" })).toBeTruthy();
    // A different one is the URL's back or forward, and wins.
    rerender(element("en", "ready", { selection: { colour: "colour-black", size: "size-s" } }));
    expect(screen.getByRole("radiogroup", { name: "Size: S" })).toBeTruthy();
  });

  it("ignores a value the option does not have, and asks for that option", () => {
    render(element("en", "ready", { selection: { colour: "colour-black", size: "size-nope" } }));
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
    expect(plain(slot("buy-box-choose")?.textContent)).toBe("Choose Size to add it to the cart");
  });
});

describe("BuyBox: the add button", () => {
  it("is focusable, and still explains itself, while an option is missing", async () => {
    render(element("en", "empty"));
    const user = userEvent.setup();
    quantityInput().focus();
    await user.tab();
    expect(focused()).toBe(addButton());
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
    expect(
      screen.getByRole("button", {
        name: "Add to cart",
        description: "Choose Color and Size to add it to the cart",
      }),
    ).toBe(addButton());
  });

  it("sends nothing with an option missing, however it is pressed, and takes focus to the first missing option", async () => {
    const action = vi.fn();
    render(element("en", "empty", { action }));
    const user = userEvent.setup();
    const colours = radiosOf(groups()[0] as HTMLElement);
    // A click.
    await user.click(addButton());
    expect(action).not.toHaveBeenCalled();
    expect(focused()).toBe(colours[0]);
    // Enter on the button.
    (screen.getByRole("radio", { name: "XS" }) as HTMLElement).focus();
    addButton().focus();
    await user.keyboard("{Enter}");
    expect(action).not.toHaveBeenCalled();
    expect(focused()).toBe(colours[0]);
    // Space on the button.
    addButton().focus();
    await user.keyboard(" ");
    expect(action).not.toHaveBeenCalled();
    expect(focused()).toBe(colours[0]);
    // Enter in the quantity field submits the form the same way, and is stopped the same way.
    quantityInput().focus();
    await user.keyboard("{Enter}");
    expect(action).not.toHaveBeenCalled();
    expect(focused()).toBe(colours[0]);
  });

  it("takes focus to the size when only the size is missing", async () => {
    const action = vi.fn();
    render(element("en", "partial", { action }));
    const user = userEvent.setup();
    await user.click(addButton());
    expect(action).not.toHaveBeenCalled();
    expect(focused()).toBe(radiosOf(groups()[1] as HTMLElement)[0]);
    expect(focused()?.getAttribute("role")).toBe("radio");
  });

  it("sends a string action nowhere either: the submission is cancelled", () => {
    render(element("en", "empty", { action: "/cart/add" }));
    expect(form().getAttribute("method")).toBe("post");
    expect(form().getAttribute("action")).toBe("/cart/add");
    expect(fireEvent.submit(form())).toBe(false);
  });

  it("sends exactly the choice, the quantity and the variant when every option has a value", async () => {
    const action = vi.fn();
    render(element("en", "ready", { action }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(addButton());
    expect(action).toHaveBeenCalledTimes(1);
    expect(sent(action.mock.calls[0]?.[0] as FormData)).toEqual({
      "options.colour": "colour-black",
      "options.size": "size-m",
      quantity: "2",
      variantId: "var_heritage_hoodie_black_m",
    });
  });

  it("sends the choice made in the box, after the shopper completed it", async () => {
    const action = vi.fn();
    render(element("en", "empty", { action }));
    const user = userEvent.setup();
    await user.click(addButton());
    expect(action).not.toHaveBeenCalled();
    await user.click(screen.getByRole("radio", { name: "Sky blue" }));
    await user.click(screen.getByRole("radio", { name: "S" }));
    await user.click(addButton());
    expect(action).toHaveBeenCalledTimes(1);
    expect(sent(action.mock.calls[0]?.[0] as FormData)).toMatchObject({
      "options.colour": "colour-sky",
      "options.size": "size-s",
      variantId: "var_heritage_hoodie_sky_s",
    });
  });

  it("sends nothing for a variant that cannot be bought, and leaves focus where it is", async () => {
    const action = vi.fn();
    render(element("en", "soldOut", { action }));
    const user = userEvent.setup();
    await user.click(addButton());
    expect(action).not.toHaveBeenCalled();
    expect(focused()).toBe(addButton());
  });

  it("sends nothing without an action, and does not reload the page", () => {
    render(element("en", "ready"));
    expect(form().getAttribute("method")).toBeNull();
    expect(fireEvent.submit(form())).toBe(false);
  });

  it("says it is adding, holds the button, and is not pressed twice", async () => {
    const action = vi.fn();
    render(element("en", "ready", { action, status: "adding" }));
    const user = userEvent.setup();
    expect(addButton().textContent).toBe("Adding to cart…");
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
    expect(addButton().getAttribute("aria-busy")).toBe("true");
    expect(addButton().hasAttribute("disabled")).toBe(false);
    expect(form().getAttribute("data-status")).toBe("adding");
    await user.click(addButton());
    quantityInput().focus();
    await user.keyboard("{Enter}");
    expect(action).not.toHaveBeenCalled();
    // The spinner is decoration; the words are the button's.
    expect(within(addButton()).getByText("Adding to cart…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Adding to cart…" })).toBe(addButton());
  });

  it("does not pull focus away while adding, even when an option is missing", async () => {
    render(element("en", "empty", { action: () => undefined, status: "adding" }));
    const user = userEvent.setup();
    await user.click(addButton());
    expect(focused()).toBe(addButton());
  });
});

describe("BuyBox: the quantity", () => {
  it("starts at the quantity it is given, between 1 and the most a line takes", () => {
    render(element("en", "ready", { quantity: 4, maxQuantity: 6 }));
    expect(quantityInput().value).toBe("4");
    expect(form().querySelector<HTMLInputElement>('input[name="quantity"]')?.min).toBe("1");
    expect(form().querySelector<HTMLInputElement>('input[name="quantity"]')?.max).toBe("6");
  });

  it("is labelled by the catalog's word, for the input", () => {
    render(element("en", "ready"));
    const label = form().querySelector<HTMLLabelElement>("label") as HTMLLabelElement;
    expect(label.textContent).toBe("Quantity");
    expect(label.htmlFor).toBe(quantityInput().id);
    expect(quantityInput().getAttribute("aria-label")).toBe("Quantity");
  });

  it("holds a number to the new maximum when the variant has fewer left", () => {
    const { rerender } = render(element("en", "ready", { quantity: 8, maxQuantity: 10 }));
    expect(quantityInput().value).toBe("8");
    rerender(element("en", "ready", { quantity: 8, maxQuantity: 3 }));
    expect(quantityInput().value).toBe("3");
    expect(sent(new FormData(form())).quantity).toBe("3");
  });

  it("puts the starting number back when the field is left empty", async () => {
    render(element("en", "ready", { quantity: 2 }));
    const user = userEvent.setup();
    await user.clear(quantityInput());
    await user.tab();
    expect(quantityInput().value).toBe("2");
  });

  it("follows the quantity prop when it changes", () => {
    const { rerender } = render(element("en", "ready", { quantity: 1 }));
    rerender(element("en", "ready", { quantity: 5 }));
    expect(quantityInput().value).toBe("5");
  });
});

describe("BuyBox: the status region", () => {
  it("is in the page from the first render, empty, and is the same element when the words come", () => {
    const { rerender } = render(element("en", "ready"));
    const region = screen.getByRole("status");
    expect(region).toBe(slot("buy-box-status"));
    expect(region.textContent).toBe("");
    rerender(element("en", "ready", { status: "added" }));
    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("Added to cart");
    expect(addButton().getAttribute("aria-disabled")).toBeNull();
    rerender(element("en", "ready", { status: "error" }));
    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("Could not add to cart. Please try again.");
    expect(form().getAttribute("data-status")).toBe("error");
    rerender(element("en", "ready", { status: "idle" }));
    expect(region.textContent).toBe("");
  });

  it.each(LOCALES)("says added and error in the catalog's words, in %s", (locale) => {
    const copy = catalogs[locale].organisms.buyBox;
    const { rerender } = render(element(locale, "ready", { status: "added" }));
    expect(screen.getByRole("status").textContent).toBe(copy.added);
    rerender(element(locale, "ready", { status: "error" }));
    expect(screen.getByRole("status").textContent).toBe(copy.error);
  });

  it("drops the answer once the shopper changes the choice it answered (PR 60 review)", async () => {
    const { rerender } = render(element("en", "ready", { status: "added" }));
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("Added to cart");
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "L" }));
    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("");
    // A new answer for the new choice is said.
    rerender(element("en", "ready", { status: "adding" }));
    rerender(element("en", "ready", { status: "error" }));
    expect(region.textContent).toBe("Could not add to cart. Please try again.");
  });

  it("keeps the stock line in the page, and it is the same element when it has words", async () => {
    render(element("en", "empty"));
    const region = slot("buy-box-stock") as HTMLElement;
    expect(region.getAttribute("aria-live")).toBe("polite");
    const user = userEvent.setup();
    await user.click(screen.getByRole("radio", { name: "Black" }));
    await user.click(screen.getByRole("radio", { name: "L" }));
    expect(slot("buy-box-stock")).toBe(region);
    expect(region.textContent).toBe("In stock");
  });
});

describe("BuyBox: the size guide", () => {
  const guide = <button type="button">Size guide</button>;

  it("sits at the end of the size option's label line, and only there", () => {
    render(element("en", "ready", { sizeGuide: guide }));
    const rows = [...document.querySelectorAll('[data-slot="variant-selector-label-row"]')];
    expect(rows).toHaveLength(1);
    const row = rows[0] as HTMLElement;
    expect(within(row).getByRole("button", { name: "Size guide" })).toBeTruthy();
    expect(row.querySelector('[data-slot="variant-selector-label"]')?.textContent).toBe("Size: M");
    expect(slot("buy-box-size-guide")).toBeNull();
    // It is beside the label, not inside the radio group's name.
    expect(screen.getByRole("radiogroup", { name: "Size: M" })).toBeTruthy();
    expect(
      within(groups()[0] as HTMLElement).queryByRole("button", { name: "Size guide" }),
    ).toBeNull();
  });

  it("goes under the options for a product that has no size option", () => {
    const box = fixture("en", "ready");
    const product = {
      ...box.product,
      options: box.product.options.filter((option) => option.kind !== "size"),
    };
    render(
      element("en", "ready", { product, selection: { colour: "colour-black" }, sizeGuide: guide }),
    );
    expect(slot("variant-selector-label-row")).toBeNull();
    expect(
      within(slot("buy-box-size-guide") as HTMLElement).getByRole("button", { name: "Size guide" }),
    ).toBeTruthy();
  });

  it("draws nothing for it when the page gives none", () => {
    render(element("en", "ready"));
    expect(slot("variant-selector-label-row")).toBeNull();
    expect(slot("buy-box-size-guide")).toBeNull();
    expect(screen.queryByRole("button", { name: "Size guide" })).toBeNull();
  });
});

describe("BuyBox: ids", () => {
  it("puts the ids a page gives on the form, the options and the button", () => {
    render(
      element("en", "empty", { formId: "buy-form", optionsId: "buy-options", buttonId: "buy-add" }),
    );
    expect(form().id).toBe("buy-form");
    expect(slot("buy-box-options")?.id).toBe("buy-options");
    expect(addButton().id).toBe("buy-add");
    // The sticky bar's button joins the form by its id.
    expect(addButton().form).toBe(form());
    expect(slot("buy-box-options")?.contains(groups()[0] ?? null)).toBe(true);
  });

  it("makes ids of its own that differ between boxes on one page", () => {
    render(
      <>
        {element("en", "empty")}
        {element("en", "ready")}
      </>,
    );
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    expect(ids.length).toBeGreaterThan(10);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
    // Each button describes itself by the line of its own box.
    const [first] = document.querySelectorAll<HTMLButtonElement>('[data-slot="buy-box-add"]');
    const describedBy = first?.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.closest("form")).toBe(first?.form);
  });

  it("has labels that point at inputs in the same box", () => {
    render(
      <>
        {element("en", "empty")}
        {element("en", "ready")}
      </>,
    );
    for (const label of document.querySelectorAll<HTMLLabelElement>("label[for]")) {
      expect(label.control?.closest("form")).toBe(label.closest("form"));
    }
  });
});

describe("BuyBox: long labels", () => {
  it.each(longLabels)(
    "wraps a long %s title, option, note and button, and cuts nothing",
    (locale, long) => {
      const box = fixture(locale, "empty");
      const [colour, size] = box.product.options;
      if (colour === undefined || size === undefined)
        throw new Error("the fixture has two options");
      const product: ProductDetail = {
        ...box.product,
        title: long.productName,
        options: [
          {
            ...colour,
            title: long.optionLabel,
            values: colour.values.map((value, index) =>
              index === 0 ? { ...value, label: long.chipLabel } : value,
            ),
          },
          {
            ...size,
            title: long.fieldLabel,
            values: size.values.map((value, index) =>
              index === 0 ? { ...value, label: long.linkLabel } : value,
            ),
          },
        ],
      };
      const copy = copyOf(locale);
      render(
        element(locale, "empty", {
          product,
          notes: [long.helpText, long.errorText],
          copy: { ...copy, buyBox: { ...copy.buyBox, add: long.action, notes: long.hint } },
          sizeGuide: <button type="button">{long.linkLabel}</button>,
        }),
      );
      expect(classesIn(form()).filter((each) => CLIPPING_CLASSES.test(each))).toEqual([]);
      expect(tokens(slot("buy-box-title"))).toContain("wrap-anywhere");
      expect(tokens(slot("buy-box-title"))).not.toContain("truncate");
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(long.productName);
      // The option labels and the line that names the missing options wrap.
      expect(screen.getByText(long.optionLabel).className).toContain("wrap-anywhere");
      expect(screen.getByText(long.fieldLabel).className).toContain("wrap-anywhere");
      expect(plain(slot("buy-box-choose")?.textContent)).toContain(long.optionLabel);
      expect(plain(slot("buy-box-choose")?.textContent)).toContain(long.fieldLabel);
      // The button's words break inside the box, which is as wide as its column.
      expect(addButton().textContent).toBe(long.action);
      expect(tokens(addButton())).toEqual(
        expect.arrayContaining(["w-full", "max-w-full", "wrap-anywhere"]),
      );
      expect(
        within(slot("buy-box-notes") as HTMLElement).getByText(long.helpText).className,
      ).toContain("wrap-anywhere");
      expect(
        within(slot("buy-box-notes") as HTMLElement).getByText(long.errorText).className,
      ).toContain("wrap-anywhere");
      expect(screen.getByRole("list", { name: long.hint })).toBeTruthy();
      // Every part of the box may shrink below its content, so nothing pushes the page wider.
      expect(tokens(form())).toContain("min-w-0");
    },
  );

  it.each(longLabels)("wraps the status words in %s", (locale, long) => {
    const copy = copyOf(locale);
    const longCopy = {
      ...copy,
      buyBox: { ...copy.buyBox, added: long.helpText, error: long.errorText },
    };
    const { rerender } = render(element(locale, "ready", { copy: longCopy, status: "added" }));
    expect(screen.getByText(long.helpText).className).toContain("wrap-anywhere");
    rerender(element(locale, "ready", { copy: longCopy, status: "error" }));
    expect(screen.getByText(long.errorText).className).toContain("wrap-anywhere");
  });
});

describe("BuyBox: the 44 px rule and the classes", () => {
  it("gives every control the 44 px classes", () => {
    render(element("en", "ready", { reviewsHref: "#reviews" }));
    expect(tokens(addButton())).toContain("min-h-12");
    expect(tokens(screen.getByRole("link", { name: "128 reviews" }))).toContain("min-h-11");
    expect(tokens(screen.getByRole("button", { name: "Increase quantity" }))).toContain("size-11");
    expect(tokens(screen.getByRole("button", { name: "Decrease quantity" }))).toContain("size-11");
    expect(tokens(quantityInput())).toContain("h-11");
    for (const radio of screen.getAllByRole("radio")) {
      const own = tokens(radio);
      expect(own.includes("size-11") || own.includes("min-h-11")).toBe(true);
    }
  });

  it("styles the held button so that it looks held, and does not light up on hover", () => {
    render(element("en", "empty"));
    expect(tokens(addButton())).toEqual(
      expect.arrayContaining([
        "aria-disabled:cursor-not-allowed",
        "aria-disabled:opacity-60",
        "aria-disabled:hover:bg-primary",
      ]),
    );
  });

  it("draws every icon as decoration", () => {
    render(element("en", "ready", { status: "added" }));
    for (const icon of form().querySelectorAll("svg")) {
      const decorative =
        icon.getAttribute("aria-hidden") === "true" ||
        icon.closest("[aria-hidden='true']") !== null;
      expect(decorative).toBe(true);
    }
  });

  it("writes no em dash in a state's words", () => {
    render(element("en", "ready", { status: "added" }));
    expect(form().textContent).not.toContain(EM_DASH);
  });
});

describe("BuyBox: on the server", () => {
  it.each(STATES)(
    "renders %s to markup that already holds the form, the button and the line",
    (state) => {
      const html = renderToString(element("en", state));
      expect(html).toContain('data-slot="buy-box"');
      expect(html).toContain('data-slot="buy-box-add"');
      expect(html).toContain('role="status"');
      expect(html).toContain('name="variantId"');
      // The Add button is never `disabled`: not before a script runs either.
      const holder = document.createElement("div");
      holder.innerHTML = html;
      expect(holder.querySelector('[data-slot="buy-box-add"]')?.hasAttribute("disabled")).toBe(
        false,
      );
    },
  );

  it("posts a form with a string action as a form, with the fields as the page was drawn", () => {
    const html = renderToString(element("en", "ready", { action: "/cart/add" }));
    expect(html).toContain('action="/cart/add"');
    expect(html).toContain('method="post"');
    expect(html).toContain('name="options.colour"');
    expect(html).toContain('name="options.size"');
    expect(html).toContain('name="quantity"');
    expect(html).toContain('value="var_heritage_hoodie_black_m"');
  });
});

describe("BuyBox: the files (D49)", () => {
  /** The modules a file imports at run time: a type-only import leaves no trace. */
  const runtimeImports = (text: string) =>
    [...text.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gms)].map(
      (match) => match[1] ?? "",
    );

  it.each(["buy-box.tsx", "buy-box-choice.ts"])(
    "keeps %s free of the catalogs, the registry and the fixtures at run time",
    (name) => {
      const imported = runtimeImports(source(name));
      expect(imported.filter((each) => each === "@shopblok/i18n")).toEqual([]);
      expect(imported.filter((each) => /@shopblok\/(?:registry|fixtures)/.test(each))).toEqual([]);
      expect(imported).toContain("@shopblok/i18n/format");
    },
  );

  it("is a client component, and the helper that it shares with the quick view is not one", () => {
    expect(source("buy-box.tsx")).toMatch(/^"use client";?$/m);
    expect(source("buy-box-choice.ts")).not.toMatch(/^"use client"/m);
  });

  it("writes no em dash", () => {
    for (const name of ["buy-box.tsx", "buy-box-choice.ts", "buy-box.test.tsx"]) {
      expect(source(name)).not.toContain(EM_DASH);
    }
  });
});

describe("BuyBox: nothing happens by itself", () => {
  it("does not call onSelectionChange when it renders, follows a prop or is given a status", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(element("en", "ready", { onSelectionChange }));
    act(() => {
      rerender(
        element("en", "ready", {
          onSelectionChange,
          selection: { colour: "colour-forest", size: "size-l" },
          status: "added",
        }),
      );
    });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
