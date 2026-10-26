/**
 * What `search-locale.spec.ts` seeds: the store through the real `seed-markets.ts`, two
 * categories, a collection and two products with their translations. Everything is written
 * through core-flows workflows, so the index sees the events a shop's admin causes. Ported from
 * the S2 prototype's fixtures (commit `ca361b2`) for the one `product` index (A′, D63).
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  batchTranslationsWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createShippingProfilesWorkflow,
  updateStoresWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/medusa/core-flows";

import { TRANSLATED_LOCALES, type TranslatedLocale } from "../../src/config/markets";
import seedMarkets from "../../src/scripts/seed-markets";

type Locale = "en-US" | TranslatedLocale;
type Text = { title: string; description: string };

export const LINEN_SHIRT: Record<Locale, Text> = {
  "en-US": { title: "Linen shirt", description: "A breathable shirt made of pure linen." },
  "el-GR": { title: "Λινό πουκάμισο", description: "Ένα δροσερό πουκάμισο από καθαρό λινό." },
  "de-DE": { title: "Leinenhemd", description: "Ein luftiges Hemd aus reinem Leinen." },
  "fr-FR": { title: "Chemise en lin", description: "Une chemise légère en pur lin." },
};

export const WOOL_SWEATER: Record<Locale, Text> = {
  "en-US": { title: "Wool sweater", description: "A warm sweater knitted from merino wool." },
  "el-GR": { title: "Μάλλινο πουλόβερ", description: "Ένα ζεστό πουλόβερ από μαλλί μερινό." },
  "de-DE": { title: "Wollpullover", description: "Ein warmer Pullover aus Merinowolle." },
  "fr-FR": { title: "Pull en laine", description: "Un pull chaud tricoté en laine mérinos." },
};

export const SHIRTS_CATEGORY: Record<Locale, string> = {
  "en-US": "Shirts",
  "el-GR": "Πουκάμισα",
  "de-DE": "Hemden",
  "fr-FR": "Chemises",
};

export const KNITWEAR_CATEGORY: Record<Locale, string> = {
  "en-US": "Knitwear",
  "el-GR": "Πλεκτά",
  "de-DE": "Strickwaren",
  "fr-FR": "Maille",
};

/** T9: two languages outside D8's four, which the store gets only in that test. */
export const MORE_LOCALES = {
  "pt-BR": { title: "Camisa de linho", description: "Uma camisa leve de puro linho." },
  "mn-MN": { title: "Маалинган цамц", description: "Цэвэр маалинган даавуугаар хийсэн хөнгөн цамц." },
} as const;

export type Seeded = {
  salesChannelId: string;
  shippingProfileId: string;
  publishableKey: string;
  regionId: string;
};

/** The real market seed: the store's locales are exactly `SUPPORTED_LOCALES`. */
export async function seedStore(container: MedusaContainer): Promise<Seeded> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // The default shipping profile comes from a migration script the runner does not run.
  await createShippingProfilesWorkflow(container).run({
    input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
  });
  await seedMarkets({ container, args: [] } as never);

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["default_sales_channel_id"],
  });
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { type: "default" },
  });
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["token"],
    filters: { type: "publishable" },
  });
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id"],
    filters: { currency_code: "eur" },
  });

  return {
    salesChannelId: stores[0]!.default_sales_channel_id!,
    shippingProfileId: profiles[0]!.id,
    publishableKey: keys[0]!.token as string,
    regionId: regions[0]!.id,
  };
}

/** Adds locales to the store, as an admin does in the settings. */
export async function addStoreLocales(container: MedusaContainer, locales: string[]) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_locales.locale_code"],
  });
  const store = stores[0]!;
  const current = (store.supported_locales ?? []).flatMap((l) =>
    l?.locale_code ? [l.locale_code] : [],
  );

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_locales: [...new Set([...current, ...locales])].map((locale_code) => ({
          locale_code,
        })),
      },
    },
  });
}

/** Translations of one row, in the given locales. */
export async function translate(
  container: MedusaContainer,
  reference: string,
  referenceId: string,
  byLocale: Partial<Record<string, Record<string, string>>>,
) {
  await batchTranslationsWorkflow(container).run({
    input: {
      create: Object.entries(byLocale).map(([locale_code, translations]) => ({
        reference,
        reference_id: referenceId,
        locale_code,
        translations: translations!,
      })),
      update: [],
      delete: [],
    },
  });
}

/**
 * Changes one translation the way the admin does: by id. `updateTranslationsWorkflow` with a
 * `selector` throws in its event step in 2.21.2 and emits nothing (ADR 0002, "Found on the way" 1).
 */
export async function changeTranslation(
  container: MedusaContainer,
  referenceId: string,
  locale: string,
  changes: Record<string, string>,
) {
  const [existing] = await container
    .resolve(Modules.TRANSLATION)
    .listTranslations({ reference_id: referenceId, locale_code: locale });

  await updateTranslationsWorkflow(container).run({
    input: {
      translations: [
        { id: existing!.id, translations: { ...(existing!.translations as object), ...changes } },
      ],
    },
  });
}

export async function createCategory(
  container: MedusaContainer,
  names: Record<Locale, string>,
  handle: string,
): Promise<string> {
  const { result } = await createProductCategoriesWorkflow(container).run({
    input: { product_categories: [{ name: names["en-US"], handle, is_active: true }] },
  });
  const id = result[0]!.id;

  await translate(
    container,
    "product_category",
    id,
    Object.fromEntries(TRANSLATED_LOCALES.map((locale) => [locale, { name: names[locale] }])),
  );

  return id;
}

export async function createCollection(container: MedusaContainer, title: string) {
  const { result } = await createCollectionsWorkflow(container).run({
    input: { collections: [{ title, handle: title.toLowerCase() }] },
  });

  return result[0]!.id;
}

const PRICES = [
  { amount: 49, currency_code: "eur" },
  { amount: 54, currency_code: "usd" },
  { amount: 42, currency_code: "gbp" },
  { amount: 50, currency_code: "chf" },
];

export async function createProduct(
  container: MedusaContainer,
  seeded: Seeded,
  input: { handle: string; text: Record<Locale, Text>; categoryId: string; collectionId: string },
): Promise<string> {
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: input.text["en-US"].title,
          description: input.text["en-US"].description,
          handle: input.handle,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: seeded.shippingProfileId,
          category_ids: [input.categoryId],
          collection_id: input.collectionId,
          sales_channels: [{ id: seeded.salesChannelId }],
          options: [{ title: "Size", values: ["S", "M"] }],
          variants: ["S", "M"].map((size) => ({
            title: size,
            options: { Size: size },
            manage_inventory: false,
            prices: PRICES,
          })),
        },
      ],
    },
  });
  const id = result[0]!.id;

  await translate(
    container,
    "product",
    id,
    Object.fromEntries(TRANSLATED_LOCALES.map((locale) => [locale, input.text[locale]])),
  );

  return id;
}

/** Polls until `check` returns a value (not `undefined`/`false`), or throws after `timeoutMs`. */
export async function until<T>(
  check: () => Promise<T | undefined | false>,
  { timeoutMs = 10_000, intervalMs = 50, what = "condition" } = {},
): Promise<{ value: T; elapsedMs: number }> {
  const start = Date.now();

  while (true) {
    const value = await check();

    if (value !== undefined && value !== false) {
      return { value: value as T, elapsedMs: Date.now() - start };
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs} ms waiting for ${what}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
