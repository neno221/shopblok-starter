import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { updateCartWorkflow } from "@medusajs/medusa/core-flows";
import { z } from "@medusajs/framework/zod";

import { stripeRegistered } from "../../../../../lib/stripe-regions";
import { judgeToken, PREVIEW_KEY, retrieveToken, TOKEN_KEY } from "../../../../../lib/stripe-token";

export const StorePaymentToken = z.object({
  token: z.string().regex(/^ctoken_[A-Za-z0-9]{1,200}$/),
});
export type StorePaymentTokenType = z.infer<typeof StorePaymentToken>;

/**
 * `POST /store/carts/:id/payment-token` (M6 D117, T100): the checkout's step 2 hands over the
 * ConfirmationToken the Payment Element made. The token is read from Stripe with the secret key (the
 * browser's preview is not trusted), refused when a PaymentIntent or SetupIntent used it already or
 * it expired, and kept on the cart (`metadata.stripe_confirmation_token`) with what the review shows
 * (`metadata.payment_preview`: the method's type, a card's brand, last four and wallet). The review's
 * "Place order" confirms the cart's PaymentIntent with it in the browser.
 */
export async function POST(req: MedusaRequest<StorePaymentTokenType>, res: MedusaResponse) {
  const { token } = req.validatedBody;
  const apiKey = process.env.STRIPE_API_KEY?.trim();
  if (!apiKey || !(await stripeRegistered(req.scope)))
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Stripe is not on.");
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "completed_at"],
    filters: { id: req.params.id },
  });
  const cart = carts[0];
  if (!cart || cart.completed_at)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id: ${req.params.id} was not found`,
    );

  const found = await retrieveToken(apiKey, token);
  const verdict =
    found === null
      ? { ok: false as const, reason: "no such token" }
      : judgeToken(found, Math.floor(Date.now() / 1000));
  if (!verdict.ok)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Payment token refused: ${verdict.reason}.`,
    );

  await updateCartWorkflow(req.scope).run({
    input: { id: cart.id, metadata: { [TOKEN_KEY]: token, [PREVIEW_KEY]: verdict.preview } },
  });
  res.json({ preview: verdict.preview });
}
