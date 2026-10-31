import { z } from "@medusajs/framework/zod";

const NOTHING = "Send at least one field to save.";

/** `POST /admin/markets/countries/:code`. A field left out keeps its stored value. */
export const SaveMarketCountryBody = z
  .strictObject({
    enabled: z.boolean().optional(),
    /** ISO 639-1 codes, the default first. */
    languages: z.array(z.string()).optional(),
    /** An IANA zone; `null` clears it. */
    time_zone: z.string().nullable().optional(),
    /** A bare domain; `null` clears it. */
    domain: z.string().nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: NOTHING });

export type SaveMarketCountryBodyType = z.infer<typeof SaveMarketCountryBody>;

/** `POST /admin/markets/settings`. A field left out keeps its stored value. */
export const SaveMarketSettingsBody = z
  .strictObject({
    primary_country: z.string().optional(),
    fallback_market: z.string().optional(),
    languages: z
      .array(
        z.strictObject({
          code: z.string(),
          medusa_locale: z.string(),
          html_lang: z.string().nullable().optional(),
        }),
      )
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: NOTHING });

export type SaveMarketSettingsBodyType = z.infer<typeof SaveMarketSettingsBody>;
