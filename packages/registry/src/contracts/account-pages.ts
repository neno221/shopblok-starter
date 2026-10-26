import { z } from "zod";
import { AddressFormState } from "./address";
import {
  AccountNav,
  AddressBook,
  OrderSummary,
  OrderTable,
  PaymentMethodsManager,
  ReturnRequest,
} from "./cart-checkout-account";
import { VerificationRequest } from "./checkout";
import { Href, Id } from "./content";
import { PageState } from "./listing";
import { Order } from "./order";

// The pages of a shopper's account (T53, D64, SPEC §8.4): signing in and up with a verified
// e-mail, the passwords, the account's screens and the claim of a guest order. Each template draws
// one screen at a time (a discriminated `screen`), and each screen is its own page and its own
// plain form, so every one of them posts without scripts. What an action answered (a field's
// error, the form's) is a prop of the template, as the checkout's is.

/** What the sign-in form says above its fields, after a step that led to it. */
export const AuthNotice = z.enum([
  /** The e-mail's link was opened: the address is verified, sign in to finish (D64). */
  "verified",
  /** The password was changed: sign in with the new one. */
  "password-reset",
  /** The customer signed out. */
  "signed-out",
  /** An account page was asked for: sign in to see it. */
  "sign-in-required",
]);

/** Sign in: the e-mail and the password, the ways to register and to reset a password. */
export const AuthLoginScreen = z.object({
  kind: z.literal("login"),
  email: z.string().describe("What the email field holds: what was typed, or the verified address"),
  notice: AuthNotice.optional(),
  next: z
    .string()
    .regex(/^\/(?!\/)/, "a path of the shop")
    .optional()
    .describe("The shop's page the sign-in goes on to (the account page asked for)"),
  registerHref: Href,
  forgotHref: Href,
});

/** Create an account: the e-mail, the password and the name (D64: verified before it exists). */
export const AuthRegisterScreen = z.object({
  kind: z.literal("register"),
  values: z
    .object({
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      phone: z.string(),
    })
    .describe("What the fields hold: empty at first, what was typed after an error"),
  loginHref: Href,
});

/** The registration or the sign-in waits for the e-mail's link (VerificationNotice). */
export const AuthCheckEmailScreen = z.object({
  kind: z.literal("check-email"),
  verification: VerificationRequest,
  loginHref: Href,
});

/** Ask for a password reset link; `sent` once it went (to any address: it says no more). */
export const AuthForgotScreen = z.object({
  kind: z.literal("forgot"),
  email: z.string(),
  sent: z.boolean(),
  loginHref: Href,
});

/** Choose a new password, with the reset link's token and address. */
export const AuthResetScreen = z.object({
  kind: z.literal("reset"),
  email: z.email(),
  token: z.string().min(1),
  loginHref: Href,
});

/** A verification or reset link that no longer works, and where to start again. */
export const AuthLinkExpiredScreen = z.object({
  kind: z.literal("link-expired"),
  link: z.enum(["verify", "reset"]),
  restartHref: Href.describe("Sign in (which sends a new link) or ask for a new reset link"),
});

/** The sign-in, registration and password pages (`auth`, T53, D64). */
export const AuthPage = z.object({
  variant: z.literal("default").describe("D57: one variant in M3"),
  screen: z.discriminatedUnion("kind", [
    AuthLoginScreen,
    AuthRegisterScreen,
    AuthCheckEmailScreen,
    AuthForgotScreen,
    AuthResetScreen,
    AuthLinkExpiredScreen,
  ]),
});

/** The account's first page: the greeting, the latest orders and the ways on. */
export const AccountOverviewScreen = z.object({
  kind: z.literal("overview"),
  firstName: z.string().min(1).optional().describe("The greeting's name; none: a plain one"),
  email: z.email(),
  recent: OrderTable.describe("The latest orders, three at most"),
  ordersHref: Href,
  addressesHref: Href,
  profileHref: Href,
  lookupHref: Href.describe("The claim of an order placed as a guest"),
});

/** The orders, a page at a time (`?page=n`), newest first. */
export const AccountOrdersScreen = z
  .object({
    kind: z.literal("orders"),
    table: OrderTable,
    page: PageState,
    pageHref: Href.describe("The first page; page n is `?page=n` on it"),
    lookupHref: Href,
  })
  .refine((screen) => screen.table.orders.length > 0 || screen.page.page === 1, {
    message: "an empty page after the first",
    path: ["page", "page"],
  });

/** One order: what was bought, where it went, its history and the way to return it. */
export const AccountOrderScreen = z
  .object({
    kind: z.literal("order"),
    order: Order,
    summary: OrderSummary,
    backHref: Href.describe("The orders"),
    returnHref: Href.optional().describe("The return form; none when nothing can go back"),
  })
  .refine((screen) => screen.summary.currencyCode === screen.order.currencyCode, {
    message: "the summary is in another currency than the order",
    path: ["summary", "currencyCode"],
  });

/** The address book. */
export const AccountAddressesScreen = z.object({
  kind: z.literal("addresses"),
  book: AddressBook,
});

/** A new address, or one to change (`addressId`), with whether it is the default for shipping. */
export const AccountAddressScreen = z.object({
  kind: z.literal("address"),
  addressId: Id.optional().describe("The address changed; none: a new one"),
  address: AddressFormState,
  isDefaultShipping: z.boolean(),
  backHref: Href.describe("The address book"),
});

