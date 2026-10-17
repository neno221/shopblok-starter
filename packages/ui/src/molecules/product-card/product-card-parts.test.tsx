import { commerceFixtures } from "@shopblok/fixtures";
import { catalogs, LOCALES } from "@shopblok/i18n";
import type { ProductCard } from "@shopblok/registry/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CLIPPING_CLASSES } from "../../test-support/long-labels";
import { ProductCardImageSwap } from "./image-swap";
import { ProductCardQuickAdd } from "./quick-add";
import { ProductCardStandard } from "./standard";
import { ProductCardSwatches } from "./swatches";

// The parts only some variants have: the swatches, the quick-add form and the image swap.

type Locale = (typeof LOCALES)[number];

const sizes = "(min-width: 768px) 25vw, 50vw";

function setup(locale: Locale, product: ProductCard) {
  const { market } = commerceFixtures[locale];
  const { molecules } = catalogs[locale];
  return {
    product,
    copy: { card: molecules.productCard, priceBlock: molecules.priceBlock },
    locale: market.htmlLang,
    sizes,
  };
}

/** A button's name as a reader hears it: browsers may put a space before the hidden ", title". */
const nameIs = (text: string) => (name: string) => name.replace(/\s+,/g, ",") === text;

const named = (locale: Locale, handle: string) => {
  const found = commerceFixtures[locale].products.find((candidate) => candidate.handle === handle);
  if (found === undefined) throw new Error(`no ${locale} product ${handle}`);
  return found;
};

