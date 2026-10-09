/**
 * Seeds what the storefront's markets need (M0 plan, T07 and D7). Runs in every
 * environment, development and production, so it creates no demo data.
 *
 *   pnpm --filter @shopblok/backend exec medusa exec ./src/scripts/seed-markets.ts
 *
 * Idempotent: each entity is looked up first and only created when it is
 * missing, so a second run makes no change. It writes through core-flows
 * workflows only. Needs the database up, and Redis when `REDIS_URL` is set.
 *
 * Medusa itself creates the store, the default sales channel and a publishable
 * key linked to it each time the app boots, so a script always finds them.
 * This seed completes them: the store gets EUR as default plus USD, GBP and
 * CHF, and the four locales of D8. It then adds four regions with a tax region
 * per country, and fulfilment: a stock location with one fulfilment set, one
 * service zone per region and a "Standard" shipping option in each, priced in
 * the region's currency.
 */
import type { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  FeatureFlag,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createLinksWorkflow,
  createLocationFulfillmentSetWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

import {
  FULFILLMENT_PROVIDER_ID,
  FULFILLMENT_SET_NAME,
  MARKET_REGIONS,
  PAYMENT_PROVIDER_ID,
  PUBLISHABLE_KEY_TITLE,
  SALES_CHANNEL_NAME,
  SHIPPING_OPTION_NAME,
  STOCK_LOCATION_ADDRESS,
  STOCK_LOCATION_NAME,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  TAX_PROVIDER_ID,
} from "./lib/markets";
import { countryDrift, missingBy, storeDrift } from "./lib/plan";

/** The parts of a publishable key this script reads. */
type KeyRow = { id: string; sales_channels?: ({ id: string } | null)[] | null };

export default async function seedMarkets({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // `supported_locales` exists only while the Translation Module is on, and the
  // store query below asks for it.
  if (!FeatureFlag.isFeatureEnabled("translation")) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "The translation feature flag is off, so the store's locales can't be set. " +
        "Remove MEDUSA_FF_TRANSLATION=false from the environment (a blank value counts as off too).",
    );
  }

  // ---- Store: Medusa's default one, completed -------------------------------

  const { data: stores } = await query.graph({
    entity: "store",
    fields: [
      "id",
      "default_sales_channel_id",
      "supported_currencies.currency_code",
      "supported_currencies.is_default",
      "supported_locales.locale_code",
    ],
    pagination: { take: 1 },
  });
  const store = stores[0];

  if (!store) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No store found. Medusa creates the default store each time the app boots, so this means the database has no tables: run `medusa db:migrate` first.",
    );
  }

  // ---- Sales channel: the store's default -----------------------------------

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: store.default_sales_channel_id
      ? { id: store.default_sales_channel_id }
      : { name: SALES_CHANNEL_NAME },
  });
  let channel: { id: string; name: string } | undefined = channels[0];

  if (channel) {
    logger.info(`Sales channel "${channel.name}" exists (${channel.id})`);
  } else {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: SALES_CHANNEL_NAME,
            description: "The storefront's sales channel",
          },
        ],
      },
    });

    channel = { id: result[0].id, name: result[0].name };
    logger.info(`Created sales channel "${SALES_CHANNEL_NAME}" (${channel.id})`);
  }

  const storeTarget = {
    default_sales_channel_id: channel.id,
    supported_currencies: SUPPORTED_CURRENCIES.map((c) => ({ ...c })),
    supported_locales: SUPPORTED_LOCALES.map((locale_code) => ({
      locale_code,
    })),
  };
  const drift = storeDrift(store, storeTarget);

  if (drift.length) {
    await updateStoresWorkflow(container).run({
      input: { selector: { id: store.id }, update: storeTarget },
    });
    logger.info(`Updated store ${store.id}: ${drift.join(", ")}`);
  } else {
    logger.info(`Store ${store.id} is up to date`);
  }

  // ---- Publishable key, linked to the sales channel -------------------------

  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "revoked_at", "sales_channels.id"],
    filters: { type: "publishable", title: PUBLISHABLE_KEY_TITLE },
  });
  let key: KeyRow | undefined = keys.find((k) => !k.revoked_at);

  if (key) {
    logger.info(`Publishable key "${PUBLISHABLE_KEY_TITLE}" exists (${key.id})`);
  } else {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: PUBLISHABLE_KEY_TITLE,
            type: "publishable",
            created_by: "seed-markets",
          },
        ],
      },
    });

    key = { id: result[0].id, sales_channels: [] };
    logger.info(`Created publishable key "${PUBLISHABLE_KEY_TITLE}" (${key.id})`);
  }

  if (!(key.sales_channels ?? []).some((c) => c?.id === channel.id)) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: key.id, add: [channel.id] },
    });
    logger.info(`Linked key ${key.id} to "${channel.name}"`);
  }

  // ---- Regions and a tax region per country ---------------------------------

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });

  for (const wanted of MARKET_REGIONS) {
    const found = regions.find((r) => r.name === wanted.name);

    if (!found) {
      continue;
    }

    const drift = countryDrift(
      (found.countries ?? []).flatMap((c) => (c?.iso_2 ? [c.iso_2] : [])),
      wanted.countries,
    );

    if (
      found.currency_code !== wanted.currency_code ||
      drift.missing.length ||
      drift.extra.length
    ) {
      logger.warn(
        `Region "${wanted.name}" differs from the seed (currency ${found.currency_code}, ` +
          `missing countries [${drift.missing}], extra [${drift.extra}]). Left as it is.`,
      );
    }
  }

  const newRegions = missingBy(
    MARKET_REGIONS,
    regions.map((r) => r.name),
    (r) => r.name,
  );

  if (newRegions.length) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: newRegions.map((r) => ({
          name: r.name,
          currency_code: r.currency_code,
          countries: r.countries,
          payment_providers: [PAYMENT_PROVIDER_ID],
        })),
      },
    });
    logger.info(`Created regions: ${newRegions.map((r) => r.name).join(", ")}`);
  } else {
    logger.info(`All ${MARKET_REGIONS.length} regions exist`);
  }

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
    filters: { parent_id: null },
  });
  const newTaxCountries = missingBy(
    MARKET_REGIONS.flatMap((r) => r.countries),
    taxRegions.map((t) => t.country_code ?? ""),
    (country) => country,
  );

  if (newTaxCountries.length) {
    await createTaxRegionsWorkflow(container).run({
      input: newTaxCountries.map((country_code) => ({
        country_code,
        provider_id: TAX_PROVIDER_ID,
      })),
    });
    logger.info(`Created tax regions: ${newTaxCountries.join(", ")}`);
  } else {
    logger.info("All tax regions exist");
  }

  // ---- Fulfilment: stock location, one service zone and option per region ---

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });

  if (!profiles[0]) {
    // Created by one of Medusa's own migration scripts (`db:migrate`).
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No shipping profile found. Run `medusa db:migrate` first.",
    );
  }

  const locationFields = [
    "id",
    "name",
    "fulfillment_providers.id",
    "sales_channels.id",
    "fulfillment_sets.id",
    "fulfillment_sets.name",
    "fulfillment_sets.service_zones.id",
    "fulfillment_sets.service_zones.name",
  ];
  const loadLocation = async () => {
    const { data } = await query.graph({
      entity: "stock_location",
      fields: locationFields,
      filters: { name: STOCK_LOCATION_NAME },
    });

    return data[0];
  };
  let location = await loadLocation();

  if (!location) {
    await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{ name: STOCK_LOCATION_NAME, address: STOCK_LOCATION_ADDRESS }],
      },
    });
    location = await loadLocation();
    logger.info(`Created stock location "${STOCK_LOCATION_NAME}" (${location.id})`);
  } else {
    logger.info(`Stock location "${STOCK_LOCATION_NAME}" exists (${location.id})`);
  }

  if (!(location.fulfillment_providers ?? []).some((p) => p?.id === FULFILLMENT_PROVIDER_ID)) {
    await createLinksWorkflow(container).run({
      input: [
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
          [Modules.FULFILLMENT]: {
            fulfillment_provider_id: FULFILLMENT_PROVIDER_ID,
          },
        },
      ],
    });
    logger.info(`Linked the stock location to ${FULFILLMENT_PROVIDER_ID}`);
  }

  if (!(location.sales_channels ?? []).some((c) => c?.id === channel.id)) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [channel.id] },
    });
    logger.info(`Linked the stock location to "${channel.name}"`);
  }

  let fulfillmentSet = (location.fulfillment_sets ?? []).find(
    (set) => set?.name === FULFILLMENT_SET_NAME,
  );

  if (!fulfillmentSet) {
    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: location.id,
        fulfillment_set_data: { name: FULFILLMENT_SET_NAME, type: "shipping" },
      },
    });
    location = await loadLocation();
    fulfillmentSet = (location.fulfillment_sets ?? []).find(
      (set) => set?.name === FULFILLMENT_SET_NAME,
    );
    logger.info(`Created fulfilment set "${FULFILLMENT_SET_NAME}"`);
  }

  const fulfillmentSetId = fulfillmentSet!.id;
  const newZones = missingBy(
    MARKET_REGIONS,
    (fulfillmentSet!.service_zones ?? []).flatMap((z) => (z?.name ? [z.name] : [])),
    (r) => r.name,
  );

  if (newZones.length) {
    await createServiceZonesWorkflow(container).run({
      input: {
        data: newZones.map((r) => ({
          name: r.name,
          fulfillment_set_id: fulfillmentSetId,
          geo_zones: r.countries.map((country_code) => ({
            type: "country" as const,
            country_code,
          })),
        })),
      },
    });
    logger.info(`Created service zones: ${newZones.map((r) => r.name).join(", ")}`);
    location = await loadLocation();
    fulfillmentSet = (location.fulfillment_sets ?? []).find((set) => set?.id === fulfillmentSetId);
  }

  const zones = fulfillmentSet!.service_zones ?? [];
  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
    filters: { service_zone_id: zones.flatMap((z) => (z ? [z.id] : [])) },
  });
  const zoneHasOption = new Set(
    options.filter((o) => o.name === SHIPPING_OPTION_NAME).map((o) => o.service_zone_id),
  );
  const newOptions = MARKET_REGIONS.flatMap((region) => {
    const zone = zones.find((z) => z?.name === region.name);

    return zone && !zoneHasOption.has(zone.id) ? [{ region, zone }] : [];
  });

  if (newOptions.length) {
    await createShippingOptionsWorkflow(container).run({
      input: newOptions.map(({ region, zone }) => ({
        name: SHIPPING_OPTION_NAME,
        price_type: "flat" as const,
        provider_id: FULFILLMENT_PROVIDER_ID,
        service_zone_id: zone.id,
        shipping_profile_id: profiles[0].id,
        type: {
          label: "Standard",
          description: "Ships in 3 to 5 working days.",
          code: "standard",
        },
        prices: [{ currency_code: region.currency_code, amount: region.standard_shipping }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
          { attribute: "is_return", value: "false", operator: "eq" as const },
        ],
      })),
    });
    logger.info(
      `Created "${SHIPPING_OPTION_NAME}" shipping options: ${newOptions.map((o) => o.region.name).join(", ")}`,
    );
  } else {
    logger.info(`All "${SHIPPING_OPTION_NAME}" shipping options exist`);
  }

  logger.info("Markets are seeded.");
}