/** The saved payment methods (the empty state until M6's Stripe). */
export const AccountPaymentMethodsScreen = z.object({
  kind: z.literal("payment-methods"),
  wallet: PaymentMethodsManager,
});

/** The orders that can be sent back, each linked to its return form. */
export const AccountReturnsScreen = z.object({
  kind: z.literal("returns"),
  table: OrderTable.describe("The orders with something to return; each `href` its return form"),
});

/** The return form for one order, and whether a request was just sent. */
export const AccountReturnScreen = z.object({
  kind: z.literal("return"),
  request: ReturnRequest,
  sent: z.boolean(),
  backHref: Href.describe("The returns"),
});

/** The customer's name and phone, the e-mail (fixed: it is the sign-in), and a save just done. */
export const AccountProfileScreen = z.object({
  kind: z.literal("profile"),
  email: z.email(),
  values: z.object({
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string(),
  }),
  saved: z.boolean(),
});

/** Which AccountNav page each screen is under. */
export const ACCOUNT_SECTION = {
  overview: "overview",
  orders: "orders",
  order: "orders",
  addresses: "addresses",
  address: "addresses",
  "payment-methods": "payment-methods",
  returns: "returns",
  return: "returns",
  profile: "profile",
} as const;

/** The account (`account`, T53, D64): AccountNav beside the screen the customer is on. */
export const AccountPage = z
  .object({
    variant: z.literal("default").describe("D57: one variant in M3"),
    nav: AccountNav,
    screen: z.discriminatedUnion("kind", [
      AccountOverviewScreen,
      AccountOrdersScreen,
      AccountOrderScreen,
      AccountAddressesScreen,
      AccountAddressScreen,
      AccountPaymentMethodsScreen,
      AccountReturnsScreen,
      AccountReturnScreen,
      AccountProfileScreen,
    ]),
  })
  .refine((page) => page.nav.current === ACCOUNT_SECTION[page.screen.kind], {
    message: "the navigation marks another page than the screen's",
    path: ["nav", "current"],
  });

/** The claim of a guest order: the receipt's number and the e-mail, and a claim just sent. */
export const OrderLookupFormScreen = z.object({
  kind: z.literal("lookup"),
  values: z.object({ number: z.string(), email: z.string() }),
  sent: z.boolean().describe("A claim went out: the order's address has the link"),
  accountHref: Href,
});

/** A visitor who is not signed in: claiming needs an account with a verified e-mail. */
export const OrderLookupSignInScreen = z.object({
  kind: z.literal("sign-in"),
  loginHref: Href,
  registerHref: Href,
});

/** The link from the order's e-mail: accept the claim or decline it. */
export const OrderTransferScreen = z.object({
  kind: z.literal("transfer"),
  displayId: z.int().positive(),
});

/** What became of the claim, and where to go on. */
export const OrderTransferDoneScreen = z.object({
  kind: z.literal("transfer-done"),
  outcome: z.enum(["accepted", "declined", "failed"]),
  homeHref: Href,
});

/** The guest-order claim (`order-lookup`, T53, D64): the form, and the e-mail link's page. */
export const OrderLookupPage = z.object({
  variant: z.literal("default").describe("D57: one variant in M3"),
  screen: z.discriminatedUnion("kind", [
    OrderLookupFormScreen,
    OrderLookupSignInScreen,
    OrderTransferScreen,
    OrderTransferDoneScreen,
  ]),
});

export type AuthNotice = z.infer<typeof AuthNotice>;
export type AuthLoginScreen = z.infer<typeof AuthLoginScreen>;
export type AuthRegisterScreen = z.infer<typeof AuthRegisterScreen>;
export type AuthCheckEmailScreen = z.infer<typeof AuthCheckEmailScreen>;
export type AuthForgotScreen = z.infer<typeof AuthForgotScreen>;
export type AuthResetScreen = z.infer<typeof AuthResetScreen>;
export type AuthLinkExpiredScreen = z.infer<typeof AuthLinkExpiredScreen>;
export type AuthPage = z.infer<typeof AuthPage>;
export type AccountOverviewScreen = z.infer<typeof AccountOverviewScreen>;
export type AccountOrdersScreen = z.infer<typeof AccountOrdersScreen>;
export type AccountOrderScreen = z.infer<typeof AccountOrderScreen>;
export type AccountAddressesScreen = z.infer<typeof AccountAddressesScreen>;
export type AccountAddressScreen = z.infer<typeof AccountAddressScreen>;
export type AccountPaymentMethodsScreen = z.infer<typeof AccountPaymentMethodsScreen>;
export type AccountReturnsScreen = z.infer<typeof AccountReturnsScreen>;
export type AccountReturnScreen = z.infer<typeof AccountReturnScreen>;
export type AccountProfileScreen = z.infer<typeof AccountProfileScreen>;
export type AccountPage = z.infer<typeof AccountPage>;
export type OrderLookupFormScreen = z.infer<typeof OrderLookupFormScreen>;
export type OrderLookupSignInScreen = z.infer<typeof OrderLookupSignInScreen>;
export type OrderTransferScreen = z.infer<typeof OrderTransferScreen>;
export type OrderTransferDoneScreen = z.infer<typeof OrderTransferDoneScreen>;
export type OrderLookupPage = z.infer<typeof OrderLookupPage>;
