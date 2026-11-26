/**
 * T110 (M7 D147): `GET /store/sale-ends`, the end date of each active sale among the price lists a
 * product page's prices come from, for its JSON-LD's `priceValidUntil`. An active sale with an end
 * is answered; one without an end, a draft, an override list and an unknown id are left out; more
 * than 100 ids, or an id that is not a price list's, is a 400; the publishable key is required as
 * on every store route.
 *
 * Run (the compose stack's Postgres up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http sale-ends.spec
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";

import { seedStore } from "./search-locale.fixtures";

jest.setTimeout(180_000);

const anyStatus = { validateStatus: () => true };

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/sale-ends", () => {
      it("answers the end of each active sale named, and nothing of the others", async () => {
        const container = getContainer();
        const { publishableKey } = await seedStore(container);
        const pricing = container.resolve(Modules.PRICING);
        const ends = "2027-01-31T22:00:00.000Z";
        const [sale, endless, draft, override] = await pricing.createPriceLists([
          { title: "Winter sale", description: "e2e", type: "sale", status: "active", ends_at: ends },
          { title: "Always on", description: "e2e", type: "sale", status: "active" },
          { title: "Draft", description: "e2e", type: "sale", status: "draft", ends_at: ends },
          {
            title: "Trade prices",
            description: "e2e",
            type: "override",
            status: "active",
            ends_at: ends,
          },
        ]);
        const headers = { "x-publishable-api-key": publishableKey };
        const ids = [sale!.id, endless!.id, draft!.id, override!.id, "plist_01UNKNOWN"];
        const query = ids.map((id) => `id=${id}`).join("&");
        const answer = await api.get(`/store/sale-ends?${query}`, { headers });
        expect(answer.status).toBe(200);
        expect(answer.data).toEqual({ sale_ends: { [sale!.id]: ends } });

        const none = await api.get("/store/sale-ends", { headers });
        expect(none.data).toEqual({ sale_ends: {} });
      });

      it("refuses ids that are not price lists', more than 100, and a call without the key", async () => {
        const { publishableKey } = await seedStore(getContainer());
        const headers = { "x-publishable-api-key": publishableKey };
        const odd = await api.get("/store/sale-ends?id=prod_1", { headers, ...anyStatus });
        expect(odd.status).toBe(400);
        const many = Array.from({ length: 101 }, (_, i) => `id=plist_${i}`).join("&");
        const tooMany = await api.get(`/store/sale-ends?${many}`, { headers, ...anyStatus });
        expect(tooMany.status).toBe(400);
        const keyless = await api.get("/store/sale-ends", anyStatus);
        expect(keyless.status).toBe(400);
      });
    });
  },
});
