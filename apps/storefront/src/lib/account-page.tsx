import "server-only";
import type { Messages } from "@shopblok/i18n";
import type { AddressFormErrors } from "@shopblok/ui/molecules/address-form";
import { accountCopy, type AccountErrors } from "@shopblok/ui/templates/account";
import { AuthTemplate, authCopy } from "@shopblok/ui/templates/auth";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getMessages } from "next-intl/server";
import { signIn, signOut } from "./actions/auth";
import { authPageContext, type AuthPageContext } from "./auth-page";
import type { Flash } from "./flash";
import { getCustomer, type CustomerDto } from "./medusa/customer";
import { SHELL_PREFETCH } from "./site";
import { toAccountNav, type AccountSection } from "./view-models/account";

// What the account pages share (T53, D64): the market, the signed-in customer (read again on every
// request, never cached), the template's common props, and the sign-in a visitor who is not signed
// in gets in the page's place. A page cannot redirect without scripts (Cache Components), so the
// account's URL draws the sign-in itself, with `next` set to come back to it.

export type AccountPageContext = AuthPageContext & { customer: CustomerDto | null };

export async function accountPageContext(): Promise<AccountPageContext> {
  const page = await authPageContext();
  return { ...page, customer: await getCustomer() };
}

/** An account page's metadata: its title, and never in a search engine's index. */
export async function accountMetadata(
  title: (account: Messages["templates"]["account"]) => string,
): Promise<Metadata> {
  const messages = await getMessages();
  return { title: title(messages.templates.account), robots: { index: false, follow: false } };
}

/** A public URL as a path of this host (a market on its own domain has a full URL). */
const localPath = (url: string) => {
  const parsed = new URL(url, "http://localhost");
  return `${parsed.pathname}${parsed.search}`;
};

/** The sign-in, in an account page's place, coming back to `path` (a path inside the market). */
export function SignInFirst({ page, path }: { page: AccountPageContext; path: string }) {
  const { market, messages, hrefs, context } = page;
  return (
    <AuthTemplate
      variant="default"
      screen={{
        kind: "login",
        email: "",
        notice: "sign-in-required",
        next: localPath(context.url(path)),
        registerHref: hrefs.register,
        forgotHref: hrefs.forgot,
      }}
      copy={authCopy(messages)}
      locale={market.htmlLang}
      action={signIn.bind(null, market.key)}
      prefetch={SHELL_PREFETCH}
    />
  );
}

/** AccountTemplate's props every account page passes: the nav, the copy, the dates' zone, now. */
export async function accountProps(page: AccountPageContext, section: AccountSection) {
  const { market, messages, context } = page;
  // The wallet's expiry is judged by this request's time, never the prerender's.
  await connection();
  return {
    variant: "default" as const,
    nav: toAccountNav(messages.templates.account.nav, context.url, section),
    copy: accountCopy(messages),
    locale: market.htmlLang,
    timeZone: market.timeZone,
    now: new Date().toISOString(),
    prefetch: SHELL_PREFETCH,
    signOut: signOut.bind(null, market.key),
  };
}

const FORM_ERRORS = new Set(["not-found", "rejected", "unavailable", "unauthorized"]);

/** A failed account form's answer as AccountTemplate's errors (only the form's own part is read). */
export function accountErrorsOf(
  flash: Flash | null,
  part?: "address" | "profile" | "return",
): AccountErrors {
  if (flash === null) return {};
  const errors: AccountErrors = {};
  if (flash.form !== undefined)
    errors.form = (FORM_ERRORS.has(flash.form) ? flash.form : "rejected") as NonNullable<
      AccountErrors["form"]
    >;
  const fields = Object.entries(flash.errors ?? {});
  if (fields.length === 0) return errors;
  if (part === "address") {
    const address: AddressFormErrors = {};
    for (const [name, kind] of fields)
      address[name as keyof AddressFormErrors] =
        kind === "required" || kind === "pattern" ? kind : "invalid";
    errors.address = address;
  } else if (part === "profile") {
    const profile: NonNullable<AccountErrors["profile"]> = {};
    for (const [name, kind] of fields)
      if (name === "firstName" || name === "lastName" || name === "phone")
        profile[name] = kind === "required" ? "required" : "invalid";
    errors.profile = profile;
  } else if (part === "return") {
    const request: NonNullable<AccountErrors["return"]> = {};
    for (const [name] of fields)
      if (name === "items" || name === "reason") request[name] = "required";
    errors.return = request;
  }
  return errors;
}
