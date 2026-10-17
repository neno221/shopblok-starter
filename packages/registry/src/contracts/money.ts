import { z } from "zod";

/** ISO 4217, upper case. Medusa's codes are lower case; the resolvers (M3) upper-case them. */
export const CurrencyCode = z
  .string()
  .regex(/^[A-Z]{3}$/, "an ISO 4217 code in upper case")
  .describe("ISO 4217, upper case (EUR)");

/**
 * An amount in major units, as Medusa v2 returns it: 12.5 is €12.50, never 1250 (SPEC §8.2).
 * `formatMoney` in `@shopblok/i18n` formats it; nothing divides or multiplies it by 100.
 */
export const Money = z
  .object({
    amount: z.number().describe("In major units: 12.5 is €12.50"),
    currencyCode: CurrencyCode,
  })
  .describe("An amount in major units and its currency");

export type CurrencyCode = z.infer<typeof CurrencyCode>;
export type Money = z.infer<typeof Money>;
