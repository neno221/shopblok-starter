"use server";

import {
  applyPromoForm,
  contactForm,
  deliveryForm,
  placeOrderForm,
  removeLineForm,
  removePromoForm,
  updateLineForm,
} from "./forms";

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
