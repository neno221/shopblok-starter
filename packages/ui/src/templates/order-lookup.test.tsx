// Ours (T53, SETUP.md "Auth and account (T53)"). The guest-order claim template in Testing Library
// and happy-dom: for each of its four screens in every language the page's `<main>`, its one `<h1>`
// and its `data-screen`; the lookup form's number and e-mail fields, the status that a link is on its
// way only once sent, and the errors a field or the form draws; the sign-in's two links; the
// transfer's one form with its two submit buttons, `accept` and `decline`; and the page that says
// what became of the claim, a status for accepted and declined and an alert for failed.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES } from "@shopblok/i18n";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderLookupTemplate, orderLookupCopy } from "./order-lookup";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

type Locale = (typeof LOCALES)[number];
type Pages = (typeof pageFixtures)["en"]["orderLookup"];
type Page = Pages[keyof Pages];

function renderLookup(locale: Locale, page: Page, props = {}) {
  return render(
    <OrderLookupTemplate
      {...page}
      copy={orderLookupCopy(catalogs[locale])}
      locale="en-US"
      prefetch={false}
      {...props}
    />,
  );
}

/** The fixture's page with its screen changed; `Page` is a union of screens, so a cast. */
function withScreen(page: Page, change: Record<string, unknown>) {
  return { ...page, screen: { ...page.screen, ...change } } as Page;
}

const words = catalogs.en.templates.orderLookup;
const pages = pageFixtures.en.orderLookup;
const input = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
/** The first element a field is described by: its error, when it has one. */
const describedBy = (field: HTMLElement | null) =>
  document.getElementById(field?.getAttribute("aria-describedby")?.split(" ")[0] ?? "");

const SCREENS = [
  ["lookup", "lookup"],
  ["sent", "lookup"],
  ["signIn", "sign-in"],
  ["transfer", "transfer"],
  ["accepted", "transfer-done"],
] as const;

