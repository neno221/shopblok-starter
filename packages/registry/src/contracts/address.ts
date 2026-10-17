import { z } from "zod";
import { Id } from "./content";

/** ISO 3166-1 alpha-2, lower case, as Medusa stores it (`cy`). */
export const CountryCode = z
  .string()
  .regex(/^[a-z]{2}$/, "an ISO 3166-1 alpha-2 code in lower case")
  .describe("ISO 3166-1 alpha-2, lower case (cy)");

/**
 * Medusa's address fields (SPEC §8.4). Which are shown, in which order and which are required is
 * the country's format (D48, T34), not this schema's: Cyprus has no province, the US needs one.
 */
export const Address = z.object({
  id: Id.optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().min(1).optional(),
  address1: z.string().min(1),
  address2: z.string().min(1).optional(),
  city: z.string().min(1),
  province: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  countryCode: CountryCode,
  phone: z.string().min(1).optional(),
  isDefaultShipping: z.boolean().optional(),
  isDefaultBilling: z.boolean().optional(),
});

/** A place, not a person's address: a store or pickup point (ShippingOptionCard's pickup). */
export const LocationAddress = Address.omit({
  id: true,
  firstName: true,
  lastName: true,
  isDefaultShipping: true,
  isDefaultBilling: true,
});

/**
 * AddressForm (T34): the countries its select offers (the region's, SPEC §8.4) and the values so
 * far. Every field may still be empty but the country, which decides the form (D48); errors are a
 * prop, the copy's. A country is listed once, or the select would offer it twice.
 */
export const AddressFormState = z
  .object({
    countries: z
      .array(CountryCode)
      .min(1)
      .describe("The region's countries, in the select's order"),
    values: Address.partial().required({ countryCode: true }),
  })
  .superRefine((state, context) => {
    if (new Set(state.countries).size !== state.countries.length)
      context.addIssue({
        code: "custom",
        path: ["countries"],
        message: "a country is listed twice",
      });
    if (!state.countries.includes(state.values.countryCode))
      context.addIssue({
        code: "custom",
        path: ["values", "countryCode"],
        message: "the address's country is not one of the form's countries",
      });
  });

export type CountryCode = z.infer<typeof CountryCode>;
export type Address = z.infer<typeof Address>;
export type LocationAddress = z.infer<typeof LocationAddress>;
export type AddressFormState = z.infer<typeof AddressFormState>;
