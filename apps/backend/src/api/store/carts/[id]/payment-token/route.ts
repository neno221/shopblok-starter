import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { updateCartWorkflow } from "@medusajs/medusa/core-flows";
import { z } from "@medusajs/framework/zod";

import { listSavedMethods, previewOf } from "../../../../../lib/saved-methods";
import { stripeRegistered } from "../../../../../lib/stripe-regions";
import {
  judgeToken,
  METHOD_KEY,
  PREVIEW_KEY,
  retrieveToken,
  SAVE_KEY,
  TOKEN_KEY,
} from "../../../../../lib/stripe-token";

/** A ConfirmationToken (T100) or, for a signed-in customer, one of their saved methods (T101): one of the two. */
export const StorePaymentToken = z
  .object({
    token: z
      .string()
      .regex(/^ctoken_[A-Za-z0-9]{1,200}$/)
      .optional(),
    payment_method: z
      .string()
      .regex(/^pm_[A-Za-z0-9]{1,200}$/)
      .optional(),
  })
  .refine((body) => (body.token === undefined) !== (body.payment_method === undefined), {
    message: "send either a token or a payment_method",
  });
export type StorePaymentTokenType = z.infer<typeof StorePaymentToken>;

/**
 * `POST /store/carts/:id/payment-token` (M6 D117, T100; D119, T101): the checkout's step 2 hands over
 * how the cart pays, and the review's "Place order" confirms the cart's PaymentIntent with it.
 *
 * - **A ConfirmationToken** the Payment Element made: read from Stripe with the secret key (the
 *   browser's preview is not trusted), refused when a PaymentIntent or SetupIntent used it already
 *   or it expired, and kept on the cart (`metadata.stripe_confirmation_token`) with what the review
 *   shows (`metadata.payment_preview`: the method's type, a card's brand, last four and wallet).
 *   A token that saves its method ("Save this card for next time": Stripe's `setup_future_usage`)
 *   is taken only from the cart's own signed-in customer, and `metadata.stripe_setup_future_usage`
 *   says so, for the session (D119: a guest never saves, not even with an account's e-mail; Medusa
 *   2.22.6 gives such a cart a guest customer of its own, which is not the caller). Saving is
 *   refused for an Apple Pay or Google Pay card and any type the shop does not save (`judgeToken`;
 *   D119: the wallet keeps the cards).
 * - **A saved method** (`payment_method`, D119): only the cart's own signed-in customer's, and only
 *   one of their own (another's answers 404); kept as `metadata.stripe_payment_method` with its
 *   preview, for a session with that `payment_method`.
 *
 * Each clears the other's keys (Medusa merges `metadata`, and an empty string removes a key).
 */
export async function POST(
  req: AuthenticatedMedusaRequest<StorePaymentTokenType>,
  res: MedusaResponse,
) {
  const { token, payment_method: methodId } = req.validatedBody;
  const apiKey = process.env.STRIPE_API_KEY?.trim();
  if (!apiKey || !(await stripeRegistered(req.scope)))
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Stripe is not on.");
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "completed_at", "customer_id"],
    filters: { id: req.params.id },
  });
  const cart = carts[0];
  if (!cart || cart.completed_at)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id: ${req.params.id} was not found`,
    );
  const caller =
    req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : undefined;
  const own = caller !== undefined && caller !== "" && caller === cart.customer_id;

  if (methodId !== undefined) {
    if (!own)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only the cart's signed-in customer pays with a saved method.",
      );
    const method = (await listSavedMethods(req.scope, caller)).find((m) => m.id === methodId);
    if (method === undefined)
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Payment method with id: ${methodId} was not found`,
      );
    const preview = previewOf(method);
    await updateCartWorkflow(req.scope).run({
      input: {
        id: cart.id,
        metadata: {
          [METHOD_KEY]: method.id,
          [PREVIEW_KEY]: preview,
          [TOKEN_KEY]: "",
          [SAVE_KEY]: "",
        },
      },
    });
    res.json({ preview, save: false });
    return;
  }

  const found = await retrieveToken(apiKey, token!);
  const verdict =
    found === null
      ? { ok: false as const, reason: "no such token" }
      : judgeToken(found, Math.floor(Date.now() / 1000));
  if (!verdict.ok)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Payment token refused: ${verdict.reason}.`,
    );
  if (verdict.save && !own)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Payment token refused: only the cart's signed-in customer saves a method.",
    );

  await updateCartWorkflow(req.scope).run({
    input: {
      id: cart.id,
      metadata: {
        [TOKEN_KEY]: token,
        [PREVIEW_KEY]: verdict.preview,
        [SAVE_KEY]: verdict.save ? "off_session" : "",
        [METHOD_KEY]: "",
      },
    },
  });
  res.json({ preview: verdict.preview, save: verdict.save });
}