describe("OrderLookupTemplate", () => {
  for (const [key, kind] of SCREENS) {
    it.each(LOCALES)(`is the page's main with one h1 on the ${key} screen, in %s`, (locale) => {
      const page = pageFixtures[locale].orderLookup[key];
      renderLookup(locale, page);
      const words = catalogs[locale].templates.orderLookup;
      const main = screen.getByRole("main");
      expect(main.id).toBe("main");
      expect(main.getAttribute("data-slot")).toBe("order-lookup-template");
      expect(main.getAttribute("data-screen")).toBe(kind);
      const h1 = screen.getAllByRole("heading", { level: 1 });
      expect(h1).toHaveLength(1);
      expect(h1[0]?.textContent).toBe(
        page.screen.kind === "transfer"
          ? formatMessage(words.transfer.title, { number: String(page.screen.displayId) }, "en-US")
          : words.title,
      );
    });
  }

  it("is a div with the given id where the page has its main already", () => {
    renderLookup("en", pages.lookup, { as: "div", mainId: "claim" });
    expect(screen.queryByRole("main")).toBeNull();
    const root = slot("order-lookup-template") as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.id).toBe("claim");
    expect(input("number")?.id).toBe("claim-number");
  });

  it("says the order's number in the transfer's title", () => {
    renderLookup("en", pages.transfer);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      `Add order #${pageFixtures.en.orderConfirmation.order.displayId} to an account`,
    );
  });

  describe("lookup", () => {
    it("asks for the order's number and the email, each in a field of its own", () => {
      renderLookup("en", pages.lookup);
      const form = slot("order-lookup-form") as HTMLFormElement;
      expect(form.getAttribute("method")).toBe("post");
      expect(form.getAttribute("aria-label")).toBe(words.title);
      const number = within(form).getByLabelText(words.number) as HTMLInputElement;
      expect(number.name).toBe("number");
      expect(number.inputMode).toBe("numeric");
      expect(number.required).toBe(true);
      expect(number.getAttribute("autocomplete")).toBe("off");
      expect(describedBy(number)?.textContent).toBe(words.numberHint);
      const email = within(form).getByLabelText(words.email) as HTMLInputElement;
      expect(email.name).toBe("email");
      expect(email.type).toBe("email");
      expect(email.inputMode).toBe("email");
      expect(email.required).toBe(true);
      expect(within(form).getByRole("button", { name: words.submit })).toBeTruthy();
      expect(screen.getByText(words.lead)).toBeTruthy();
    });

    it("holds what was typed, and links back to the account", () => {
      renderLookup("en", pages.sent);
      const { screen: lookup } = pages.sent;
      if (lookup.kind !== "lookup") throw new Error("not the lookup");
      expect(lookup.values.number).not.toBe("");
      expect(input("number")?.value).toBe(lookup.values.number);
      expect(input("email")?.value).toBe(lookup.values.email);
      const back = slot("order-lookup-account") as HTMLElement;
      expect(back.textContent).toBe(words.account);
      expect(back.getAttribute("href")).toBe(lookup.accountHref);
    });

    it("says nothing was sent unless it was", () => {
      renderLookup("en", pages.lookup);
      expect(screen.queryByRole("status")).toBeNull();
      expect(slot("order-lookup-sent")).toBeNull();
    });

    it("says the order's address has the link once sent, and keeps the form", () => {
      renderLookup("en", pages.sent);
      const status = screen.getByRole("status");
      expect(status.getAttribute("data-slot")).toBe("order-lookup-sent");
      expect(status.textContent).toBe(words.sent);
      expect(slot("order-lookup-form")).not.toBeNull();
    });

    it("links a field's error to its input, and marks the input invalid", () => {
      renderLookup("en", pages.lookup, { errors: { number: "invalid", email: "pattern" } });
      const number = input("number") as HTMLInputElement;
      expect(number.getAttribute("aria-invalid")).toBe("true");
      expect(number.getAttribute("aria-describedby")).toBe(`${number.id}-error ${number.id}-hint`);
      expect(describedBy(number)?.textContent).toBe(words.errors.number);
      const email = input("email") as HTMLInputElement;
      expect(email.getAttribute("aria-invalid")).toBe("true");
      expect(describedBy(email)?.textContent).toBe(words.errors.pattern);
    });

    it("names the field in a required error", () => {
      renderLookup("en", pages.lookup, { errors: { number: "required", email: "required" } });
      expect(describedBy(input("number"))?.textContent).toBe(
        formatMessage(words.errors.required, { field: words.number }, "en-US"),
      );
      expect(describedBy(input("email"))?.textContent).toBe(
        formatMessage(words.errors.required, { field: words.email }, "en-US"),
      );
    });

    it("marks nothing invalid without an error", () => {
      renderLookup("en", pages.lookup);
      expect(input("number")?.hasAttribute("aria-invalid")).toBe(false);
      expect(input("email")?.hasAttribute("aria-invalid")).toBe(false);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it.each(["mine", "rejected", "unavailable"] as const)(
      "says the %s form error as an alert",
      (form) => {
        renderLookup("en", pages.lookup, { errors: { form } });
        const alert = screen.getByRole("alert");
        expect(alert.getAttribute("data-slot")).toBe("order-lookup-error");
        expect(alert.textContent).toBe(words.formErrors[form]);
      },
    );
  });

  describe("sign in", () => {
    it("says claiming needs an account, and links to signing in and to registering", () => {
      renderLookup("en", pages.signIn);
      const { screen: signIn } = pages.signIn;
      if (signIn.kind !== "sign-in") throw new Error("not the sign-in");
      expect(screen.getByText(words.signIn.text)).toBeTruthy();
      const login = screen.getByRole("link", { name: words.signIn.login });
      expect(login.getAttribute("href")).toBe(signIn.loginHref);
      expect(login.getAttribute("data-prefetch")).toBe("false");
      const register = screen.getByRole("link", { name: words.signIn.register });
      expect(register.getAttribute("href")).toBe(signIn.registerHref);
      expect(document.querySelector("form")).toBeNull();
    });
  });

  describe("transfer", () => {
    it("is one form with two submit buttons named decision, accept and decline", () => {
      renderLookup("en", pages.transfer, { action: "/claim" });
      const forms = document.querySelectorAll("form");
      expect(forms).toHaveLength(1);
      const form = forms[0] as HTMLFormElement;
      expect(form.getAttribute("action")).toBe("/claim");
      expect(form.getAttribute("method")).toBe("post");
      const buttons = within(form).getAllByRole("button") as HTMLButtonElement[];
      expect(buttons.map((button) => [button.type, button.name, button.value])).toEqual([
        ["submit", "decision", "accept"],
        ["submit", "decision", "decline"],
      ]);
      expect(buttons.map((button) => button.textContent)).toEqual([
        words.transfer.accept,
        words.transfer.decline,
      ]);
      expect(screen.getByText(words.transfer.lead)).toBeTruthy();
    });

    it("says the form's error as an alert", () => {
      renderLookup("en", pages.transfer, { errors: { form: "unavailable" } });
      expect(screen.getByRole("alert").textContent).toBe(words.formErrors.unavailable);
    });
  });

  describe("transfer done", () => {
    it.each(["accepted", "declined"] as const)("says %s as a status", (outcome) => {
      renderLookup("en", withScreen(pages.accepted, { outcome }));
      const status = screen.getByRole("status");
      expect(status.getAttribute("data-slot")).toBe("order-transfer-done");
      expect(status.textContent).toBe(words.done[outcome]);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("says failed as an alert", () => {
      renderLookup("en", withScreen(pages.accepted, { outcome: "failed" }));
      const alert = screen.getByRole("alert");
      expect(alert.getAttribute("data-slot")).toBe("order-transfer-failed");
      expect(alert.textContent).toBe(words.done.failed);
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("links to the shop", () => {
      renderLookup("en", pages.accepted);
      const { screen: done } = pages.accepted;
      if (done.kind !== "transfer-done") throw new Error("not the done page");
      const home = slot("order-transfer-home") as HTMLElement;
      expect(home.textContent).toBe(words.done.home);
      expect(home.getAttribute("href")).toBe(done.homeHref);
      expect(document.querySelector("form")).toBeNull();
    });
  });
});
