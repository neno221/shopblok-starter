// Ours (T52, SETUP.md "Cart and checkout (T52)"). The cart template in Testing Library and happy-dom:
// the page's one `<main>` and `<h1>` (the title, the count beside it), the lines as CartLineItems
// under h2s with the given actions on their forms, the summary's rows (the discount only when there
// is one), the links to the checkout and back to the shop, an empty cart as EmptyState, an action's
// failure in an alert, and the root as a div under another id.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartTemplate, cartCopy, cartIds } from "./cart";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const slots = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(`[data-slot="${name}"]`),
];

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
});

function renderCart(
  locale: (typeof LOCALES)[number] = "en",
  state: "full" | "empty" = "full",
  props = {},
) {
  const page = pageFixtures[locale].cart[state];
  return render(
    <CartTemplate
      {...page}
      copy={cartCopy(catalogs[locale])}
      locale="en-US"
      prefetch={false}
      {...props}
    />,
  );
}

describe("CartTemplate", () => {
  it.each(LOCALES)("is the page's main with the title as its one h1, in %s", (locale) => {
    renderCart(locale);
    const page = pageFixtures[locale].cart.full;
    const words = catalogs[locale].templates.cart;
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("data-slot")).toBe("cart-template");
    expect(main.getAttribute("data-variant")).toBe("default");
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.id).toBe(cartIds("main").title);
    expect(h1[0]?.firstElementChild?.textContent).toBe(words.title);
    expect(slot("cart-count")?.textContent).toBe(
      formatMessage(words.count, { count: page.cart.itemCount }, "en-US"),
    );
    expect(h1[0]?.contains(slot("cart-count"))).toBe(true);
  });

  it("draws each line as a CartLineItem under an h2 named by the line", () => {
    renderCart();
    const { lines } = pageFixtures.en.cart.full.cart;
    const items = slots("cart-line-item");
    expect(items).toHaveLength(lines.length);
    const list = screen.getByRole("list", { name: catalogs.en.templates.cart.lines });
    for (const [i, line] of lines.entries()) {
      const title = within(items[i] as HTMLElement).getByRole("heading", { level: 2 });
      expect(title.textContent).toBe(line.title);
      expect(within(title).getByRole("link").getAttribute("href")).toBe(line.href);
      expect(list.contains(items[i] as HTMLElement)).toBe(true);
    }
    expect(slot("cart-lines")).toBe(list);
  });

  it("posts the lines' forms and the codes' forms to the actions it was given", () => {
    renderCart("en", "full", {
      updateAction: "/cart/update",
      removeAction: "/cart/remove",
      applyCodeAction: "/cart/code",
      removeCodeAction: "/cart/code/remove",
    });
    const lines = pageFixtures.en.cart.full.cart.lines;
    const updates = slots("cart-line-item-update");
    const removes = slots("cart-line-item-remove");
    expect(updates).toHaveLength(lines.length);
    expect(removes).toHaveLength(lines.length);
    for (const form of updates) expect(form.getAttribute("action")).toBe("/cart/update");
    for (const form of removes) expect(form.getAttribute("action")).toBe("/cart/remove");
    for (const form of slots("cart-line-item-update-fallback")) {
      expect(form.getAttribute("action")).toBe("/cart/update");
    }
    expect(slot("promo-code-apply")?.getAttribute("action")).toBe("/cart/code");
    expect(slot("promo-code-remove")?.getAttribute("action")).toBe("/cart/code/remove");
    for (const [i, line] of lines.entries()) {
      const hidden = (updates[i] as HTMLElement).querySelector<HTMLInputElement>(
        'input[name="lineId"]',
      );
      expect(hidden?.value).toBe(line.id);
    }
  });

  it("sums the cart up in a dl: the subtotal, the discount, the total, in that order", () => {
    renderCart();
    const { cart } = pageFixtures.en.cart.full;
    const rows = slots("order-summary-row");
    expect(rows.map((row) => row.getAttribute("data-kind"))).toEqual([
      "subtotal",
      "discount",
      "total",
    ]);
    expect(slot("cart-summary-rows")?.tagName).toBe("DL");
    expect(rows[0]?.textContent).toContain("$126.00");
    expect(rows[1]?.textContent).toContain("12.60");
    expect(rows[1]?.textContent).toContain(cart.promoCodes.map((promo) => promo.code).join(", "));
    expect(rows[2]?.textContent).toContain("$113.40");
    const summary = slot("cart-summary") as HTMLElement;
    expect(summary.getAttribute("aria-labelledby")).toBe(cartIds("main").summary);
    expect(within(summary).getByRole("heading", { level: 2 }).textContent).toBe(
      catalogs.en.templates.cart.summary,
    );
    expect(summary.textContent).toContain(catalogs.en.templates.cart.note);
  });

  it("leaves the discount row out of a cart without one", () => {
    const { full } = pageFixtures.en.cart;
    renderCart("en", "full", {
      cart: {
        ...full.cart,
        discountTotal: { ...full.cart.discountTotal, amount: 0 },
        promoCodes: [],
      },
    });
    expect(slots("order-summary-row").map((row) => row.getAttribute("data-kind"))).toEqual([
      "subtotal",
      "total",
    ]);
  });

  it("leads on to the checkout, or back to the shop, by the links it was given", () => {
    renderCart();
    const page = pageFixtures.en.cart.full;
    const words = catalogs.en.templates.cart;
    const checkout = slot("cart-checkout") as HTMLElement;
    const keep = slot("cart-continue") as HTMLElement;
    expect(checkout.textContent).toBe(words.checkout);
    expect(checkout.getAttribute("href")).toBe(page.checkoutHref);
    expect(keep.textContent).toBe(words.continue);
    expect(keep.getAttribute("href")).toBe(page.continueHref);
    expect(screen.getByRole("link", { name: words.checkout })).toBe(checkout);
  });

  it("says an empty cart is empty and leads back to the shop, with no summary", () => {
    renderCart("en", "empty");
    const page = pageFixtures.en.cart.empty;
    const words = catalogs.en.templates.cart;
    const empty = slot("empty-state") as HTMLElement;
    expect(within(empty).getByText(words.empty.title)).toBeTruthy();
    expect(within(empty).getByText(words.empty.text)).toBeTruthy();
    const link = within(empty).getByRole("link", { name: words.continue });
    expect(link.getAttribute("href")).toBe(page.continueHref);
    expect(slot("cart-summary")).toBeNull();
    expect(slot("cart-lines")).toBeNull();
    expect(slot("cart-count")).toBeNull();
    expect(slot("cart-checkout")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("says why an action failed in an alert, in the catalog's words", () => {
    const { rerender } = renderCart();
    expect(screen.queryByRole("alert")).toBeNull();
    const errors = catalogs.en.templates.cart.errors;
    const props = {
      ...pageFixtures.en.cart.full,
      copy: cartCopy(catalogs.en),
      locale: "en-US",
      prefetch: false,
    };
    rerender(<CartTemplate {...props} error="rejected" />);
    expect(screen.getByRole("alert").textContent).toBe(errors.rejected);
    rerender(<CartTemplate {...props} error="not-found" />);
    expect(screen.getByRole("alert").textContent).toBe(errors["not-found"]);
    rerender(<CartTemplate {...props} error="unavailable" />);
    expect(screen.getByRole("alert").textContent).toBe(errors.unavailable);
  });

  it("names the most a line may hold in the invalid quantity's alert", () => {
    renderCart("en", "full", { error: "invalid", maxQuantity: 7 });
    expect(screen.getByRole("alert").textContent).toBe(
      "That quantity cannot be used. Enter a number from 1 to 7.",
    );
  });

  it("says the alert over an empty cart as well", () => {
    renderCart("en", "empty", { error: "not-found" });
    expect(screen.getByRole("alert").textContent).toBe(
      catalogs.en.templates.cart.errors["not-found"],
    );
    expect(slot("empty-state")).toBeTruthy();
  });

  it("is a div with another id where the page has its main already", () => {
    renderCart("en", "full", { as: "div", mainId: "cart" });
    expect(screen.queryByRole("main")).toBeNull();
    const root = slot("cart-template") as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.id).toBe("cart");
    expect(slot("cart-summary")?.getAttribute("aria-labelledby")).toBe(cartIds("cart").summary);
    expect(root.querySelector(`#${cartIds("cart").title}`)?.tagName).toBe("H1");
    expect(root.querySelector(`#${cartIds("cart").summary}`)).toBeTruthy();
  });
});
