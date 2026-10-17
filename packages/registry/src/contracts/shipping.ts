import { z } from "zod";
import { LocationAddress } from "./address";
import { Id } from "./content";
import { Money } from "./money";

/** A delivery or pickup option (ShippingOptionCard, ShippingEstimator). A 0 amount is free. */
export const ShippingOption = z.object({
  id: Id,
  name: z.string().min(1),
  price: Money,
  estimate: z
    .object({ minDays: z.int().nonnegative(), maxDays: z.int().nonnegative() })
    .refine((days) => days.minDays <= days.maxDays, "minDays is more than maxDays")
    .optional()
    .describe("Business days to delivery"),
  pickup: z
    .object({ locationName: z.string().min(1), address: LocationAddress.optional() })
    .optional()
    .describe("Collected from a location instead of delivered"),
  available: z.boolean(),
});

export type ShippingOption = z.infer<typeof ShippingOption>;
