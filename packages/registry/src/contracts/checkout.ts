import { z } from "zod";
import { CountryCode } from "./address";
import { Href, Id } from "./content";
import { Money } from "./money";
import { ShippingOption } from "./shipping";

// What the checkout and account molecules show that the cart, address, payment and shipping
// contracts do not (T34): a line of the order summary, the checkout's steps, the shipping
// estimator's form and its answer, and the notice that an email was sent to be verified. The
// words a summary line or a step shows are the copy's; their kind or id says which.

/** One line of an order summary (OrderSummaryRow): its kind, and the amount when it is known. */
export const SummaryLine = z
  .object({
    kind: z.enum(["subtotal", "discount", "shipping", "tax", "total"]),
    amount: Money.optional().describe(
      "Unknown until it is computed (shipping before an option). Never negative: a discount is the amount taken off, as Medusa's discount_total has it, and the row draws it with a minus",
    ),
    detail: z
      .string()
      .min(1)
      .optional()
      .describe("What the line is for, when the kind alone does not say (a promotion code)"),
  })
  .refine((line) => line.amount === undefined || line.amount.amount >= 0, {
    message: "an amount is not negative: a discount is the amount taken off",
    path: ["amount", "amount"],
  });

/** A stepper's steps and where the reader is (Stepper): checkout's, or any other flow's. */
export const StepperState = z
  .object({
    steps: z
      .array(
        z.object({
          id: Id,
          label: z.string().min(1),
          href: Href.optional().describe(
            "Where a step done goes back to; a step that is not before the current one is never linked",
          ),
        }),
      )
      .min(2),
    current: Id.describe("The id of the step the reader is on"),
  })
  .superRefine((state, context) => {
    const ids = state.steps.map((step) => step.id);
    ids.forEach((id, index) => {
      if (ids.indexOf(id) !== index)
        context.addIssue({
          code: "custom",
          path: ["steps", index, "id"],
          message: "a step is listed twice",
        });
    });
    if (!ids.includes(state.current))
      context.addIssue({
        code: "custom",
        path: ["current"],
        message: "current is not one of the steps",
      });
  });

/** The shipping estimator (ShippingEstimator): a GET form, and the options once it has answered. */
export const ShippingEstimate = z
  .object({
    action: Href.describe("The page the form GETs, with `country` and `postalCode`"),
    countries: z
      .array(CountryCode)
      .min(1)
      .describe("The region's countries, in the select's order"),
    countryCode: CountryCode.optional().describe("The country chosen; missing until one is"),
    postalCode: z.string().describe("What was typed: empty at first"),
    options: z
      .array(ShippingOption)
      .optional()
      .describe(
        "Missing until the form is sent; empty when nothing ships there. Only the available ones are listed",
      ),
  })
  .superRefine((estimate, context) => {
    if (estimate.countryCode !== undefined && !estimate.countries.includes(estimate.countryCode))
      context.addIssue({
        code: "custom",
        path: ["countryCode"],
        message: "the country is not one of the estimator's countries",
      });
    estimate.countries.forEach((country, index) => {
      if (estimate.countries.indexOf(country) !== index)
        context.addIssue({
          code: "custom",
          path: ["countries", index],
          message: "a country is listed twice",
        });
    });
    const ids = (estimate.options ?? []).map((option) => option.id);
    ids.forEach((id, index) => {
      if (ids.indexOf(id) !== index)
        context.addIssue({
          code: "custom",
          path: ["options", index, "id"],
          message: "an option is listed twice",
        });
    });
  });

/** VerificationNotice: the address a link was sent to, and when a new one can be asked for. */
export const VerificationRequest = z.object({
  email: z.email(),
  resendInSeconds: z
    .int()
    .nonnegative()
    .describe("Seconds until a new link can be sent (the server's cooldown); 0 now"),
});

export type SummaryLine = z.infer<typeof SummaryLine>;
export type StepperState = z.infer<typeof StepperState>;
export type ShippingEstimate = z.infer<typeof ShippingEstimate>;
export type VerificationRequest = z.infer<typeof VerificationRequest>;
