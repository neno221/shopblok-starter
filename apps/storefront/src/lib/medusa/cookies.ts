import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { COOKIE, type CookieName } from "../cookie-names";
import { env, isProduction } from "../env";

export { COOKIE };

// The visitor's cookies (D60, SPEC §8.2): the four the storefront sets, each with its attributes in
// one place. They are httpOnly, so the browser never reads them: a catalog page learns the cart's
// count from `/next/visitor`, which reads them here. Only the data layer, the actions and the route
// handlers import this file. Reading works anywhere on the server; setting and clearing work in a
// server action or a route handler only (Next's `cookies.md`), which is where they are called.

const DAY = 60 * 60 * 24;

export type CookieAttributes = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: "/";
  maxAge: number;
};

/**
 * Each cookie's attributes. `lax` for the JWT and the cart: a shopper coming back from a payment
 * page or an e-mail link arrives by a cross-site navigation, on which a `strict` cookie is not sent
 * (dtc-starter's note). The registration waiting for its verification is `strict`: it holds no
 * secret, but nothing outside the shop needs it. `secure` outside development only, as `next dev`
 * serves plain http on localhost.
 */
export function cookieAttributes(name: CookieName): CookieAttributes {
  const secure = isProduction();
  switch (name) {
    case COOKIE.jwt:
    case COOKIE.cartId:
      return { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 7 * DAY };
    case COOKIE.pendingCustomer:
      return { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: DAY };
    case COOKIE.market:
      return { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 365 * DAY };
    case COOKIE.receipt:
      return { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 7 * DAY };
    case COOKIE.flash:
      return { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 60 };
  }
}

async function read(name: CookieName): Promise<string | undefined> {
  const value = (await cookies()).get(name)?.value;
  return value === undefined || value === "" ? undefined : value;
}

async function write(name: CookieName, value: string): Promise<void> {
  (await cookies()).set(name, value, cookieAttributes(name));
}

async function clear(name: CookieName): Promise<void> {
  (await cookies()).set(name, "", { ...cookieAttributes(name), maxAge: 0 });
}

/** The signed-in customer's token, or `undefined`. */
export const getAuthToken = () => read(COOKIE.jwt);
export const setAuthToken = (token: string) => write(COOKIE.jwt, token);
export const removeAuthToken = () => clear(COOKIE.jwt);

/**
 * The `authorization` header for a customer's call, or `undefined` when nobody is signed in.
 * dtc-starter returned `{}`, which is truthy, so its `if (!headers) return null` never stopped a
 * call (SPEC §8.2): callers here test the value itself.
 */
export async function getAuthHeaders(): Promise<{ authorization: string } | undefined> {
  const token = await getAuthToken();
  return token === undefined ? undefined : { authorization: `Bearer ${token}` };
}

/** The cart's id. Awaited by every caller (dtc-starter's `setAddresses` forgot to, §8.2). */
export const getCartId = () => read(COOKIE.cartId);
export const setCartId = (id: string) => write(COOKIE.cartId, id);
export const removeCartId = () => clear(COOKIE.cartId);

/**
 * What a registration keeps until the e-mail is verified and the customer signs in (T53), and what
 * a login that Medusa answered `verification_required` leaves for the "send a new link" form: the
 * restricted token it gave (it can ask for a verification and nothing else, T44) and when the last
 * link went out (the resend's wait).
 */
export type PendingCustomer = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  token?: string;
  /** When the last verification link was asked for, in ms since the epoch. */
  sentAt?: number;
};

export async function getPendingCustomer(): Promise<PendingCustomer | null> {
  const value = await read(COOKIE.pendingCustomer);
  if (value === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { email, firstName, lastName, phone, token, sentAt } = parsed as Record<string, unknown>;
    if (typeof email !== "string" || email === "") return null;
    const text = (field: unknown) =>
      typeof field === "string" && field !== "" ? field : undefined;
    return {
      email,
      ...(text(firstName) === undefined ? {} : { firstName: text(firstName) }),
      ...(text(lastName) === undefined ? {} : { lastName: text(lastName) }),
      ...(text(phone) === undefined ? {} : { phone: text(phone) }),
      ...(text(token) === undefined ? {} : { token: text(token) }),
      ...(typeof sentAt === "number" && Number.isFinite(sentAt) ? { sentAt } : {}),
    };
  } catch {
    return null;
  }
}

export const setPendingCustomer = (customer: PendingCustomer) =>
  write(COOKIE.pendingCustomer, JSON.stringify(customer));
export const removePendingCustomer = () => clear(COOKIE.pendingCustomer);

/** The market the visitor chose themselves (D66), as its key; checked against the map by readers. */
export const getChosenMarket = () => read(COOKIE.market);
export const setChosenMarket = (key: string) => write(COOKIE.market, key);

// The receipt (D65, T52): the order a guest's completed cart answered with, so the confirmation page
// can show it to that browser and to nobody else. The Store API answers any order by id to anyone
// with the publishable key, so the cookie is signed (HMAC-SHA256 with the server's PAYLOAD_SECRET):
// a visitor cannot write another order's id into it.

function receiptSignature(orderId: string): string | undefined {
  const secret = env.PAYLOAD_SECRET?.trim();
  if (!secret) return undefined;
  return createHmac("sha256", secret).update(`receipt:${orderId}`).digest("base64url");
}

/** Keeps the order the browser just placed, signed; nothing without a secret to sign with. */
export async function setReceipt(orderId: string): Promise<void> {
  const signature = receiptSignature(orderId);
  if (signature === undefined) {
    console.error("[receipt] PAYLOAD_SECRET is not set: a guest's receipt cannot be shown");
    return;
  }
  await write(COOKIE.receipt, `${orderId}.${signature}`);
}

/** The order the receipt cookie names, when its signature is this server's; `undefined` otherwise. */
export async function getReceiptOrderId(): Promise<string | undefined> {
  const value = await read(COOKIE.receipt);
  const dot = value?.lastIndexOf(".") ?? -1;
  if (value === undefined || dot <= 0) return undefined;
  const orderId = value.slice(0, dot);
  const expected = receiptSignature(orderId);
  if (expected === undefined) return undefined;
  const given = Buffer.from(value.slice(dot + 1));
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted) ? orderId : undefined;
}

/**
 * What a failed form leaves for the page it redirects back to (T52's post-redirect-get): the
 * errors and what was typed, under a key the redirect's URL carries (`?f=`), so a reload shows them
 * again and another visit to the page does not. A minute, `strict`: it never leaves the shop.
 */
export const setFlash = (value: string) => write(COOKIE.flash, value);
export const getFlash = () => read(COOKIE.flash);
