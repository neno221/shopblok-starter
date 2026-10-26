import "server-only";
import { cookies } from "next/headers";
import { COOKIE, type CookieName } from "../cookie-names";
import { isProduction } from "../env";

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

/** What a registration keeps until the e-mail is verified and the customer signs in (T53). */
export type PendingCustomer = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export async function getPendingCustomer(): Promise<PendingCustomer | null> {
  const value = await read(COOKIE.pendingCustomer);
  if (value === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { email, firstName, lastName, phone } = parsed as Record<string, unknown>;
    if (typeof email !== "string" || email === "") return null;
    const text = (field: unknown) =>
      typeof field === "string" && field !== "" ? field : undefined;
    return {
      email,
      ...(text(firstName) === undefined ? {} : { firstName: text(firstName) }),
      ...(text(lastName) === undefined ? {} : { lastName: text(lastName) }),
      ...(text(phone) === undefined ? {} : { phone: text(phone) }),
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
