// Ours (T53, SETUP.md "Auth and account (T53)"). The account template in Testing Library and
// happy-dom: for each of its nine screens in every language the page's `<main>`, its one `<h1>` and
// its `data-screen`; AccountNav beside it, the current page marked and the sign-out form only with
// its action; the overview's greeting, recent orders and the way to all of them; the orders' pager
// only past one page, with its links; the order's number, its date in the market's time zone and the
// way to return it; the address form with the default-shipping checkbox inside it; the returns' own
// empty words; the return form or, once sent, the status; and the profile's fixed e-mail, its name
// fields, the saved status and a field's error.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, formatDate, formatMessage, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountTemplate, accountCopy } from "./account";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

const NOW = "2026-10-26T12:00:00.000Z";

type Locale = (typeof LOCALES)[number];
type Pages = (typeof pageFixtures)["en"]["account"];
type Page = Pages[keyof Pages];

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

function renderAccount(locale: Locale, page: Page, props = {}) {
  return render(
    <AccountTemplate
      {...page}
      copy={accountCopy(catalogs[locale])}
      locale="en-US"
      now={NOW}
      prefetch={false}
      {...props}
    />,
  );
}

/** The fixture's page with its screen changed; `Page` is a union of screens, so a cast. */
function withScreen(page: Page, change: Record<string, unknown>) {
  return { ...page, screen: { ...page.screen, ...change } } as Page;
}

