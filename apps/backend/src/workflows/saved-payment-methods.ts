import { MedusaError, Modules } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";

import { STRIPE_PROVIDER_ID } from "../config/modules";
import { ensureStripeHolder, SAVED_TYPES, type AccountHolder } from "../lib/saved-methods";

/**
 * M6 D119 (T101): the writes of `/store/customers/me/payment-methods` (the routes check who may make
 * them). Neither step has a compensation: a SetupIntent nobody confirms saves nothing, the Stripe
 * customer is the account's from then on (made again it would be a second one), and a detached
 * method cannot be attached again.
 */

/** The caller's Stripe customer (made the first time), then a SetupIntent for it. */
export const startPaymentMethodSetupStep = createStep(
  "start-payment-method-setup",
  async ({ customerId }: { customerId: string }, { container }) => {
    const holder = await ensureStripeHolder(container, customerId);
    const payment = container.resolve(Modules.PAYMENT);
    // For later payments without the customer (`off_session`), and only the types the shop saves.
    const created = await payment.createPaymentMethods({
      provider_id: STRIPE_PROVIDER_ID,
      context: { account_holder: holder as never },
      data: { usage: "off_session", payment_method_types: [...SAVED_TYPES] },
    });
    const secret = (created.data as { client_secret?: unknown } | undefined)?.client_secret;
    if (typeof secret !== "string")
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Stripe made no SetupIntent");
    return new StepResponse({ id: created.id, client_secret: secret });
  },
);

export const startPaymentMethodSetupWorkflow = createWorkflow(
  "start-payment-method-setup",
  (input: { customerId: string }) => new WorkflowResponse(startPaymentMethodSetupStep(input)),
);

/** Detaches a saved method from the Stripe customer the route found it on. */
export const detachPaymentMethodStep = createStep(
  "detach-payment-method",
  async ({ id, holder }: { id: string; holder: AccountHolder }, { container }) => {
    const payment = container.resolve(Modules.PAYMENT);
    await payment.deletePaymentMethods({
      provider_id: STRIPE_PROVIDER_ID,
      id,
      context: { account_holder: holder as never },
    } as never);
    return new StepResponse({ id });
  },
);

export const detachPaymentMethodWorkflow = createWorkflow(
  "detach-payment-method",
  (input: { id: string; holder: AccountHolder }) =>
    new WorkflowResponse(detachPaymentMethodStep(input)),
);
