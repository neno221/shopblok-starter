import "server-only";
import { leaveFlash } from "../flash";
import type { ActionResult } from "./action";
import { formDataToObject } from "./action";
import {
  authFormError,
  forgotAction,
  loginAction,
  logoutAction,
  registerAction,
  resendAction,
  resetAction,
  type SignInOutcome,
} from "./auth-handlers";
import { go, pageOf, typed } from "./forms";

// The auth pages' forms (T53, D48): each posts to a server action bound to the market's key, which
// runs the handler and redirects (post, redirect, get), as T52's cart and checkout forms do: on to
// the account or the e-mail to check when it is done, back to the same page with the answer in a
// flash (`lib/flash.ts`) when it is not. A password is never typed back.

/**
 * Where a sign-in goes on to: the shop's own page the form carried (the account page that asked
 * for it), or the account. Only a path of this host: never `//host` or `/\host`.
 */
export function safeNext(next: unknown, fallback: string): string {
  if (typeof next !== "string" || next.length > 512) return fallback;
  return /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : fallback;
}

async function failed(
  path: string,
  result: ActionResult<unknown>,
  values: Record<string, string>,
  query = "",
): Promise<never> {
  if (result.ok) throw new Error("failed() is for a failure");
  const errors: Record<string, string> = {};
  for (const [name, kind] of Object.entries(result.errors))
    if (kind !== undefined) errors[name] = kind;
  const key = await leaveFlash(path, { form: authFormError(result), errors, values });
  return go(`${path}?${query}${query === "" ? "" : "&"}f=${key}`);
}

async function signedIn(market: string, outcome: SignInOutcome, next: unknown): Promise<never> {
  if (outcome.state === "check-email") return go(await pageOf(market, "/verify"));
  return go(safeNext(next, await pageOf(market, "/account")));
}

export async function loginForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/login");
  const result = await loginAction({ ...formDataToObject(data), market });
  if (!result.ok) await failed(path, result, typed(data, ["email", "next"]));
  else await signedIn(market, result.data, data.get("next"));
}

export const REGISTER_FIELDS = ["email", "firstName", "lastName", "phone"] as const;

export async function registerForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/register");
  const result = await registerAction({ ...formDataToObject(data), market });
  if (!result.ok) await failed(path, result, typed(data, REGISTER_FIELDS));
  else await signedIn(market, result.data, undefined);
}

export async function resendForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/verify");
  const result = await resendAction({ ...formDataToObject(data), market });
  if (!result.ok) await failed(path, result, {});
  else go(result.data.sent ? `${path}?resent=1` : path);
}

export async function forgotForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/forgot-password");
  const result = await forgotAction({ ...formDataToObject(data), market });
  if (!result.ok) await failed(path, result, typed(data, ["email"]));
  else {
    const key = await leaveFlash(path, { form: "sent", values: { email: result.data.email } });
    go(`${path}?f=${key}`);
  }
}

export async function resetForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/reset-password");
  const result = await resetAction({ ...formDataToObject(data), market });
  if (result.ok) go(`${await pageOf(market, "/login")}?notice=password-reset`);
  else if (result.form === "not-found") go(`${path}?expired=1`);
  else {
    const link = new URLSearchParams({
      token: String(data.get("token") ?? ""),
      email: String(data.get("email") ?? ""),
    });
    await failed(path, result, {}, link.toString());
  }
}

export async function logoutForm(market: string): Promise<void> {
  await logoutAction({ market });
  go(`${await pageOf(market, "/login")}?notice=signed-out`);
}
