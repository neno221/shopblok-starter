// Ours (T53, SETUP.md "Auth and account (T53)"). The auth template in Testing Library and
// happy-dom: for each of its six screens in every language the page's `<main>`, its one `<h1>` and
// its `data-screen`; the sign-in form's fields, its hidden `next` and the notice above it; the
// registration's new password with its rule; the e-mail to check with the address in its resend form;
// the reset link asked for and sent; the new password with the link's token and address in hidden
// fields; the link that no longer works and the way to start again; and the failures a form draws,
// the form's as an alert and a field's linked to its input.
import { pageFixtures } from "@shopblok/fixtures";
import { catalogs, formatMessage, LOCALES } from "@shopblok/i18n";
import { AuthNotice } from "@shopblok/registry/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthTemplate, authCopy, PASSWORD_MIN } from "./auth";

vi.mock("next/link", async () =>
  (await import("../test-support/next-link-stand-in")).nextLinkStandIn(),
);

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);

type Locale = (typeof LOCALES)[number];
type Pages = (typeof pageFixtures)["en"]["auth"];

function renderAuth(locale: Locale, page: Pages[keyof Pages], props = {}) {
  return render(
    <AuthTemplate
      {...page}
      copy={authCopy(catalogs[locale])}
      locale="en-US"
      prefetch={false}
      {...props}
    />,
  );
}

/** The fixture's sign-in page with its screen changed. */
function login(change: Record<string, unknown>) {
  const page = pageFixtures.en.auth.login;
  return { ...page, screen: { ...page.screen, ...change } } as Pages["login"];
}

const input = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
const words = catalogs.en.templates.auth;

const SCREENS = [
  ["login", "login", (locale: Locale) => catalogs[locale].templates.auth.login.title],
  ["register", "register", (locale: Locale) => catalogs[locale].templates.auth.register.title],
  [
    "checkEmail",
    "check-email",
    (locale: Locale) => catalogs[locale].templates.auth.checkEmail.title,
  ],
  ["forgot", "forgot", (locale: Locale) => catalogs[locale].templates.auth.forgot.title],
  ["forgotSent", "forgot", (locale: Locale) => catalogs[locale].templates.auth.forgot.title],
  ["reset", "reset", (locale: Locale) => catalogs[locale].templates.auth.reset.title],
  [
    "linkExpired",
    "link-expired",
    (locale: Locale) => catalogs[locale].templates.auth.linkExpired.title,
  ],
] as const;

