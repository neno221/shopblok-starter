"use server";

import {
  addToCartAction,
  applyPromoAction,
  removeLineAction,
  removePromoAction,
  updateLineAction,
} from "./cart-handlers";

// The cart's server actions (D60). The bodies are in `cart-handlers.ts`, behind the shared
// `action()` wrapper; a `"use server"` file exports async functions only, so each is one here.
// Each takes `{ market, … }` from a client call, or `(previousState, formData)` from a form.

export async function addToCart(...args: [unknown] | [unknown, unknown]) {
  return addToCartAction(...args);
}

export async function updateCartLine(...args: [unknown] | [unknown, unknown]) {
  return updateLineAction(...args);
}

export async function removeCartLine(...args: [unknown] | [unknown, unknown]) {
  return removeLineAction(...args);
}

export async function applyPromo(...args: [unknown] | [unknown, unknown]) {
  return applyPromoAction(...args);
}

export async function removePromo(...args: [unknown] | [unknown, unknown]) {
  return removePromoAction(...args);
}
