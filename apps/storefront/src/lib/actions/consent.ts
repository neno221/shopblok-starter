"use server";

import { syncCartConsent as syncCart } from "../medusa/cart";

// M6 D124 (T97): the consent island's action. After each choice (and once PostHog has given the
// visitor a distinct id) the visitor's cart, if there is one, is made to say what the cookies say
// now: a withdrawal removes the consent and the id from its metadata, so Medusa's analytics
// subscribers send nothing about the cart or its order. Every cart write does the same
// (`medusa/cart.ts`, `withConsent`); this covers a choice made with no write after it. It answers
// whether there was a cart, and `false` when Medusa could not be reached (the next write retries).

export async function syncCartConsent(): Promise<boolean> {
  try {
    return await syncCart();
  } catch {
    return false;
  }
}