describe("AuthTemplate", () => {
  for (const [key, kind, title] of SCREENS) {
    it.each(LOCALES)(`is the page's main with one h1 on the ${key} screen, in %s`, (locale) => {
      renderAuth(locale, pageFixtures[locale].auth[key]);
      const main = screen.getByRole("main");
      expect(main.id).toBe("main");
      expect(main.getAttribute("data-slot")).toBe("auth-template");
      expect(main.getAttribute("data-screen")).toBe(kind);
      const h1 = screen.getAllByRole("heading", { level: 1 });
      expect(h1).toHaveLength(1);
      expect(h1[0]?.textContent).toBe(title(locale));
    });
  }

  it("is a div with the given id where the page has its main already", () => {
    renderAuth("en", pageFixtures.en.auth.login, { as: "div", mainId: "sign-in" });
    expect(screen.queryByRole("main")).toBeNull();
    const root = slot("auth-template") as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root.id).toBe("sign-in");
    expect(input("email")?.id).toBe("sign-in-email");
  });

  it("passes prefetch on to its links", () => {
    renderAuth("en", pageFixtures.en.auth.login);
    for (const name of ["auth-forgot", "auth-register"]) {
      expect(slot(name)?.getAttribute("data-prefetch")).toBe("false");
    }
  });

  describe("sign in", () => {
    it("posts the email and the password, each with its autocomplete", () => {
      renderAuth("en", pageFixtures.en.auth.login);
      const form = slot("auth-login") as HTMLFormElement;
      expect(form.tagName).toBe("FORM");
      expect(form.getAttribute("method")).toBe("post");
      expect(form.getAttribute("aria-label")).toBe(words.login.title);
      const email = within(form).getByLabelText(words.fields.email) as HTMLInputElement;
      expect(email.name).toBe("email");
      expect(email.type).toBe("email");
      expect(email.required).toBe(true);
      expect(email.getAttribute("autocomplete")).toBe("username");
      const password = within(form).getByLabelText(words.fields.password) as HTMLInputElement;
      expect(password.name).toBe("password");
      expect(password.type).toBe("password");
      expect(password.required).toBe(true);
      expect(password.getAttribute("autocomplete")).toBe("current-password");
      expect(password.hasAttribute("minlength")).toBe(false);
      expect(within(form).getByRole("button", { name: words.login.submit })).toBeTruthy();
    });

    it("holds the address it was given", () => {
      renderAuth("en", pageFixtures.en.auth.verified);
      expect(input("email")?.value).toBe(pageFixtures.en.auth.verified.screen["email" as never]);
      expect(input("email")?.value).not.toBe("");
    });

    it("carries next in a hidden field only when given", () => {
      const { unmount } = renderAuth("en", pageFixtures.en.auth.login);
      expect(input("next")).toBeNull();
      unmount();
      renderAuth("en", login({ next: "/us/account/orders" }));
      const next = input("next") as HTMLInputElement;
      expect(next.type).toBe("hidden");
      expect(next.value).toBe("/us/account/orders");
      expect(slot("auth-login")?.contains(next)).toBe(true);
    });

    it("says no notice unless there is one", () => {
      renderAuth("en", pageFixtures.en.auth.login);
      expect(screen.queryByRole("status")).toBeNull();
      expect(slot("auth-notice")).toBeNull();
    });

    it.each(AuthNotice.options)("says the %s notice as a status above the form", (notice) => {
      renderAuth("en", login({ notice }));
      const status = screen.getByRole("status");
      expect(status.textContent).toBe(words.login.notices[notice]);
      expect(status.getAttribute("data-slot")).toBe("auth-notice");
      const form = slot("auth-login") as HTMLElement;
      expect(status.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("links to resetting the password and to registering", () => {
      const page = pageFixtures.en.auth.login;
      renderAuth("en", page);
      const forgot = screen.getByRole("link", { name: words.login.forgot });
      expect(forgot.getAttribute("href")).toBe(page.screen["forgotHref" as never]);
      const register = screen.getByRole("link", { name: words.login.register });
      expect(register.getAttribute("href")).toBe(page.screen["registerHref" as never]);
    });

    it("says the form's error as an alert", () => {
      renderAuth("en", pageFixtures.en.auth.login, { errors: { form: "credentials" } });
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toBe(words.formErrors.credentials);
      expect(alert.getAttribute("data-slot")).toBe("auth-error");
    });

    it("says no alert unless the form failed", () => {
      renderAuth("en", pageFixtures.en.auth.login);
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("links a field's error to its input, and marks the input invalid", () => {
      renderAuth("en", pageFixtures.en.auth.login, {
        errors: { fields: { email: "pattern", password: "required" } },
      });
      const email = input("email") as HTMLInputElement;
      expect(email.getAttribute("aria-invalid")).toBe("true");
      const emailError = document.getElementById(email.getAttribute("aria-describedby") ?? "");
      expect(emailError?.textContent).toBe(words.errors.pattern);
      const password = input("password") as HTMLInputElement;
      expect(password.getAttribute("aria-invalid")).toBe("true");
      const passwordError = document.getElementById(
        password.getAttribute("aria-describedby") ?? "",
      );
      expect(passwordError?.textContent).toBe(
        formatMessage(words.errors.required, { field: words.fields.password }, "en-US"),
      );
    });

    it("marks nothing invalid without an error", () => {
      renderAuth("en", pageFixtures.en.auth.login);
      expect(input("email")?.hasAttribute("aria-invalid")).toBe(false);
      expect(input("email")?.hasAttribute("aria-describedby")).toBe(false);
    });
  });

  describe("register", () => {
    it("asks for a new password of at least eight characters, with its rule", () => {
      expect(PASSWORD_MIN).toBe(8);
      renderAuth("en", pageFixtures.en.auth.register);
      const password = input("password") as HTMLInputElement;
      expect(password.getAttribute("autocomplete")).toBe("new-password");
      expect(password.minLength).toBe(8);
      expect(password.required).toBe(true);
      const label = (password.labels?.[0] as HTMLElement).textContent;
      expect(label).toBe(words.fields.newPassword);
      const hint = formatMessage(words.fields.passwordHint, { min: 8 }, "en-US");
      expect(password.getAttribute("aria-describedby")).toBe(`${password.id}-hint`);
      expect(document.getElementById(`${password.id}-hint`)?.textContent).toBe(hint);
    });

    it("asks for the name and an optional phone, with their autocompletes", () => {
      renderAuth("en", pageFixtures.en.auth.register);
      expect(input("email")?.getAttribute("autocomplete")).toBe("email");
      expect(input("firstName")?.getAttribute("autocomplete")).toBe("given-name");
      expect(input("firstName")?.required).toBe(true);
      expect(input("lastName")?.getAttribute("autocomplete")).toBe("family-name");
      expect(input("lastName")?.required).toBe(true);
      const phone = input("phone") as HTMLInputElement;
      expect(phone.getAttribute("autocomplete")).toBe("tel");
      expect(phone.required).toBe(false);
      expect((phone.labels?.[0] as HTMLElement).textContent).toContain(words.fields.optional);
    });

    it("holds what was typed, and links to signing in", () => {
      const page = pageFixtures.en.auth.register;
      renderAuth("en", {
        ...page,
        screen: {
          ...page.screen,
          values: { email: "a@b.co", firstName: "Ada", lastName: "Lovelace", phone: "123" },
        },
      } as Pages["register"]);
      expect(input("email")?.value).toBe("a@b.co");
      expect(input("firstName")?.value).toBe("Ada");
      expect(input("lastName")?.value).toBe("Lovelace");
      expect(input("phone")?.value).toBe("123");
      expect(screen.getByRole("link", { name: words.register.login }).getAttribute("href")).toBe(
        page.screen["loginHref" as never],
      );
    });

    it("links the error before the hint in aria-describedby", () => {
      renderAuth("en", pageFixtures.en.auth.register, {
        errors: { fields: { password: "short" } },
      });
      const password = input("password") as HTMLInputElement;
      expect(password.getAttribute("aria-invalid")).toBe("true");
      expect(password.getAttribute("aria-describedby")).toBe(
        `${password.id}-error ${password.id}-hint`,
      );
      expect(document.getElementById(`${password.id}-error`)?.textContent).toBe(
        formatMessage(words.errors.short, { min: 8 }, "en-US"),
      );
    });

    it("names the field in a required or invalid error", () => {
      renderAuth("en", pageFixtures.en.auth.register, {
        errors: { fields: { firstName: "required", lastName: "invalid" } },
      });
      const describedBy = (name: string) =>
        document.getElementById(input(name)?.getAttribute("aria-describedby") ?? "")?.textContent;
      expect(describedBy("firstName")).toBe(
        formatMessage(words.errors.required, { field: words.fields.firstName }, "en-US"),
      );
      expect(describedBy("lastName")).toBe(
        formatMessage(words.errors.invalid, { field: words.fields.lastName }, "en-US"),
      );
    });

    it("says the form's error as an alert", () => {
      renderAuth("en", pageFixtures.en.auth.register, { errors: { form: "exists" } });
      expect(screen.getByRole("alert").textContent).toBe(words.formErrors.exists);
    });
  });

  describe("check your email", () => {
    it("draws VerificationNotice with the address in a hidden field of its resend form", () => {
      const page = pageFixtures.en.auth.checkEmail;
      renderAuth("en", page);
      const notice = slot("verification-notice") as HTMLFormElement;
      expect(notice.tagName).toBe("FORM");
      const email = (page.screen as { verification: { email: string } }).verification.email;
      const hidden = notice.querySelector<HTMLInputElement>('input[name="email"]');
      expect(hidden?.type).toBe("hidden");
      expect(hidden?.value).toBe(email);
      expect(slot("verification-notice-email")?.textContent).toBe(email);
      expect(within(notice).getByRole("heading", { level: 2 })).toBeTruthy();
    });

    it("passes the resend's status on, and links back to signing in", () => {
      renderAuth("en", pageFixtures.en.auth.checkEmail, { verificationStatus: "sending" });
      expect(slot("verification-notice")?.getAttribute("data-status")).toBe("sending");
      const back = screen.getByRole("link", { name: words.checkEmail.back });
      expect(back.getAttribute("href")).toBe(
        pageFixtures.en.auth.checkEmail.screen["loginHref" as never],
      );
    });
  });

  describe("forgot", () => {
    it("asks for the address in a form, with the lead", () => {
      const page = pageFixtures.en.auth.forgot;
      renderAuth("en", page);
      const form = slot("auth-forgot-form") as HTMLFormElement;
      expect(form.getAttribute("method")).toBe("post");
      expect((within(form).getByLabelText(words.fields.email) as HTMLInputElement).name).toBe(
        "email",
      );
      expect(within(form).getByRole("button", { name: words.forgot.submit })).toBeTruthy();
      expect(screen.getByText(words.forgot.lead)).toBeTruthy();
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.getByRole("link", { name: words.forgot.back }).getAttribute("href")).toBe(
        page.screen["loginHref" as never],
      );
    });

    it("says the link is on its way, with the address, and draws no form, when sent", () => {
      const page = pageFixtures.en.auth.forgotSent;
      renderAuth("en", page);
      const status = screen.getByRole("status");
      expect(status.getAttribute("data-slot")).toBe("auth-sent");
      expect(status.textContent).toBe(
        formatMessage(words.forgot.sent, { email: page.screen["email" as never] }, "en-US"),
      );
      expect(status.textContent).toContain(pageFixtures.en.orderConfirmation.order.email);
      expect(document.querySelector("form")).toBeNull();
      expect(screen.queryByText(words.forgot.lead)).toBeNull();
      expect(screen.getByRole("link", { name: words.forgot.back })).toBeTruthy();
    });

    it("says the form's error as an alert", () => {
      renderAuth("en", pageFixtures.en.auth.forgot, { errors: { form: "unavailable" } });
      expect(screen.getByRole("alert").textContent).toBe(words.formErrors.unavailable);
    });
  });

  describe("reset", () => {
    it("carries the address and the token in hidden fields", () => {
      const page = pageFixtures.en.auth.reset;
      renderAuth("en", page);
      const form = slot("auth-reset-form") as HTMLFormElement;
      const hidden = [...form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')];
      expect(hidden.map((each) => [each.name, each.value])).toEqual([
        ["email", page.screen["email" as never]],
        ["token", "reset-token"],
      ]);
    });

    it("asks for a new password and says whose it is", () => {
      const page = pageFixtures.en.auth.reset;
      renderAuth("en", page);
      const password = input("password") as HTMLInputElement;
      expect(password.getAttribute("autocomplete")).toBe("new-password");
      expect(password.minLength).toBe(8);
      expect(password.type).toBe("password");
      expect(
        screen.getByText(
          formatMessage(words.reset.lead, { email: page.screen["email" as never] }, "en-US"),
        ),
      ).toBeTruthy();
      expect(screen.getByRole("button", { name: words.reset.submit })).toBeTruthy();
    });

    it("shows a password manager the address, but not the shopper", () => {
      renderAuth("en", pageFixtures.en.auth.reset);
      const username = document.querySelector<HTMLInputElement>('input[autocomplete="username"]');
      expect(username?.hidden).toBe(true);
      expect(username?.readOnly).toBe(true);
      expect(screen.queryByRole("textbox")).toBeNull();
    });
  });

  describe("link expired", () => {
    it.each(["verify", "reset"] as const)(
      "links to the way to start again for a %s link",
      (link) => {
        const page = pageFixtures.en.auth.linkExpired;
        renderAuth("en", {
          ...page,
          screen: { ...page.screen, link, restartHref: `/us/restart-${link}` },
        } as Pages["linkExpired"]);
        expect(screen.getByText(words.linkExpired[link])).toBeTruthy();
        const restart = screen.getByRole("link", { name: words.linkExpired.restart[link] });
        expect(restart.getAttribute("href")).toBe(`/us/restart-${link}`);
        expect(restart.getAttribute("data-slot")).toBe("auth-restart");
        expect(document.querySelector("form")).toBeNull();
      },
    );
  });
});
