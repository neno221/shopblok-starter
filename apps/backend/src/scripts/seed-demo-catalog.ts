/**
 * Seeds a demo catalog (M0 plan, T07 and D7): 8 products with variants priced in
 * EUR, USD, GBP and CHF, 3 categories, 2 collections, and Greek, German and
 * French translations. Development only: `seed-markets.ts` runs everywhere,
 * this one never does.
 *
 *   pnpm --filter @shopblok/backend exec medusa exec ./src/scripts/seed-demo-catalog.ts
 *
 * Skip it with `SEED_DEMO=false` in the environment, or by passing `skip` as
 * the script's argument (`medusa exec ./src/scripts/seed-demo-catalog.ts skip`).
 * It refuses to run with `NODE_ENV=production`.
 *
 * Idempotent: categories, collections and products are found by their
 * deterministic handles, options by title, translations by
 * (reference_id, locale_code); only what is missing is created, so a second run
 * makes no change. It writes through core-flows workflows only, and needs
 * `seed-markets.ts` to have run first (sales channel, currencies).
 *
 * The last step indexes the demo products for search, and awaits it. The
 * `product.*` events the workflows emit are handled by the event bus in the
 * background, and `medusa exec` exits when the script returns, so without this
 * the index could be empty. With `REDIS_URL` set the events wait in Redis until
 * a server runs. The Search Module's `ingest` upserts the products and is safe
 * to repeat, but it throws while the index has no active version, which is the
 * state after `db:migrate` until a server has booted once (`medusa exec` does
 * not seed). In that state the script fills the whole index with `reindex`.
 */
import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  batchTranslationsWorkflow,
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

import {
  buildVariants,
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_OPTIONS,
  DEMO_PRODUCTS,
  PRODUCT_INDEX,
} from "./lib/demo-catalog";
import { SALES_CHANNEL_NAME, TRANSLATED_LOCALES } from "./lib/markets";
import {
  type DesiredTranslation,
  type ExistingTranslation,
  isDemoSkipped,
  missingBy,
  planTranslations,
} from "./lib/plan";

/** Products per awaited `ingest` call. */
const INGEST_CHUNK_SIZE = 50;

