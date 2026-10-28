import "server-only";
import { updateTag } from "next/cache";
import { z } from "zod";
import type { MarketContext } from "../market-context";
import { mailTarget } from "../markets";
import {
  login,
  logout,
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  type LoginResult,
} from "../medusa/customer";
import { MedusaRequestError } from "../medusa/sdk";
import { action, ActionError, type FormError } from "./action";
import { contextFor, formText as text, marketKey } from "./inputs";

// Signing in and up (D64, T53): the auth forms' actions, on T47's data layer (`medusa/customer.ts`,
// dtc-starter's flow with its bugs fixed). The e-mail is trimmed and lowercased before Medusa sees
// it, as the checkout does: Medusa keeps an address in lower case, and T44's verification check
// compares the address exactly (PR 76 review). The market's public prefix and language go with every
// request that makes Medusa e-mail a link (T44 builds the link from the prefix; T70 picks the copy by
// the language).

const email = z.string().trim().toLowerCase().pipe(z.email().max(320));
/** The shortest password the shop takes (the template's hint says the same). */
export const PASSWORD_MIN = 8;
const newPassword = z.string().min(PASSWORD_MIN).max(200);
/** Why a sign-in or a registration failed when no field is to blame (the auth copy's keys). */
export type AuthFormError = FormError | "credentials" | "not-verified" | "exists";

const mailOf = (context: MarketContext) => mailTarget(context.market, context.map);

/** What a login or a registration became, for the form: signed in, or the e-mail to check. */
export type SignInOutcome = { state: "signed-in" } | { state: "check-email"; email: string };

function outcomeOf(result: LoginResult): SignInOutcome {
  if (result.state === "signed-in") return { state: "signed-in" };
  if (result.state === "verification-required")
    return { state: "check-email", email: result.email };
  if (result.reason === "credentials" || result.reason === "exists")
    throw new ActionError("rejected", result.reason, result.reason);
  throw new ActionError(
    result.reason === "unavailable" ? "unavailable" : "rejected",
    result.reason,
  );
}

/** After a sign-in or a sign-out the cart is another (the customer's, or none). */
function signedInOrOut() {
  updateTag("cart");
}

export const loginSchema = z.object({
  market: marketKey,
  email,
  password: z.string().min(1).max(200),
});

export const loginAction = action(loginSchema, async ({ market, email, password }) => {
  const context = await contextFor(market);
  const outcome = outcomeOf(await login(email, password, mailOf(context)));
  if (outcome.state === "signed-in") signedInOrOut();
  return outcome;
});

export const registerSchema = z.object({
  market: marketKey,
  email,
  password: newPassword,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: text(40),
});

export const registerAction = action(
  registerSchema,
  async ({ market, email, password, firstName, lastName, phone }) => {
    const context = await contextFor(market);
    const result = await register(
      { email, firstName, lastName, ...(phone === undefined ? {} : { phone }) },
      password,
      mailOf(context),
    );
    const outcome = outcomeOf(result);
    if (outcome.state === "signed-in") signedInOrOut();
    return outcome;
  },
);

export const resendSchema = z.object({ market: marketKey, email });

/** A new verification link, for the address this browser waits on (`false`: not now). */
export const resendAction = action(resendSchema, async ({ market, email }) => {
  const context = await contextFor(market);
  return { sent: await resendVerification(email, mailOf(context)) };
});

export const forgotSchema = z.object({ market: marketKey, email });

/**
 * Asks Medusa to e-mail a reset link. The answer is the same whether or not an account uses the
 * address, so the form cannot tell anyone which addresses have one; an outage is said.
 */
export const forgotAction = action(forgotSchema, async ({ market, email }) => {
  const context = await contextFor(market);
  try {
    await requestPasswordReset(email, mailOf(context));
  } catch (error) {
    if (error instanceof MedusaRequestError && error.kind === "unreachable") throw error;
  }
  return { email };
});

export const resetSchema = z.object({
  market: marketKey,
  email,
  token: z.string().min(1).max(2048),
  password: newPassword,
});

/** Saves the new password with the reset link's token; a token Medusa refuses has expired. */
export const resetAction = action(resetSchema, async ({ market, email, token, password }) => {
  await contextFor(market);
  try {
    await resetPassword(email, password, token);
  } catch (error) {
    if (error instanceof MedusaRequestError && error.kind === "rejected")
      throw new ActionError("not-found", "the reset link has expired");
    throw error;
  }
  return { email };
});

export const logoutSchema = z.object({ market: marketKey });

export const logoutAction = action(logoutSchema, async ({ market }) => {
  await contextFor(market);
  await logout();
  signedInOrOut();
  return { signedOut: true };
});

/** The form's error of a failed sign-in or registration, by what the handler threw. */
export function authFormError(result: { form?: FormError; reason?: string }): AuthFormError {
  if (result.reason === "credentials" || result.reason === "exists") return result.reason;
  return result.form ?? "rejected";
}
