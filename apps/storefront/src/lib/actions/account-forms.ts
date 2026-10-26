import "server-only";
import { leaveFlash } from "../flash";
import type { ActionResult } from "./action";
import { formDataToObject } from "./action";
import {
  ADDRESS_FIELDS,
  claimOrderAction,
  defaultAddressAction,
  removeAddressAction,
  requestReturnAction,
  saveAddressAction,
  saveProfileAction,
  transferAction,
} from "./account-handlers";
import { go, pageOf, typed } from "./forms";

// The account's forms (T53, D48): each posts to a server action bound to the market's key, which
// runs the handler and redirects (post, redirect, get), as the auth forms do: on to the page that
// shows what was done, or back to the same page with the answer in a flash (`lib/flash.ts`). A
// visitor whose session ended comes back to the page, which then asks them to sign in.

type Handler = (input: unknown) => Promise<ActionResult<unknown>>;

const run = (handler: Handler, market: string, data: FormData) =>
  handler({ ...formDataToObject(data), market });

async function failed(
  path: string,
  result: ActionResult<unknown>,
  values: Record<string, string> = {},
): Promise<never> {
  if (result.ok) throw new Error("failed() is for a failure");
  const errors: Record<string, string> = {};
  for (const [name, kind] of Object.entries(result.errors))
    if (kind !== undefined) errors[name] = kind;
  const form = result.message === "mine" ? "mine" : result.form;
  const key = await leaveFlash(path, {
    ...(form === undefined ? {} : { form }),
    errors,
    values,
  });
  return go(`${path}?f=${key}`);
}

/** The address id a form names, as a path segment (empty: a new address). */
const addressPath = (data: FormData) => {
  const id = data.get("addressId");
  return typeof id === "string" && id !== ""
    ? `/account/addresses/${encodeURIComponent(id)}`
    : "/account/addresses/new";
};

export async function saveProfileForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/account/profile");
  const result = await run(saveProfileAction, market, data);
  if (!result.ok) await failed(path, result, typed(data, ["firstName", "lastName", "phone"]));
  go(`${path}?saved=1`);
}

export async function saveAddressForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, addressPath(data));
  const result = await run(saveAddressAction, market, data);
  if (!result.ok) await failed(path, result, typed(data, [...ADDRESS_FIELDS, "isDefaultShipping"]));
  go(await pageOf(market, "/account/addresses"));
}

export async function removeAddressForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/account/addresses");
  const result = await run(removeAddressAction, market, data);
  if (!result.ok) await failed(path, result);
  go(path);
}

export async function defaultAddressForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/account/addresses");
  const result = await run(defaultAddressAction, market, data);
  if (!result.ok) await failed(path, result);
  go(path);
}

export async function requestReturnForm(market: string, data: FormData): Promise<void> {
  const orderId = String(data.get("orderId") ?? "");
  const path = await pageOf(market, `/account/returns/${encodeURIComponent(orderId)}`);
  const result = await run(requestReturnAction, market, data);
  if (!result.ok) {
    const items = [...data.keys()].filter((name) => name.startsWith("items."));
    await failed(path, result, typed(data, ["reason", "note", ...items]));
  }
  go(`${path}?sent=1`);
}

export async function claimOrderForm(market: string, data: FormData): Promise<void> {
  const path = await pageOf(market, "/order/lookup");
  const result = await run(claimOrderAction, market, data);
  if (!result.ok) await failed(path, result, typed(data, ["number", "email"]));
  go(`${path}?sent=1`);
}

export async function transferForm(
  market: string,
  orderId: string,
  token: string,
  data: FormData,
): Promise<void> {
  const path = await pageOf(
    market,
    `/order/${encodeURIComponent(orderId)}/transfer/${encodeURIComponent(token)}`,
  );
  const result = await transferAction({ market, orderId, token, decision: data.get("decision") });
  go(`${path}?done=${result.ok ? result.data.outcome : "failed"}`);
}
