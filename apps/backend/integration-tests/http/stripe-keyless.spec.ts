/**
 * T100 (M6 D117): the shop after Stripe's keys are removed. A database that had Stripe on every
 * region (the provider's row, which Medusa keeps and marks disabled once it no longer loads it, and
 * each region's link to it) and a backend that starts without the keys: `sync-stripe-regions` takes
 * Stripe off every region (two-way: one that only added it would leave the regions offering a
 * provider that cannot take a payment, `GET /store/payment-providers` still lists it), and a
 * checkout completes with "Pay later" on a positive total, as before M6. No request goes to Stripe.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http stripe-keyless.spec
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import seedMarkets from "../../src/scripts/seed-markets";
import seedDemoCatalog from "../../src/scripts/seed-demo-catalog";
import { stripeRegistered, syncStripeRegions } from "../../src/lib/stripe-regions";

jest.setTimeout(240_000);

// No keys, whatever the shell has: the backend starts as a shop whose keys were removed.
process.env.STRIPE_API_KEY = "";
process.env.STRIPE_WEBHOOK_SECRET = "";

const STRIPE = "pp_stripe_stripe";
const SYSTEM = "pp_system_default";

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T100: Stripe's keys removed", () => {
      let store: Record<string, string>;

      beforeEach(async () => {
        const container = getContainer();
        const fulfillment = container.resolve(Modules.FULFILLMENT);
        if ((await fulfillment.listShippingProfiles({ type: "default" })).length === 0)
          await fulfillment.createShippingProfiles({
            name: "Default Shipping Profile",
            type: "default",
          });
        await seedMarkets({ container, args: [] } as never);
        await seedDemoCatalog({ container, args: [] } as never);
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data: keys } = await query.graph({
          entity: "api_key",
          fields: ["token"],
          filters: { type: "publishable" },
        });
        store = { "x-publishable-api-key": keys[0]!.token };

        // What a run with the keys left behind: Stripe's provider row, now disabled, on every region.
        const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
        await pg.raw(
          "insert into payment_provider (id, is_enabled) values (?, false) on conflict (id) do update set is_enabled = false",
          [STRIPE],
        );
        const { data: regions } = await query.graph({ entity: "region", fields: ["id"] });
        const link = container.resolve(ContainerRegistrationKeys.LINK);
        await link.create(
          regions.map((region: { id: string }) => ({
            [Modules.REGION]: { region_id: region.id },
            [Modules.PAYMENT]: { payment_provider_id: STRIPE },
          })),
        );
      });

      const providersOf = async (regionId: string) => {
        const { data } = await api.get(`/store/payment-providers?region_id=${regionId}`, {
          headers: store,
        });
        return (data.payment_providers as { id: string }[]).map((p) => p.id).sort();
      };

      it("takes Stripe off every region, and a checkout completes with Pay later", async () => {
        const container = getContainer();
        expect(await stripeRegistered(container)).toBe(false);
        const { data } = await api.get("/store/regions", { headers: store });
        const regions = data.regions as { id: string; currency_code: string }[];
        // Before the sync: the regions still offer the provider that cannot take a payment.
        expect(await providersOf(regions[0]!.id)).toContain(STRIPE);

        const synced = await syncStripeRegions(container);
        expect(synced.stripe).toBe(false);
        expect(synced.changed.length).toBe(regions.length);
        for (const region of regions) expect(await providersOf(region.id)).toEqual([SYSTEM]);
        expect((await syncStripeRegions(container)).changed).toEqual([]);

        // The checkout as at M5's end: the system payment on a positive total, and an order.
        const europe = regions.find((r) => r.currency_code === "eur")!;
        const { data: products } = await api.get(`/store/products?region_id=${europe.id}&limit=1`, {
          headers: store,
        });
        const { data: created } = await api.post(
          "/store/carts",
          { region_id: europe.id, email: "keyless@example.com" },
          { headers: store },
        );
        const id = created.cart.id as string;
        await api.post(
          `/store/carts/${id}/line-items`,
          { variant_id: products.products[0].variants[0].id, quantity: 1 },
          { headers: store },
        );
        await api.post(
          `/store/carts/${id}`,
          {
            shipping_address: {
              first_name: "Jonas",
              last_name: "Müller",
              address_1: "Hauptstraße 1",
              postal_code: "10115",
              city: "Berlin",
              country_code: "de",
            },
          },
          { headers: store },
        );
        const { data: options } = await api.get(`/store/shipping-options?cart_id=${id}`, {
          headers: store,
        });
        await api.post(
          `/store/carts/${id}/shipping-methods`,
          { option_id: options.shipping_options[0].id },
          { headers: store },
        );
        const { data: collection } = await api.post(
          "/store/payment-collections",
          { cart_id: id },
          { headers: store },
        );
        expect(collection.payment_collection.amount).toBeGreaterThan(0);
        await api.post(
          `/store/payment-collections/${collection.payment_collection.id}/payment-sessions`,
          { provider_id: SYSTEM },
          { headers: store },
        );
        const { data: completed } = await api.post(
          `/store/carts/${id}/complete`,
          {},
          {
            headers: store,
          },
        );
        expect(completed.type).toBe("order");
      });
    });
  },
});
