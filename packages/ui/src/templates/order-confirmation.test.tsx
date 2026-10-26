// Ours (T52, SETUP.md "Cart and checkout (T52)"). The order confirmation template in Testing Library
// and happy-dom: the page's one `<main>` and `<h1>` (the thanks), the order's number, the date it
// was placed in the market's time zone (and the timeline's, the same), the address updates go to,
// the order's parts, the summary open, and the way back to the shop.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, formatDate, formatMessage, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderConfirmationTemplate, orderConfirmationCopy } from "./order-confirmation";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

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

function renderConfirmation(locale: (typeof LOCALES)[number] = "en", props = {}) {
  const page = pageFixtures[locale].orderConfirmation;
  return render(
    <OrderConfirmationTemplate
      {...page}
      copy={orderConfirmationCopy(catalogs[locale])}
      locale="en-US"
      prefetch={false}
      {...props}
    />,
  );
}

/** The fixture's order placed at `placedAt`, with its events at that time too. */
function placedAt(placed: string) {
  const page = pageFixtures.en.orderConfirmation;
  return {
    ...page,
    order: {
      ...page.order,
      placedAt: placed,
      events: page.order.events.map((event) => ({ ...event, at: placed })),
    },
  };
}

// Midday UTC on the 10th: already the 11th in Kiritimati (UTC+14), still the 10th in Pago Pago (UTC-11).
const PLACED = "2026-03-10T12:00:00.000Z";
const PAGE = { dateStyle: "long", timeStyle: "short" } as const;

describe("OrderConfirmationTemplate", () => {
  it.each(LOCALES)("is the page's main with the thanks as its one h1, in %s", (locale) => {
    renderConfirmation(locale);
    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(main.getAttribute("data-slot")).toBe("order-confirmation-template");
    expect(main.getAttribute("data-variant")).toBe("default");
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(catalogs[locale].templates.orderConfirmation.title);
  });

  it("says the order's number and where its updates go", () => {
    renderConfirmation();
    const { order } = pageFixtures.en.orderConfirmation;
    const words = catalogs.en.templates.orderConfirmation;
    expect(slot("order-confirmation-number")?.textContent).toBe(
      formatMessage(words.number, { number: String(order.displayId) }, "en-US"),
    );
    expect(slot("order-confirmation-number")?.textContent).toBe(`Order #${order.displayId}`);
    expect(
      screen.getByText(formatMessage(words.email, { email: order.email }, "en-US")),
    ).toBeTruthy();
  });

  it("says the date it was placed in UTC unless given a time zone", () => {
    renderConfirmation("en", placedAt(PLACED));
    expect(slot("order-confirmation-placed")?.textContent).toBe(
      formatMessage(
        catalogs.en.templates.orderConfirmation.placed,
        { date: formatDate(PLACED, "en-US", { ...PAGE, timeZone: "UTC" }) },
        "en-US",
      ),
    );
    expect(slot("order-confirmation-placed")?.textContent).toContain("March 10, 2026");
  });

  it("says the date in the market's time zone, so the day can differ between two", () => {
    const placed = (timeZone: string) => {
      const { unmount } = renderConfirmation("en", { ...placedAt(PLACED), timeZone });
      const text = slot("order-confirmation-placed")?.textContent ?? "";
      unmount();
      return text;
    };
    const east = placed("Pacific/Kiritimati");
    const west = placed("Pacific/Pago_Pago");
    expect(east).toContain("March 11, 2026");
    expect(west).toContain("March 10, 2026");
    expect(east).not.toBe(west);
    for (const [text, timeZone] of [
      [east, "Pacific/Kiritimati"],
      [west, "Pacific/Pago_Pago"],
    ] as const) {
      expect(text).toBe(
        formatMessage(
          catalogs.en.templates.orderConfirmation.placed,
          { date: formatDate(PLACED, "en-US", { ...PAGE, timeZone }) },
          "en-US",
        ),
      );
    }
  });

  it("draws the timeline's times in the same time zone", () => {
    const times = (timeZone: string) => {
      const { unmount } = renderConfirmation("en", { ...placedAt(PLACED), timeZone });
      const list = [...document.querySelectorAll("time")].map((time) => ({
        datetime: time.getAttribute("datetime"),
        text: time.textContent,
      }));
      unmount();
      return list;
    };
    const east = times("Pacific/Kiritimati");
    const west = times("Pacific/Pago_Pago");
    expect(east.length).toBeGreaterThan(0);
    expect(east).toHaveLength(west.length);
    expect(east.map((time) => time.datetime)).toEqual(west.map((time) => time.datetime));
    expect(east.map((time) => time.text)).not.toEqual(west.map((time) => time.text));
    for (const time of east) expect(time.text).toContain("11");
    for (const time of west) expect(time.text).toContain("10");
  });

  it("draws the address, the delivery and the payment under h2s", () => {
    renderConfirmation();
    const { order } = pageFixtures.en.orderConfirmation;
    const words = catalogs.en.templates.orderConfirmation;
    const shipping = slot("order-confirmation-shipping") as HTMLElement;
    expect(within(shipping).getByRole("heading", { level: 2 }).textContent).toBe(words.shipping);
    expect(shipping.textContent).toContain(order.shippingAddress.lastName);
    const delivery = slot("order-confirmation-delivery") as HTMLElement;
    expect(within(delivery).getByRole("heading", { level: 2 }).textContent).toBe(words.delivery);
    expect(delivery.textContent).toContain(order.shippingMethod.name);
    const payment = slot("order-confirmation-payment") as HTMLElement;
    expect(within(payment).getByRole("heading", { level: 2 }).textContent).toBe(words.payment);
    const { last4, name } = order.payment;
    expect(payment.textContent).toContain(last4 === undefined ? (name ?? "") : `•••• ${last4}`);
  });

  it("says free delivery in words, not a price", () => {
    const page = pageFixtures.en.orderConfirmation;
    renderConfirmation("en", {
      order: {
        ...page.order,
        shippingMethod: {
          ...page.order.shippingMethod,
          price: { ...page.order.shippingMethod.price, amount: 0 },
        },
      },
    });
    expect(slot("order-confirmation-delivery")?.textContent).toContain(
      catalogs.en.molecules.orderSummaryRow.free,
    );
  });

  it("opens the order summary, with the order's lines", () => {
    renderConfirmation();
    const { summary } = pageFixtures.en.orderConfirmation;
    const box = slot("order-summary") as HTMLElement;
    const toggle = within(box).getByRole("button", {
      name: new RegExp(catalogs.en.organisms.orderSummary.hide),
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(slot("order-summary-panel")?.className).not.toContain("hidden");
    expect(box.querySelectorAll('[data-slot="order-summary-item"]')).toHaveLength(
      summary.items.length,
    );
  });

  it("leads back to the shop by the link it was given", () => {
    renderConfirmation();
    const link = slot("order-confirmation-continue") as HTMLElement;
    expect(link.textContent).toBe(catalogs.en.templates.orderConfirmation.continue);
    expect(link.getAttribute("href")).toBe(pageFixtures.en.orderConfirmation.continueHref);
    expect(screen.getByRole("link", { name: link.textContent ?? "" })).toBe(link);
  });

  it("is a div with another id where the page has its main already", () => {
    renderConfirmation("en", { as: "div", mainId: "receipt" });
    expect(screen.queryByRole("main")).toBeNull();
    const root = slot("order-confirmation-template") as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.id).toBe("receipt");
  });
});