describe("the swatches variant", () => {
  const tee = named("en", "essential-tee");
  const hoodie = named("en", "heritage-hoodie");

  it("lists the colours under a name from the copy, each colour's name read out", () => {
    render(<ProductCardSwatches {...setup("en", hoodie)} />);
    const list = screen.getByRole("list", { name: "Colors" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(
      hoodie.swatches.map((swatch) => swatch.label),
    );
    // The name is visually hidden and the disc is decoration.
    for (const item of items) {
      expect(item.querySelector(".sr-only")).not.toBeNull();
      expect(item.querySelector("[aria-hidden=true]")).not.toBeNull();
    }
  });

  it("draws each disc in the catalog's colour, and nothing in it can be pressed", () => {
    render(<ProductCardSwatches {...setup("en", hoodie)} />);
    const list = screen.getByRole("list", { name: "Colors" });
    const discs = [...list.querySelectorAll<HTMLElement>("li > [aria-hidden=true]")];
    expect(discs).toHaveLength(hoodie.swatches.length);
    for (const [index, disc] of discs.entries()) {
      // The browser may write the colour as rgb(), so compare the colour, not the string.
      const probe = document.createElement("span");
      probe.style.backgroundColor = hoodie.swatches[index]!.hex!;
      expect(disc.style.backgroundColor).toBe(probe.style.backgroundColor);
      expect(disc.style.backgroundColor).not.toBe("");
    }
    expect(within(list).queryAllByRole("button")).toHaveLength(0);
    expect(list.querySelector("button, a, input, [tabindex]")).toBeNull();
  });

  it("shows four colours and +6 for the rest of ten, and says how many more", () => {
    expect(tee.swatches).toHaveLength(10);
    render(<ProductCardSwatches {...setup("en", tee)} />);
    const list = screen.getByRole("list", { name: "Colors" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    const more = list.querySelector("[data-slot=product-card-swatches-more]");
    expect(more?.textContent).toBe("+66 more colors");
    expect(more?.querySelector("[aria-hidden=true]")?.textContent).toBe("+6");
    expect(more?.querySelector(".sr-only")?.textContent).toBe("6 more colors");
    expect(items[0]?.textContent).toBe(tee.swatches[0]?.label);
    expect(items[3]?.textContent).toBe(tee.swatches[3]?.label);
  });

  it("shows all of five, and four with the count for six", () => {
    const five = { ...tee, swatches: tee.swatches.slice(0, 5) };
    const { unmount } = render(<ProductCardSwatches {...setup("en", five)} />);
    const items = () =>
      within(screen.getByRole("list", { name: "Colors" })).getAllByRole("listitem");
    expect(items()).toHaveLength(5);
    expect(document.querySelector("[data-slot=product-card-swatches-more]")).toBeNull();
    unmount();
    const six = { ...tee, swatches: tee.swatches.slice(0, 6) };
    render(<ProductCardSwatches {...setup("en", six)} />);
    expect(items()).toHaveLength(5);
    expect(screen.getByRole("list", { name: "Colors" }).textContent).toContain("2 more colors");
  });

  it("says that a colour is unavailable, and draws it struck through", () => {
    render(<ProductCardSwatches {...setup("en", named("en", "brushed-fleece-hoodie"))} />);
    const list = screen.getByRole("list", { name: "Colors" });
    expect(list.querySelector("[data-unavailable]")).toBeNull();
    document.body.innerHTML = "";
    const soldOutColour = named("en", "garment-dyed-hoodie");
    render(<ProductCardSwatches {...setup("en", soldOutColour)} />);
    const unavailable = screen
      .getByRole("list", { name: "Colors" })
      .querySelectorAll("[data-unavailable]");
    expect(unavailable).toHaveLength(soldOutColour.swatches.length);
    expect(unavailable[0]?.textContent).toBe(`${soldOutColour.swatches[0]?.label}, Unavailable`);
    expect(unavailable[0]?.querySelector("[aria-hidden=true] > span")).not.toBeNull();
  });

  it("has no row for a product with no colours, and the other variants have none", () => {
    render(<ProductCardSwatches {...setup("en", { ...hoodie, swatches: [] })} />);
    expect(screen.queryByRole("list", { name: "Colors" })).toBeNull();
    document.body.innerHTML = "";
    render(<ProductCardStandard {...setup("en", hoodie)} />);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it.each(LOCALES)("names the list and the colours in %s", (locale) => {
    const product = named(locale, "essential-tee");
    render(<ProductCardSwatches {...setup(locale, product)} />);
    const list = screen.getByRole("list", {
      name: catalogs[locale].molecules.productCard.swatches,
    });
    expect(list.textContent).toContain(product.swatches[0]!.label);
    expect(list.querySelector("[data-slot=product-card-swatches-more]")).not.toBeNull();
  });

  it("is one link and one list, and the list is outside the link", () => {
    const { container } = render(<ProductCardSwatches {...setup("en", hoodie)} />);
    const link = within(container).getByRole("link");
    expect(link.contains(screen.getByRole("list"))).toBe(false);
  });
});

describe("the quick-add variant", () => {
  const hoodie = named("en", "heritage-hoodie");
  const one = { ...hoodie, variantCount: 1 };
  const soldOut = named("en", "garment-dyed-hoodie");

  const draw = (
    card: ProductCard,
    status?: "idle" | "adding" | "added" | "error",
    action: Parameters<typeof ProductCardQuickAdd>[0]["action"] = "/us/cart/add",
    locale: Locale = "en",
  ) => render(<ProductCardQuickAdd {...setup(locale, card)} action={action} status={status} />);

  it("is a form with the product's id in a hidden input, below the card's link and outside it", () => {
    const { container } = draw(one);
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form.getAttribute("data-slot")).toBe("product-card-quick-add");
    expect(form.querySelector<HTMLInputElement>("input[name=productId]")?.value).toBe(one.id);
    expect(form.querySelector<HTMLInputElement>("input[name=handle]")?.value).toBe(one.handle);
    for (const input of form.querySelectorAll("input")) expect(input.type).toBe("hidden");
    const link = within(container).getByRole("link");
    expect(link.contains(form)).toBe(false);
    // After the card's text in the reading order.
    expect(link.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sits above the stretched link, as a positioned box of its own", () => {
    const { container } = draw(one);
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form.className).toContain("relative");
    expect(form.className).toContain("z-10");
  });

  it("passes a string action through to the form", () => {
    const { container } = draw(one, "idle", hoodie.href);
    expect(container.querySelector("form")?.getAttribute("action")).toBe(hoodie.href);
  });

  it("calls a function action with the form's data when the button is pressed", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    draw(one, "idle", action);
    await user.click(screen.getByRole("button", { name: /^Add to cart/ }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const data = action.mock.calls[0]?.[0] as FormData;
    expect(data.get("productId")).toBe(one.id);
    expect(data.get("handle")).toBe(one.handle);
  });

  it('says "Add to cart" for one variant and "Choose options" for several', () => {
    draw(one);
    expect(screen.getByRole("button", { name: nameIs("Add to cart, " + one.title) })).toBeTruthy();
    document.body.innerHTML = "";
    expect(hoodie.variantCount).toBeGreaterThan(1);
    draw(hoodie);
    expect(
      screen.getByRole("button", { name: nameIs("Choose options, " + hoodie.title) }),
    ).toBeTruthy();
    document.body.innerHTML = "";
    draw({ ...hoodie, variantCount: 2 });
    expect(screen.getByRole("button", { name: /^Choose options/ })).toBeTruthy();
  });

  it("keeps the visible text inside the name, and adds the title after it (WCAG 2.5.3)", () => {
    draw(one);
    const button = screen.getByRole("button");
    const visible = button.querySelector("[data-slot=product-card-quick-add-label]")?.textContent;
    expect(visible).toBe("Add to cart");
    expect(button.querySelector(".sr-only")?.textContent).toBe(`, ${one.title}`);
    expect(button.textContent).toBe(`Add to cart, ${one.title}`);
  });

  it("tells two buttons apart by their names", () => {
    const a = named("en", "heritage-hoodie");
    const b = named("en", "essential-tee");
    render(
      <>
        <ProductCardQuickAdd {...setup("en", { ...a, variantCount: 1 })} action="/a" />
        <ProductCardQuickAdd {...setup("en", { ...b, variantCount: 1 })} action="/b" />
      </>,
    );
    const names = screen.getAllByRole("button").map((button) => button.textContent);
    expect(new Set(names).size).toBe(2);
  });

  it("is a 44 px button across the card's width", () => {
    draw(one);
    const button = screen.getByRole("button");
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("w-full");
    expect(button.className).toContain("focus-visible:ring-ring");
    expect(button.className).not.toContain("ring-ring/");
  });

  it("is in the idle state by default: enabled, a submit button, nothing announced", () => {
    const { container } = draw(one);
    const button = screen.getByRole<HTMLButtonElement>("button");
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBeNull();
    expect(button.type).toBe("submit");
    expect(container.querySelector("[data-slot=spinner]")).toBeNull();
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");
  });

  it("disables a sold-out product's button and says so", () => {
    draw({ ...soldOut, variantCount: 1 });
    const button = screen.getByRole<HTMLButtonElement>("button");
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe(`Sold out, ${soldOut.title}`);
    expect(button.querySelector("[data-slot=product-card-quick-add-label]")?.textContent).toBe(
      "Sold out",
    );
  });

  it("does not submit a sold-out product", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    draw(soldOut, "idle", action);
    await user.click(screen.getByRole("button"));
    expect(action).not.toHaveBeenCalled();
  });

  it("shows a spinner while adding, is aria-disabled, and submits nothing", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    const { container } = draw(one, "adding", action);
    const button = screen.getByRole<HTMLButtonElement>("button");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.getAttribute("aria-busy")).toBe("true");
    // Still focusable (a button that vanishes from the tab order loses the reader's place), and
    // not a submit button, so that it submits nothing even before the page is hydrated.
    expect(button.disabled).toBe(false);
    expect(button.type).toBe("button");
    expect(container.querySelector("[data-slot=spinner]")).not.toBeNull();
    expect(button.querySelector("[data-slot=product-card-quick-add-label]")?.textContent).toBe(
      "Adding to cart…",
    );
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.click(button);
    await user.keyboard("{Enter}");
    expect(action).not.toHaveBeenCalled();
  });

  it("hides the spinner from assistive technology: the button's text says what is happening", () => {
    draw(one, "adding");
    const spinner = document.querySelector("[data-slot=spinner]");
    expect(spinner?.getAttribute("aria-hidden")).toBe("true");
    expect(
      screen.getByRole("button", { name: nameIs(`Adding to cart…, ${one.title}`) }),
    ).toBeTruthy();
  });

  it("announces that the product was added, politely, and shows it on the button", () => {
    draw(one, "added");
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("Added to cart");
    expect(region.querySelector(".sr-only")).not.toBeNull();
    const button = screen.getByRole<HTMLButtonElement>("button");
    expect(button.querySelector("[data-slot=product-card-quick-add-label]")?.textContent).toBe(
      "Added to cart",
    );
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    // Pressed again, it adds another.
    expect(button.disabled).toBe(false);
    expect(button.type).toBe("submit");
  });

  it("shows and announces an error, politely, and lets the shopper try again", () => {
    draw(one, "error");
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("Could not add to cart. Please try again.");
    expect(region.querySelector(".sr-only")).toBeNull();
    expect(region.querySelector("p")?.className).toContain("text-destructive");
    const button = screen.getByRole<HTMLButtonElement>("button");
    expect(button.disabled).toBe(false);
    expect(button.type).toBe("submit");
    expect(button.querySelector("[data-slot=product-card-quick-add-label]")?.textContent).toBe(
      "Add to cart",
    );
  });

  it("keeps the live region in the page in every state, so a change in it is announced", () => {
    for (const status of ["idle", "adding", "added", "error"] as const) {
      const { unmount } = draw(one, status);
      expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
      unmount();
    }
  });

  it("reaches the link and then the button with Tab, and Enter on the button submits", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    const { container } = draw(one, "idle", action);
    await user.tab();
    expect(document.activeElement).toBe(within(container).getByRole("link"));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button"));
    await user.keyboard("{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await user.tab();
    expect(document.activeElement).toBe(document.body);
  });

  it("is still one link, and the button is not in it", () => {
    const { container } = draw(one);
    const links = within(container).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.querySelector("button, input, form")).toBeNull();
    expect(links[0]?.contains(screen.getByRole("button"))).toBe(false);
  });

  it.each(LOCALES)("writes the button and the states in %s", (locale) => {
    const text = catalogs[locale].molecules.productCard.quickAdd;
    const product = { ...named(locale, "heritage-hoodie"), variantCount: 1 };
    for (const [status, expected] of [
      ["idle", text.add],
      ["adding", text.adding],
      ["added", text.added],
      ["error", text.add],
    ] as const) {
      const { unmount } = draw(product, status, "/x", locale);
      const button = screen.getByRole("button");
      expect(
        button.querySelector("[data-slot=product-card-quick-add-label]")?.textContent,
        `${locale} ${status}`,
      ).toBe(expected);
      expect(button.textContent).toContain(product.title);
      unmount();
    }
    draw({ ...product, variantCount: 3 }, "idle", "/x", locale);
    expect(screen.getByRole("button").textContent).toContain(text.chooseOptions);
  });

  it.each(["de", "el"] as const)("wraps a long %s label and title on the button", (locale) => {
    const { long } = commerceFixtures[locale];
    draw(long.product, "error", "/x", locale);
    const button = screen.getByRole("button");
    expect(button.className).not.toMatch(CLIPPING_CLASSES);
    expect(button.textContent).toContain(long.product.title);
    const region = screen.getByRole("status");
    expect(region.textContent).toBe(catalogs[locale].molecules.productCard.quickAdd.error);
    for (const element of region.querySelectorAll("*"))
      expect(element.getAttribute("class") ?? "").not.toMatch(CLIPPING_CLASSES);
  });
});

describe("the image-swap variant", () => {
  const hoodie = named("en", "heritage-hoodie");

  it("has the second picture in the card, marked for the hover", () => {
    const { container } = render(<ProductCardImageSwap {...setup("en", hoodie)} />);
    const swap = container.querySelector("[data-swap-image]");
    expect(swap).not.toBeNull();
    expect(swap?.querySelector("img")).not.toBeNull();
    // Shown on hover, and while focus is inside the card, with CSS alone.
    expect(swap?.className).toContain("opacity-0");
    expect(swap?.className).toContain("group-hover/card:opacity-100");
    expect(swap?.className).toContain("group-focus-within/card:opacity-100");
    // The card is the group.
    expect(container.querySelector("article")?.className).toContain("group/card");
  });

  it("does not swap under reduced motion: the second picture is not drawn", () => {
    const { container } = render(<ProductCardImageSwap {...setup("en", hoodie)} />);
    const swap = container.querySelector("[data-swap-image]");
    expect(swap?.className).toContain("motion-reduce:hidden");
    expect(swap?.className).toContain("motion-reduce:transition-none");
  });

  it("keeps the first picture as the product's, and the second as decoration", () => {
    const { container } = render(<ProductCardImageSwap {...setup("en", hoodie)} />);
    expect(within(container).getByRole("img", { name: hoodie.images[0]!.alt })).toBeTruthy();
    const swap = container.querySelector("[data-swap-image]") as HTMLElement;
    expect(swap.getAttribute("aria-hidden")).toBe("true");
    expect(swap.querySelector("img")?.getAttribute("alt")).toBe("");
    // The hover picture is not in the accessibility tree: one picture is named.
    expect(
      within(container)
        .getAllByRole("img")
        .filter((img) => img.closest("[data-swap-image]") === null).length,
    ).toBeGreaterThan(0);
    expect(swap.querySelector("img")?.getAttribute("src")).toContain("data:image/svg+xml");
  });

  it("draws the second picture when asked to, as on hover, even under reduced motion", () => {
    const { container } = render(<ProductCardImageSwap {...setup("en", hoodie)} swapped />);
    const swap = container.querySelector("[data-swap-image]");
    expect(swap?.getAttribute("data-swapped")).toBe("");
    expect(swap?.className).toContain("opacity-100");
    expect(swap?.className).not.toContain("opacity-0");
    expect(swap?.className).not.toContain("motion-reduce:hidden");
  });

  it("has no second picture for a card with one image: it just shows the first", () => {
    const single = { ...hoodie, images: hoodie.images.slice(0, 1) };
    const { container } = render(<ProductCardImageSwap {...setup("en", single)} />);
    expect(container.querySelector("[data-swap-image]")).toBeNull();
    expect(within(container).getByRole("img", { name: hoodie.images[0]!.alt })).toBeTruthy();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("puts the second picture under the badges and not over them", () => {
    const { container } = render(
      <ProductCardImageSwap {...setup("en", named("en", "brushed-fleece-hoodie"))} />,
    );
    const swap = container.querySelector("[data-swap-image]") as HTMLElement;
    const badges = container.querySelector("[data-slot=product-card-badges]") as HTMLElement;
    expect(swap.compareDocumentPosition(badges) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("is one link whichever picture is showing", () => {
    for (const swapped of [false, true]) {
      const { container, unmount } = render(
        <ProductCardImageSwap {...setup("en", hoodie)} swapped={swapped} />,
      );
      expect(within(container).getAllByRole("link")).toHaveLength(1);
      unmount();
    }
  });
});
