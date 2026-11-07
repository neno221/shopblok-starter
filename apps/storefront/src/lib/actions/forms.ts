import "server-only";
import { checkoutIds, type CheckoutStepKind } from "@shopblok/ui/templates/checkout/parts";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { cmsOrNull } from "../cms/read";
import { readTemplates, templatesFrom } from "../cms/templates";
import { leaveFlash } from "../flash";
import { getMarketContext } from "../market-context";
import type { ActionResult } from "./action";
import { formDataToObject } from "./action";
import {
  addToCartAction,
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

async function back(
  path: string,
  result: ActionResult<unknown>,
  values?: Record<string, string>,
  anchor = "",
) {
  if (result.ok) throw new Error("back() is for a failure");
  const errors: Record<string, string> = {};
  for (const [name, kind] of Object.entries(result.errors))
    if (kind !== undefined) errors[name] = kind;
  const key = await leaveFlash(path, {
    ...(result.form === undefined ? {} : { form: result.form }),
    errors,
    ...(values === undefined ? {} : { values }),
  });
  go(`${path}?f=${key}${anchor}`);
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
/**
 * A pick's form (T85, the `drawer-picks` mini cart): its variant into the cart, then the cart page.
 * The header's island sends it to the drawer's action instead, so this runs only for a form the
 * island did not catch.
 */
export const addPickForm = (market: string, data: FormData) =>
  cartForm(addToCartAction, market, data);

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

/**
 * Where a checkout action lands on `step` (T86): the `one-page` layout's section of the step
 * (`#main-step-delivery`, `checkoutIds`), so the browser comes back to the page at that step and
 * focus goes there; nothing for M3's layouts, whose step is the page. The layout is the `templates`
 * global's for the market, read on the server as the page reads it (a draft in Draft Mode), never
 * taken from the form.
 */
export async function stepAnchor(market: string, step: CheckoutStepKind): Promise<string> {
  const context = await getMarketContext(market);
  if (context === null) return "";
  const { isEnabled: draft } = await draftMode();
  const doc = await cmsOrNull(
    readTemplates({ market: context.market, draft }),
    "checkout: the steps' own pages",
  );
  return templatesFrom(doc).checkout === "one-page" ? `#${checkoutIds("main").step(step)}` : "";
}

export async function contactForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/checkout/contact");
  const result = await run(contactAction, market, data);
  if (!result.ok)
    await back(path, result, typed(data, CONTACT_FIELDS), await stepAnchor(market, "contact"));
  go((await pageOf(market, "/checkout/delivery")) + (await stepAnchor(market, "delivery")));
}

export async function deliveryForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/checkout/delivery");
  const result = await run(deliveryAction, market, data);
  if (!result.ok)
    await back(
      path,
      result,
      typed(data, ["shippingOption", "paymentMethod"]),
      await stepAnchor(market, "delivery"),
    );
  go((await pageOf(market, "/checkout/review")) + (await stepAnchor(market, "review")));
}

export async function placeOrderForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/checkout/review");
  const result = await run(placeOrderAction, market, data);
  if (!result.ok) {
    await back(path, result, undefined, await stepAnchor(market, "review"));
    return;
  }
  const { orderId } = result.data as { orderId: string };
  go(await pageOf(market, `/order/${encodeURIComponent(orderId)}/confirmed`));
}
