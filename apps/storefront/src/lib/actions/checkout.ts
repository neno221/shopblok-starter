"use server";

import {
  addPickForm,
  applyPromoForm,
  contactForm,
  deliveryForm,
  placeOrderForm,
  removeLineForm,
  removePromoForm,
  updateLineForm,
} from "./forms";
import { preparePaymentAction } from "./checkout-handlers";
import {
  expressAddressAction,
  expressConfirmAction,
  expressRateAction,
  expressRestoreAction,
  expressTotalAction,
} from "./checkout-express";

// The cart page's and the checkout's form actions (T52). The bodies are in `forms.ts`; a
// `"use server"` file exports async functions only. Each takes the market's key (bound by the page)
// and the form's data, and redirects.

export async function updateLineFromCart(market: string, data: FormData) {
  return updateLineForm(market, data);
}

export async function removeLineFromCart(market: string, data: FormData) {
  return removeLineForm(market, data);
}

export async function applyPromoFromCart(market: string, data: FormData) {
  return applyPromoForm(market, data);
}

export async function removePromoFromCart(market: string, data: FormData) {
  return removePromoForm(market, data);
}

export async function submitContact(market: string, data: FormData) {
  return contactForm(market, data);
}

export async function submitDelivery(market: string, data: FormData) {
  return deliveryForm(market, data);
}

export async function placeOrder(market: string, data: FormData) {
  return placeOrderForm(market, data);
}

export async function addPickFromCart(market: string, data: FormData) {
  return addPickForm(market, data);
}

/**
 * The review's "Place order" with Stripe (M6 D117): the session for the cart's current total, for
 * the island to confirm in the browser. Answers the action's result; it does not redirect.
 */
export async function preparePayment(market: string) {
  return preparePaymentAction({ market });
}

/**
 * The express rail's wallet events (M6 T102, D120), each on the visitor's own cart: the address the
 * wallet shows, the shipping option picked in it, the payment, the total after a refused one, and
 * the cart as it was when the sheet closes without a payment. Each answers the action's result; none redirects.
 */
export async function expressAddress(input: unknown) {
  return expressAddressAction(input);
}

export async function expressRate(input: unknown) {
  return expressRateAction(input);
}

export async function expressConfirm(input: unknown) {
  return expressConfirmAction(input);
}

export async function expressTotal(market: string) {
  return expressTotalAction({ market });
}

export async function expressRestore(market: string) {
  return expressRestoreAction({ market });
}