export default async function seedDemoCatalog({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  if (isDemoSkipped(args, process.env)) {
    logger.info("Demo catalog skipped (SEED_DEMO=false or the skip argument).");
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "seed-demo-catalog is for development only (D7) and won't run with NODE_ENV=production.",
    );
  }

  // ---- What seed-markets leaves behind ---------------------------------------

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["default_sales_channel_id", "supported_currencies.currency_code"],
    pagination: { take: 1 },
  });
  const store = stores[0];
  const storeCurrencies = new Set(
    (store?.supported_currencies ?? []).flatMap((c) => (c?.currency_code ? [c.currency_code] : [])),
  );
  const wantedCurrencies = Object.keys(DEMO_PRODUCTS[0].prices);
  const absent = wantedCurrencies.filter((c) => !storeCurrencies.has(c));
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });

  if (!store?.default_sales_channel_id || absent.length || !profiles[0]) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `The store isn't ready for the demo catalog (default sales channel: ${store?.default_sales_channel_id ?? "none"}, ` +
        `missing currencies: [${absent}], shipping profile: ${profiles[0]?.id ?? "none"}). ` +
        `Run seed-markets.ts first.`,
    );
  }

  const salesChannelId = store.default_sales_channel_id;
  const shippingProfileId = profiles[0].id;

  logger.info(
    `Seeding the demo catalog into the sales channel ${salesChannelId} (${SALES_CHANNEL_NAME})`,
  );

  // ---- Categories and collections --------------------------------------------

  const loadCategories = async () => {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id", "handle"],
      filters: { handle: DEMO_CATEGORIES.map((c) => c.handle) },
    });

    return data;
  };
  let categories = await loadCategories();
  const newCategories = missingBy(
    DEMO_CATEGORIES,
    categories.map((c) => c.handle),
    (c) => c.handle,
  );

  if (newCategories.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: newCategories.map((c) => ({
          name: c.name,
          handle: c.handle,
          is_active: true,
        })),
      },
    });
    categories = await loadCategories();
    logger.info(`Created categories: ${newCategories.map((c) => c.handle).join(", ")}`);
  } else {
    logger.info(`All ${DEMO_CATEGORIES.length} categories exist`);
  }

  const loadCollections = async () => {
    const { data } = await query.graph({
      entity: "product_collection",
      fields: ["id", "handle"],
      filters: { handle: DEMO_COLLECTIONS.map((c) => c.handle) },
    });

    return data;
  };
  let collections = await loadCollections();
  const newCollections = missingBy(
    DEMO_COLLECTIONS,
    collections.map((c) => c.handle),
    (c) => c.handle,
  );

  if (newCollections.length) {
    await createCollectionsWorkflow(container).run({
      input: {
        collections: newCollections.map((c) => ({
          title: c.title,
          handle: c.handle,
        })),
      },
    });
    collections = await loadCollections();
    logger.info(`Created collections: ${newCollections.map((c) => c.handle).join(", ")}`);
  } else {
    logger.info(`All ${DEMO_COLLECTIONS.length} collections exist`);
  }

  // ---- Shared options (Size, Color) ------------------------------------------

  const loadOptions = async () => {
    const { data } = await query.graph({
      entity: "product_option",
      fields: ["id", "title", "values.id", "values.value"],
      filters: { title: DEMO_OPTIONS.map((o) => o.title), is_exclusive: false },
    });

    return data;
  };
  let options = await loadOptions();
  const newOptions = missingBy(
    DEMO_OPTIONS,
    options.map((o) => o.title),
    (o) => o.title,
  );

  if (newOptions.length) {
    await createProductOptionsWorkflow(container).run({
      input: {
        product_options: newOptions.map((o) => ({
          title: o.title,
          values: o.values,
        })),
      },
    });
    options = await loadOptions();
    logger.info(`Created options: ${newOptions.map((o) => o.title).join(", ")}`);
  } else {
    logger.info(`All ${DEMO_OPTIONS.length} options exist`);
  }

  // ---- Products --------------------------------------------------------------

  const loadProducts = async () => {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { handle: DEMO_PRODUCTS.map((p) => p.handle) },
    });

    return data;
  };
  let products = await loadProducts();
  const newProducts = missingBy(
    DEMO_PRODUCTS,
    products.map((p) => p.handle ?? ""),
    (p) => p.handle,
  );

  if (newProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: newProducts.map((product) => ({
          title: product.title,
          handle: product.handle,
          description: product.description,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfileId,
          category_ids: [categories.find((c) => c.handle === product.category)!.id],
          collection_id: collections.find((c) => c.handle === product.collection)!.id,
          sales_channels: [{ id: salesChannelId }],
          options: Object.keys(product.options).map((title) => ({
            id: options.find((o) => o.title === title)!.id,
          })),
          variants: buildVariants(product),
        })),
      },
    });
    products = await loadProducts();
    logger.info(`Created products: ${newProducts.map((p) => p.handle).join(", ")}`);
  } else {
    logger.info(`All ${DEMO_PRODUCTS.length} products exist`);
  }

  // ---- Translations (el-GR, de-DE, fr-FR) ------------------------------------

  const desired: DesiredTranslation[] = [];
  const addTranslations = (
    reference: string,
    reference_id: string,
    byLocale: Record<string, Record<string, string>>,
  ) => {
    for (const locale_code of TRANSLATED_LOCALES) {
      desired.push({
        reference,
        reference_id,
        locale_code,
        translations: byLocale[locale_code],
      });
    }
  };

  for (const product of DEMO_PRODUCTS) {
    addTranslations(
      "product",
      products.find((p) => p.handle === product.handle)!.id,
      product.translations,
    );
  }

  for (const category of DEMO_CATEGORIES) {
    addTranslations(
      "product_category",
      categories.find((c) => c.handle === category.handle)!.id,
      Object.fromEntries(TRANSLATED_LOCALES.map((l) => [l, { name: category.translations[l] }])),
    );
  }

  for (const collection of DEMO_COLLECTIONS) {
    addTranslations(
      "product_collection",
      collections.find((c) => c.handle === collection.handle)!.id,
      Object.fromEntries(TRANSLATED_LOCALES.map((l) => [l, { title: collection.translations[l] }])),
    );
  }

  for (const option of DEMO_OPTIONS) {
    const row = options.find((o) => o.title === option.title)!;

    addTranslations(
      "product_option",
      row.id,
      Object.fromEntries(TRANSLATED_LOCALES.map((l) => [l, { title: option.translations[l] }])),
    );

    for (const [value, byLocale] of Object.entries(option.valueTranslations)) {
      addTranslations(
        "product_option_value",
        (row.values ?? []).find((v) => v?.value === value)!.id,
        Object.fromEntries(TRANSLATED_LOCALES.map((l) => [l, { value: byLocale[l] }])),
      );
    }
  }

  const translationModule = container.resolve(Modules.TRANSLATION);
  const existing = (await translationModule.listTranslations(
    {
      reference_id: desired.map((t) => t.reference_id),
      locale_code: [...TRANSLATED_LOCALES],
    },
    { take: null },
  )) as unknown as ExistingTranslation[];
  const plan = planTranslations(existing, desired);

  if (plan.create.length || plan.update.length) {
    await batchTranslationsWorkflow(container).run({
      input: { create: plan.create, update: plan.update, delete: [] },
    });
    logger.info(
      `Translations: created ${plan.create.length}, updated ${plan.update.length}, unchanged ${desired.length - plan.create.length - plan.update.length}`,
    );
  } else {
    logger.info(`All ${desired.length} translations exist`);
  }

  // ---- Search ----------------------------------------------------------------

  const search = container.resolve(Modules.SEARCH);
  const productIds = products.map((p) => p.id);
  const index = (await search.listIndexes()).find((i) => i.name === PRODUCT_INDEX);

  if (!index) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `The "${PRODUCT_INDEX}" search index isn't registered (src/search/product.ts).`,
    );
  }

  if (index.status === "ready") {
    for (let start = 0; start < productIds.length; start += INGEST_CHUNK_SIZE) {
      await search.ingest({
        name: "product.created",
        data: productIds.slice(start, start + INGEST_CHUNK_SIZE).map((id) => ({ id })),
      });
    }
    logger.info(`Indexed ${productIds.length} demo products for search (ingest).`);
  } else {
    // Never filled (`${index.status}`): no active version to ingest into yet.
    await search.reindex({ index: PRODUCT_INDEX });
    logger.info(
      `Filled the "${PRODUCT_INDEX}" search index from the database (reindex; it was ${index.status}).`,
    );
  }

  logger.info("Demo catalog is seeded.");
}
