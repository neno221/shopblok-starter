import "server-only";
import { redirect } from "next/navigation";
import { leaveFlash } from "../flash";
import { getMarketContext } from "../market-context";
import type { ActionResult } from "./action";
import { formDataToObject } from "./action";
import {
  applyPromoAction,
  removeLineAction,
  removePromoAction,
  updateLineAction,
} from "./cart-handlers";
import { contactAction, deliveryAction, placeOrderAction } from "./checkout-handlers";

// The cart page's and the checkout's forms (T52, D48): each posts to a server action bound to the
// market's key, which runs the action and redirects: to the next page when it is done, back to the
// same page with the answer in a flash (`lib/flash.ts`) when it is not. The same function serves a
// form sent before any script runs and one React sends, so the pages need no client code.

type Handler = (input: unknown) => Promise<ActionResult<unknown>>;

/** A redirect to a URL the market built: typed routes cannot know a market's public paths. */
export const go = (url: string): never => redirect(url as Parameters<typeof redirect>[0]);

/** The market's page at `path`, or the shop's root for a key that names no open market. */
export async function pageOf(market: string, path: string): Promise<string> {
  const context = await getMarketContext(market);
  return context === null ? "/" : context.url(path);
}

/** What a form sent, as strings: what a flash may give back to the form. */
export function typed(data: FormData, names: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of names) {
    const value = data.get(name);
    if (typeof value === "string") values[name] = value;
  }
  return values;
}

async function run(
  handler: Handler,
  market: string,
  data: FormData,
): Promise<ActionResult<unknown>> {
  return handler({ ...formDataToObject(data), market });
}

async function back(path: string, result: ActionResult<unknown>, values?: Record<string, string>) {
  if (result.ok) throw new Error("back() is for a failure");
  const errors: Record<string, string> = {};
  for (const [name, kind] of Object.entries(result.errors))
    if (kind !== undefined) errors[name] = kind;
  const key = await leaveFlash(path, {
    ...(result.form === undefined ? {} : { form: result.form }),
    errors,
    ...(values === undefined ? {} : { values }),
  });
  go(`${path}?f=${key}`);
}

// --- The cart page ------------------------------------------------------------------------------

/** `keep`: the fields a refusal types back in; only the apply form's code (PR 80 review, item 1). */
async function cartForm(
  handler: Handler,
  market: string,
  data: FormData,
  keep: readonly string[] = [],
): Promise<void> {
  const path = await pageOf(market, "/cart");
  const result = await run(handler, market, data);
  if (!result.ok) await back(path, result, keep.length === 0 ? undefined : typed(data, keep));
  go(path);
}

export const updateLineForm = (market: string, data: FormData) =>
  cartForm(updateLineAction, market, data);
export const removeLineForm = (market: string, data: FormData) =>
  cartForm(removeLineAction, market, data);
export const applyPromoForm = (market: string, data: FormData) =>
  cartForm(applyPromoAction, market, data, ["code"]);
export const removePromoForm = (market: string, data: FormData) =>
  cartForm(removePromoAction, market, data);

// --- The checkout --------------------------------------------------------------------------------

/** The contact step's fields, as AddressForm and the email field name them. */
export const CONTACT_FIELDS = [
  "email",
  "countryCode",
  "firstName",
  "lastName",
  "company",
  "address1",
  "address2",
  "city",
  "province",
  "postalCode",
  "phone",
] as const;

export async function contactForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/checkout/contact");
  const result = await run(contactAction, market, data);
  if (!result.ok) await back(path, result, typed(data, CONTACT_FIELDS));
  go(await pageOf(market, "/checkout/delivery"));
}

export async function deliveryForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/checkout/delivery");
  const result = await run(deliveryAction, market, data);
  if (!result.ok) await back(path, result, typed(data, ["shippingOption", "paymentMethod"]));
  go(await pageOf(market, "/checkout/review"));
}

export async function placeOrderForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/checkout/review");
  const result = await run(placeOrderAction, market, data);
  if (!result.ok) {
    await back(path, result);
    return;
  }
  const { orderId } = result.data as { orderId: string };
  go(await pageOf(market, `/order/${encodeURIComponent(orderId)}/confirmed`));
}
