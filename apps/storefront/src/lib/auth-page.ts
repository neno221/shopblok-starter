import "server-only";
import type { Messages } from "@shopblok/i18n";
import type { AuthErrors, AuthField } from "@shopblok/ui/templates/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getMessages } from "next-intl/server";
import { getCurrentMarket } from "./current-market";
import type { Flash } from "./flash";
import type { CurrentMarket } from "./market-locale";
import { getMarketContext, type MarketContext } from "./market-context";

// What the auth pages share (T53): the market and its context (a key that names no open market is
// the 404), the hrefs between the pages, the `noindex` metadata, and a failed form's flash as the
// template's errors.

export type AuthPageContext = {
  market: CurrentMarket;
  context: MarketContext;
  messages: Messages;
  hrefs: { login: string; register: string; forgot: string; verify: string; account: string };
};

export async function authPageContext(): Promise<AuthPageContext> {
  // Request time only: the build prerenders the market's shell and must not ask Medusa for the
  // region (the design-system job builds with no backend).
  await connection();
  const [market, messages] = await Promise.all([getCurrentMarket(), getMessages()]);
  const context = await getMarketContext(market.key);
  if (context === null) notFound();
  return {
    market,
    context,
    messages,
    hrefs: {
      login: context.url("/login"),
      register: context.url("/register"),
      forgot: context.url("/forgot-password"),
      verify: context.url("/verify"),
      account: context.url("/account"),
    },
  };
}

/** An auth page's metadata: its title, and never in a search engine's index. */
export async function authMetadata(
  title: (auth: Messages["templates"]["auth"]) => string,
): Promise<Metadata> {
  const messages = await getMessages();
  return { title: title(messages.templates.auth), robots: { index: false, follow: false } };
}

const FORM_ERRORS = new Set(["credentials", "not-verified", "exists", "rejected", "unavailable"]);
const FIELDS = new Set<AuthField>(["email", "password", "firstName", "lastName", "phone"]);

/**
 * A failed form's answer as AuthTemplate's errors: the form's (anything the copy has no words for
 * is "rejected"), and each field's kind, an empty e-mail "required" and a password Medusa's rule
 * refused "short".
 */
export function authErrorsOf(flash: Flash | null): AuthErrors {
  if (flash === null) return {};
  const errors: AuthErrors = {};
  if (flash.form !== undefined && flash.form !== "sent")
    errors.form = (FORM_ERRORS.has(flash.form) ? flash.form : "rejected") as NonNullable<
      AuthErrors["form"]
    >;
  const fields: NonNullable<AuthErrors["fields"]> = {};
  for (const [name, kind] of Object.entries(flash.errors ?? {})) {
    if (!FIELDS.has(name as AuthField)) continue;
    const field = name as AuthField;
    if (field === "email")
      fields.email = (flash.values?.email ?? "").trim() === "" ? "required" : "pattern";
    else if (field === "password") fields.password = kind === "required" ? "required" : "short";
    else fields[field] = kind === "required" ? "required" : "invalid";
  }
  if (Object.keys(fields).length > 0) errors.fields = fields;
  return errors;
}

/** A query parameter as one string, or `undefined`. */
export const param = (value: string | string[] | undefined): string | undefined =>
  typeof value === "string" ? value : undefined;