const words = catalogs.en.templates.account;
const pages = pageFixtures.en.account;
const input = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`);

const SCREENS = [
  [
    "overview",
    "overview",
    (locale: Locale, page: Page) =>
      formatMessage(
        catalogs[locale].templates.account.overview.greeting,
        { name: "firstName" in page.screen ? (page.screen.firstName ?? "") : "" },
        "en-US",
      ),
  ],
  ["orders", "orders", (locale: Locale) => catalogs[locale].templates.account.orders.title],
  [
    "order",
    "order",
    (locale: Locale, page: Page) =>
      formatMessage(
        catalogs[locale].templates.account.order.title,
        { number: String("order" in page.screen ? page.screen.order.displayId : "") },
        "en-US",
      ),
  ],
  [
    "addresses",
    "addresses",
    (locale: Locale) => catalogs[locale].templates.account.addresses.title,
  ],
  ["address", "address", (locale: Locale) => catalogs[locale].templates.account.address.titleEdit],
  [
    "paymentMethods",
    "payment-methods",
    (locale: Locale) => catalogs[locale].templates.account.paymentMethods.title,
  ],
  ["returns", "returns", (locale: Locale) => catalogs[locale].templates.account.returns.title],
  ["return", "return", (locale: Locale) => catalogs[locale].templates.account.return.title],
  ["profile", "profile", (locale: Locale) => catalogs[locale].templates.account.profile.title],
] as const;

describe("AccountTemplate", () => {
  for (const [key, kind, title] of SCREENS) {
    it.each(LOCALES)(`is the page's main with one h1 on the ${key} screen, in %s`, (locale) => {
      const page = pageFixtures[locale].account[key];
      renderAccount(locale, page);
      const main = screen.getByRole("main");
      expect(main.id).toBe("main");
      expect(main.getAttribute("data-slot")).toBe("account-template");
      expect(main.getAttribute("data-screen")).toBe(kind);
      const h1 = screen.getAllByRole("heading", { level: 1 });
      expect(h1).toHaveLength(1);
      expect(h1[0]?.textContent).toBe(title(locale, page));
      expect(main.contains(slot("account-nav"))).toBe(true);
    });
  }

  it("is a div with the given id where the page has its main already", () => {
    renderAccount("en", pages.profile, { as: "div", mainId: "me" });
    expect(screen.queryByRole("main")).toBeNull();
    const root = slot("account-template") as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.id).toBe("me");
    expect(input("firstName")?.id).toBe("me-first-name");
  });

  describe("navigation", () => {
    it.each(SCREENS)("marks the page of the %s screen as the current one", (key) => {
      const page = pageFixtures.en.account[key];
      renderAccount("en", page);
      const links = within(slot("account-nav") as HTMLElement).getAllByRole("link");
      const current = links.filter((link) => link.getAttribute("aria-current") === "page");
      expect(current).toHaveLength(1);
      const item = page.nav.items.find((each) => each.id === page.nav.current);
      expect(item).toBeDefined();
      expect(current[0]?.textContent).toBe(item?.label);
      expect(current[0]?.getAttribute("href")).toBe(item?.href);
    });

    it("draws no sign-out form without an action", () => {
      renderAccount("en", pages.overview);
      expect(slot("account-nav-sign-out")).toBeNull();
    });

    it("draws the sign-out form with the action it was given", () => {
      renderAccount("en", pages.overview, { actions: { signOut: "/sign-out" } });
      const form = slot("account-nav-sign-out") as HTMLFormElement;
      expect(form.tagName).toBe("FORM");
      expect(form.getAttribute("action")).toBe("/sign-out");
      expect(form.getAttribute("method")).toBe("post");
      expect(
        within(form).getByRole("button", { name: catalogs.en.organisms.accountNav.signOut }),
      ).toBeTruthy();
    });
  });

  describe("overview", () => {
    it("greets the customer by first name, and says who is signed in", () => {
      renderAccount("en", pages.overview);
      const { screen: overview } = pages.overview;
      if (overview.kind !== "overview") throw new Error("not the overview");
      expect(overview.firstName).toBeDefined();
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        formatMessage(words.overview.greeting, { name: overview.firstName ?? "" }, "en-US"),
      );
      expect(
        screen.getByText(
          formatMessage(words.overview.signedInAs, { email: overview.email }, "en-US"),
        ),
      ).toBeTruthy();
    });

    it("says the plain title without a first name", () => {
      renderAccount("en", withScreen(pages.overview, { firstName: undefined }));
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(words.overview.title);
    });

    it("lists the recent orders and links to all of them", () => {
      renderAccount("en", pages.overview);
      const { screen: overview } = pages.overview;
      if (overview.kind !== "overview") throw new Error("not the overview");
      expect(overview.recent.orders.length).toBeGreaterThan(0);
      const recent = slot("account-recent") as HTMLElement;
      expect(within(recent).getByRole("heading", { level: 2 }).textContent).toBe(
        words.overview.recent,
      );
      expect(recent.querySelectorAll('[data-slot="order-table-row"]')).toHaveLength(
        overview.recent.orders.length,
      );
      const all = slot("account-all-orders") as HTMLElement;
      expect(all.textContent).toBe(words.overview.allOrders);
      expect(all.getAttribute("href")).toBe(overview.ordersHref);
    });

    it("links to no more orders when there are none", () => {
      const { screen: overview } = pages.overview;
      if (overview.kind !== "overview") throw new Error("not the overview");
      renderAccount(
        "en",
        withScreen(pages.overview, { recent: { ...overview.recent, orders: [] } }),
      );
      expect(slot("account-all-orders")).toBeNull();
      expect(slot("order-table")?.hasAttribute("data-empty")).toBe(true);
      expect(screen.getByText(catalogs.en.organisms.orderTable.emptyTitle)).toBeTruthy();
    });

    it("links to the addresses, the profile and the claim of a guest order", () => {
      renderAccount("en", pages.overview);
      const { screen: overview } = pages.overview;
      if (overview.kind !== "overview") throw new Error("not the overview");
      const shortcuts = [...document.querySelectorAll('[data-slot="account-shortcut"]')];
      expect(shortcuts.map((link) => link.getAttribute("href"))).toEqual([
        overview.addressesHref,
        overview.profileHref,
        overview.lookupHref,
      ]);
      expect(shortcuts.map((link) => link.querySelector("span span")?.textContent)).toEqual([
        words.overview.addresses,
        words.overview.profile,
        words.overview.lookup,
      ]);
    });
  });

  describe("orders", () => {
    function ordersWith(pageCount: number, page: number) {
      return withScreen(pages.orders, { page: { page, pageCount } });
    }
    const pagerHrefs = () =>
      [...(slot("pagination") as HTMLElement).querySelectorAll("a")].map((a) =>
        a.getAttribute("href"),
      );

    it("draws the orders and the way to claim a guest order, and no pager for one page", () => {
      renderAccount("en", pages.orders);
      const { screen: orders } = pages.orders;
      if (orders.kind !== "orders") throw new Error("not the orders");
      expect(document.querySelectorAll('[data-slot="order-table-row"]')).toHaveLength(
        orders.table.orders.length,
      );
      expect(slot("pagination")).toBeNull();
      const lookup = slot("account-lookup") as HTMLElement;
      expect(lookup.textContent).toBe(words.orders.lookup);
      expect(lookup.getAttribute("href")).toBe(orders.lookupHref);
    });

    it("draws the pager from the second page on, linking page 1 to pageHref and the rest by ?page=n", () => {
      renderAccount("en", ordersWith(3, 2));
      const { screen: orders } = pages.orders;
      if (orders.kind !== "orders") throw new Error("not the orders");
      const base = orders.pageHref;
      const hrefs = pagerHrefs();
      expect(hrefs).toContain(base);
      expect(hrefs).toContain(`${base}?page=3`);
      expect(hrefs).not.toContain(`${base}?page=1`);
      // Previous and the first page lead to page 1, the current page is a link of its own, and the
      // last page and next lead to page 3.
      expect(hrefs).toEqual([base, base, `${base}?page=2`, `${base}?page=3`, `${base}?page=3`]);
    });

    it("draws the pager on the first page too, once there are several", () => {
      renderAccount("en", ordersWith(3, 1));
      expect(slot("pagination")).not.toBeNull();
      const base = (pages.orders.screen as { pageHref: string }).pageHref;
      expect(pagerHrefs()).toContain(`${base}?page=2`);
      expect(pagerHrefs()).toContain(`${base}?page=3`);
    });
  });

  describe("order", () => {
    // Evening on the 10th UTC is already the 11th in Tokyo (UTC+9).
    const PLACED = "2026-03-10T20:00:00.000Z";
    function placed(placedAt = PLACED) {
      const { screen: order } = pages.order;
      if (order.kind !== "order") throw new Error("not the order");
      return withScreen(pages.order, { order: { ...order.order, placedAt } });
    }

    it("says the order's number and where it went", () => {
      renderAccount("en", pages.order);
      const { screen: order } = pages.order;
      if (order.kind !== "order") throw new Error("not the order");
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        formatMessage(words.order.title, { number: String(order.order.displayId) }, "en-US"),
      );
      const shipping = slot("account-order-shipping") as HTMLElement;
      expect(within(shipping).getByRole("heading", { level: 2 }).textContent).toBe(
        words.order.shipping,
      );
      expect(shipping.textContent).toContain(order.order.shippingAddress.lastName);
      expect(slot("account-order-delivery")?.textContent).toContain(
        order.order.shippingMethod.name,
      );
      expect(slot("account-order-payment")?.textContent).toContain(
        `•••• ${order.order.payment.last4}`,
      );
    });

    it("says the date it was placed in UTC unless given a time zone", () => {
      renderAccount("en", placed());
      expect(slot("account-order-placed")?.textContent).toBe(
        formatMessage(
          words.order.placed,
          {
            date: formatDate(PLACED, "en-US", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "UTC",
            }),
          },
          "en-US",
        ),
      );
      expect(slot("account-order-placed")?.textContent).toContain("March 10, 2026");
    });

    it("says the date in the market's time zone, so the day can differ between two", () => {
      const said = (timeZone: string) => {
        const { unmount } = renderAccount("en", placed(), { timeZone });
        const text = slot("account-order-placed")?.textContent ?? "";
        unmount();
        return text;
      };
      const tokyo = said("Asia/Tokyo");
      const utc = said("UTC");
      expect(tokyo).toContain("March 11, 2026");
      expect(utc).toContain("March 10, 2026");
      expect(tokyo).toBe(
        formatMessage(
          words.order.placed,
          {
            date: formatDate(PLACED, "en-US", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "Asia/Tokyo",
            }),
          },
          "en-US",
        ),
      );
    });

    it("draws the history and the summary, open", () => {
      renderAccount("en", pages.order);
      expect(slot("order-summary")).not.toBeNull();
      expect(
        within(slot("order-summary") as HTMLElement)
          .getAllByRole("button")[0]
          ?.getAttribute("aria-expanded"),
      ).toBe("true");
      expect(document.querySelectorAll("time").length).toBeGreaterThan(0);
    });

    it("links to the return form only when it was given", () => {
      const { unmount } = renderAccount("en", pages.order);
      const { screen: order } = pages.order;
      if (order.kind !== "order") throw new Error("not the order");
      const link = slot("account-order-return") as HTMLElement;
      expect(link.textContent).toBe(words.order.return);
      expect(link.getAttribute("href")).toBe(order.returnHref);
      expect(slot("account-back")?.getAttribute("href")).toBe(order.backHref);
      unmount();
      renderAccount("en", withScreen(pages.order, { returnHref: undefined }));
      expect(slot("account-order-return")).toBeNull();
      expect(slot("account-back")?.textContent).toBe(words.order.back);
    });
  });

  describe("addresses", () => {
    it("draws the address book with the form's error as an alert", () => {
      renderAccount("en", pages.addresses, { errors: { form: "not-found" } });
      expect(slot("address-book")).not.toBeNull();
      const alert = screen.getByRole("alert");
      expect(alert.getAttribute("data-slot")).toBe("account-error");
      expect(alert.textContent).toBe(words.formErrors["not-found"]);
    });

    it("draws no alert unless the form failed", () => {
      renderAccount("en", pages.addresses);
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("address", () => {
    const checkbox = () => input("isDefaultShipping") as HTMLInputElement;

    it("puts the default-shipping checkbox inside the address form", () => {
      renderAccount("en", pages.address);
      const form = slot("address-form") as HTMLFormElement;
      expect(form.contains(checkbox())).toBe(true);
      expect(checkbox().type).toBe("checkbox");
      expect(checkbox().value).toBe("true");
      expect(form.contains(screen.getByText(words.address.defaultShipping))).toBe(true);
      expect(checkbox().labels?.[0]?.textContent).toBe(words.address.defaultShipping);
    });

    it.each([true, false])("checks it as isDefaultShipping is %s", (isDefaultShipping) => {
      renderAccount("en", withScreen(pages.address, { isDefaultShipping }));
      expect(checkbox().checked).toBe(isDefaultShipping);
    });

    it("posts the address's id for an existing address, and the change's title", () => {
      renderAccount("en", pages.address);
      const { screen: address } = pages.address;
      if (address.kind !== "address") throw new Error("not the address");
      expect(address.addressId).toBeDefined();
      expect(input("addressId")?.value).toBe(address.addressId);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(words.address.titleEdit);
    });

    it("posts no id for a new address, and says so in the title", () => {
      const { screen: address } = pages.address;
      if (address.kind !== "address") throw new Error("not the address");
      renderAccount(
        "en",
        withScreen(pages.address, {
          addressId: undefined,
          address: {
            ...address.address,
            values: { countryCode: address.address.values.countryCode },
          },
          isDefaultShipping: false,
        }),
      );
      expect(input("addressId")).toBeNull();
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(words.address.titleNew);
      expect(checkbox().checked).toBe(false);
    });

    it("posts to the action it was given, and links back to the address book", () => {
      renderAccount("en", pages.address, { actions: { saveAddress: "/save" } });
      expect(slot("address-form")?.getAttribute("action")).toBe("/save");
      const { screen: address } = pages.address;
      if (address.kind !== "address") throw new Error("not the address");
      expect(slot("account-back")?.getAttribute("href")).toBe(address.backHref);
    });
  });

  describe("payment methods", () => {
    it("says why there are no cards, until the shop can save them", () => {
      renderAccount("en", pages.paymentMethods);
      expect(slot("payment-methods-manager")).not.toBeNull();
      expect(screen.getByText(words.paymentMethods.note)).toBeTruthy();
    });
  });

  describe("returns", () => {
    it("lists the orders to return, with the lead", () => {
      renderAccount("en", pages.returns);
      const { screen: returns } = pages.returns;
      if (returns.kind !== "returns") throw new Error("not the returns");
      expect(returns.table.orders.length).toBeGreaterThan(0);
      expect(screen.getByText(words.returns.lead)).toBeTruthy();
      const views = [...document.querySelectorAll('[data-slot="order-table-view"]')];
      expect(views.map((link) => link.getAttribute("href"))).toEqual(
        expect.arrayContaining(returns.table.orders.map((order) => order.href)),
      );
    });

    it("says the returns' own words with no orders, not the order table's", () => {
      const { screen: returns } = pages.returns;
      if (returns.kind !== "returns") throw new Error("not the returns");
      renderAccount("en", withScreen(pages.returns, { table: { ...returns.table, orders: [] } }));
      const empty = slot("order-table") as HTMLElement;
      expect(empty.hasAttribute("data-empty")).toBe(true);
      expect(within(empty).getByRole("heading", { level: 2 }).textContent).toBe(
        words.returns.emptyTitle,
      );
      expect(empty.textContent).toContain(words.returns.emptyText);
      expect(empty.textContent).toContain(words.returns.emptyAction);
      expect(empty.textContent).not.toContain(catalogs.en.organisms.orderTable.emptyTitle);
      expect(screen.queryByText(words.returns.lead)).toBeNull();
    });
  });

  describe("return", () => {
    it("draws the return form and a way back", () => {
      renderAccount("en", pages.return, { actions: { requestReturn: "/return" } });
      const form = slot("return-request-form") as HTMLFormElement;
      expect(form.getAttribute("action")).toBe("/return");
      expect(slot("account-return-sent")).toBeNull();
      const { screen: ret } = pages.return;
      if (ret.kind !== "return") throw new Error("not the return");
      expect(slot("account-back")?.getAttribute("href")).toBe(ret.backHref);
      expect(slot("account-back")?.textContent).toBe(words.return.back);
    });

    it("says the request was sent, and draws no form, when sent", () => {
      renderAccount("en", withScreen(pages.return, { sent: true }));
      const status = slot("account-return-sent") as HTMLElement;
      expect(status.getAttribute("role")).toBe("status");
      expect(status.textContent).toBe(words.return.sent);
      expect(slot("return-request-form")).toBeNull();
      expect(document.querySelector("form")).toBeNull();
      expect(slot("account-back")).not.toBeNull();
    });

    it("says the form's error as an alert above the form", () => {
      renderAccount("en", pages.return, { errors: { form: "rejected" } });
      expect(screen.getByRole("alert").textContent).toBe(words.formErrors.rejected);
    });

    it("says no alert once sent", () => {
      renderAccount("en", withScreen(pages.return, { sent: true }), {
        errors: { form: "rejected" },
      });
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("profile", () => {
    it("shows the e-mail as text, not as a field", () => {
      renderAccount("en", pages.profile);
      const { screen: profile } = pages.profile;
      if (profile.kind !== "profile") throw new Error("not the profile");
      expect(slot("account-profile-email")?.textContent).toBe(profile.email);
      expect(input("email")).toBeNull();
      expect(document.querySelector('input[type="email"]')).toBeNull();
      expect(screen.getByText(words.profile.emailNote)).toBeTruthy();
    });

    it("asks for the name and an optional phone, holding what is saved", () => {
      renderAccount("en", pages.profile);
      const { screen: profile } = pages.profile;
      if (profile.kind !== "profile") throw new Error("not the profile");
      const form = slot("account-profile-form") as HTMLFormElement;
      expect(form.getAttribute("method")).toBe("post");
      expect(form.getAttribute("aria-label")).toBe(words.profile.title);
      expect(input("firstName")?.getAttribute("autocomplete")).toBe("given-name");
      expect(input("firstName")?.required).toBe(true);
      expect(input("firstName")?.value).toBe(profile.values.firstName);
      expect(input("lastName")?.getAttribute("autocomplete")).toBe("family-name");
      expect(input("lastName")?.required).toBe(true);
      expect(input("lastName")?.value).toBe(profile.values.lastName);
      expect(input("phone")?.getAttribute("autocomplete")).toBe("tel");
      expect(input("phone")?.required).toBe(false);
      expect(input("phone")?.value).toBe(profile.values.phone);
      expect(within(form).getByRole("button", { name: words.profile.submit })).toBeTruthy();
    });

    it("says the changes are saved only when they are", () => {
      const { unmount } = renderAccount("en", pages.profile);
      expect(slot("account-profile-saved")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
      unmount();
      renderAccount("en", withScreen(pages.profile, { saved: true }));
      const status = screen.getByRole("status");
      expect(status.getAttribute("data-slot")).toBe("account-profile-saved");
      expect(status.textContent).toBe(words.profile.saved);
    });

    it("links a field's error to its input, and marks the input invalid", () => {
      renderAccount("en", pages.profile, {
        errors: { profile: { firstName: "required", phone: "invalid" } },
      });
      const first = input("firstName") as HTMLInputElement;
      expect(first.getAttribute("aria-invalid")).toBe("true");
      expect(first.getAttribute("aria-describedby")).toBe(`${first.id}-error`);
      expect(document.getElementById(`${first.id}-error`)?.textContent).toBe(
        formatMessage(
          catalogs.en.templates.auth.errors.required,
          { field: catalogs.en.templates.auth.fields.firstName },
          "en-US",
        ),
      );
      const phone = input("phone") as HTMLInputElement;
      expect(phone.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById(`${phone.id}-error`)?.textContent).toBe(
        formatMessage(
          catalogs.en.templates.auth.errors.invalid,
          { field: catalogs.en.templates.auth.fields.phone },
          "en-US",
        ),
      );
      expect(input("lastName")?.hasAttribute("aria-invalid")).toBe(false);
    });

    it("says the form's error as an alert", () => {
      renderAccount("en", pages.profile, { errors: { form: "unauthorized" } });
      expect(screen.getByRole("alert").textContent).toBe(words.formErrors.unauthorized);
    });

    it("posts to the action it was given", () => {
      renderAccount("en", pages.profile, { actions: { saveProfile: "/profile" } });
      const form = slot("account-profile-form") as HTMLFormElement;
      expect(form.getAttribute("action")).toBe("/profile");
      expect(form.getAttribute("method")).toBe("post");
    });
  });
});
