/**
 * T73 (D89 to D92, D96): the markets plugin against a real Medusa. A country added to a region is
 * a closed market until it is saved, a save of a country and of the settings (the happy path and
 * the refusals with their reasons), the compensation that puts the old rows back when a step
 * after the write fails, the store's default region following the primary country, and who may
 * call `/admin/markets` and `/store/markets`. SETUP.md, "The markets plugin (T73)", lists a
 * mutation that fails each test.
 *
 * Needs the plugin built (`pnpm --filter @shopblok/medusa-markets build`). Run (the compose
 * stack's Postgres up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http markets.spec
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";
import { markets as fixtureMap } from "@shopblok/fixtures/markets";
import {
  saveMarketCountryWorkflow,
  saveMarketSettingsWorkflow,
} from "@shopblok/medusa-markets/workflows";

import { addStoreLocales, seedStore } from "./search-locale.fixtures";

jest.setTimeout(180_000);

const anyStatus = { validateStatus: () => true };

/** A signed-in admin's token, the way the dashboard's session would carry one. */
async function adminToken(container: MedusaContainer): Promise<string> {
  const users = container.resolve(Modules.USER);
  const auth = container.resolve(Modules.AUTH);
  const user = await users.createUsers({ email: `admin-${Date.now()}@example.com` });
  const identity = await auth.createAuthIdentities({
    provider_identities: [{ provider: "emailpass", entity_id: user.email }],
    app_metadata: { user_id: user.id },
  });
  const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig;
  return generateJwtToken(
    { actor_id: user.id, actor_type: "user", auth_identity_id: identity.id, app_metadata: {} },
    { secret: http.jwtSecret, expiresIn: "1h" },
  );
}

/** The markets module's service, for reading rows the routes do not show. */
function markets(container: MedusaContainer) {
  return container.resolve<{
    readCountries(): Promise<
      { code: string; enabled: boolean; time_zone: string | null; domain: string | null }[]
    >;
    readLanguages(): Promise<{ code: string; medusa_locale: string }[]>;
    readSettings(): Promise<{ primary_country: string | null; fallback_market: string | null }>;
  }>("markets");
}

async function storeDefaultRegion(container: MedusaContainer): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({ entity: "store", fields: ["default_region_id"] });
  return (data[0]?.default_region_id as string | null | undefined) ?? null;
}

/** Puts Austria in the seeded Europe region, in Medusa's own way (the region form). */
async function addAustria(container: MedusaContainer, regionId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "region",
    fields: ["countries.iso_2"],
    filters: { id: regionId },
  });
  const countries = (data[0]!.countries ?? []).flatMap((c) => (c?.iso_2 ? [c.iso_2] : []));
  await updateRegionsWorkflow(container).run({
    input: { selector: { id: regionId }, update: { countries: [...countries, "at"] } },
  });
}

/**
 * Makes the event bus refuse `shopblok.markets.updated`, the step after the write, and nothing else
 * (the modules emit their own events while they write, and those must go through).
 */
function failOnMarketsEvent(container: MedusaContainer) {
  const bus = container.resolve(Modules.EVENT_BUS);
  const original = bus.emit.bind(bus);
  return jest.spyOn(bus, "emit").mockImplementation(async (messages, options) => {
    const names = (Array.isArray(messages) ? messages : [messages]).map((message) => message.name);
    if (names.includes("shopblok.markets.updated")) throw new Error("bus down");
    return original(messages, options);
  });
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const auth = async () => ({
      headers: { authorization: `Bearer ${await adminToken(getContainer())}` },
    });
    const get = async () => (await api.get("/admin/markets", await auth())).data;
    const saveCountry = async (code: string, body: object) =>
      api.post(`/admin/markets/countries/${code}`, body, { ...(await auth()), ...anyStatus });
    const saveSettings = async (body: object) =>
      api.post("/admin/markets/settings", body, { ...(await auth()), ...anyStatus });

    describe("T73: the markets plugin", () => {
      it("seeds the fixtures' map, and answers it on /store/markets exactly", async () => {
        const { publishableKey } = await seedStore(getContainer());
        const response = await api.get("/store/markets", {
          headers: { "x-publishable-api-key": publishableKey },
        });
        expect(response.status).toBe(200);
        expect(response.data).toEqual({ markets: fixtureMap });
        const overview = await get();
        expect(overview.map).toEqual(fixtureMap);
        expect(overview.problems).toEqual([]);
        expect(overview.locales).toEqual(["en-US", "el-GR", "de-DE", "fr-FR"]);
        expect(overview.regions.map((r: { name: string }) => r.name)).toEqual([
          "Europe",
          "Switzerland",
          "United Kingdom",
          "United States",
        ]);
        expect(overview.countries).toHaveLength(6);
        expect(overview.countries.find((c: { code: string }) => c.code === "ch")).toMatchObject({
          region: { name: "Switzerland", currency_code: "chf" },
          enabled: true,
          languages: ["de", "fr"],
          time_zone: "Europe/Zurich",
          saved: true,
        });
      });

      it("seeds only while the module has no row, so a second seed keeps an admin's edit", async () => {
        const container = getContainer();
        await seedStore(container);
        await saveCountry("ch", { time_zone: "Europe/Berlin" });
        const { default: seedMarkets } = await import("../../src/scripts/seed-markets");
        await seedMarkets({ container, args: [] } as never);
        expect(
          (await markets(container).readCountries()).find((c) => c.code === "ch")?.time_zone,
        ).toBe("Europe/Berlin");
        expect(await markets(container).readCountries()).toHaveLength(6);
      });

      it("shows a country added to a region as a closed market until it is saved", async () => {
        const container = getContainer();
        const { regionId, publishableKey } = await seedStore(container);
        await addAustria(container, regionId);

        const before = await get();
        expect(before.countries.find((c: { code: string }) => c.code === "at")).toMatchObject({
          region: { id: regionId, name: "Europe", currency_code: "eur" },
          enabled: false,
          languages: [],
          saved: false,
        });
        const at = (map: typeof fixtureMap) => map.countries.find((c) => c.code === "at");
        const headers = { "x-publishable-api-key": publishableKey };
        expect(at((await api.get("/store/markets", { headers })).data.markets)).toEqual({
          code: "at",
          enabled: false,
          languages: [],
        });

        const saved = await saveCountry("at", {
          enabled: true,
          languages: ["de"],
          time_zone: "Europe/Vienna",
          domain: "https://Shop.Example.at/",
        });
        expect(saved.status).toBe(200);
        // The route answers what GET answers, after the save.
        expect(saved.data).toEqual(await get());
        expect(at((await api.get("/store/markets", { headers })).data.markets)).toEqual({
          code: "at",
          enabled: true,
          languages: ["de"],
          domain: "shop.example.at",
          timeZone: "Europe/Vienna",
        });
        // The new country comes after the seeded ones.
        const codes = (await api.get("/store/markets", { headers })).data.markets.countries.map(
          (c: { code: string }) => c.code,
        );
        expect(codes).toEqual(["cy", "us", "gb", "de", "fr", "ch", "at"]);
        // `de` already had a language row from the seed, so no second one.
        expect(
          (await markets(container).readLanguages()).filter((l) => l.code === "de"),
        ).toHaveLength(1);
      });

      it("fills a language row from the store's single locale of that language, and announces the save", async () => {
        const container = getContainer();
        const { regionId } = await seedStore(container);
        await addAustria(container, regionId);
        await addStoreLocales(container, ["it-IT"]);
        const seen: unknown[] = [];
        container
          .resolve(Modules.EVENT_BUS)
          .subscribe("shopblok.markets.updated", async (event) => {
            seen.push(event.data);
          });

        const saved = await saveCountry("at", { enabled: true, languages: ["de", "it"] });
        expect(saved.status).toBe(200);
        expect(saved.data.languages).toContainEqual({
          code: "it",
          medusa_locale: "it-IT",
          html_lang: null,
          rank: null,
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        expect(seen).toContainEqual({ scope: "country", codes: ["at"] });
      });

      it("saves the primary country, the fallback market and a language, and moves the store's default region", async () => {
        const container = getContainer();
        await seedStore(container);
        const overview = await get();
        const switzerland = overview.regions.find(
          (r: { name: string }) => r.name === "Switzerland",
        );

        const saved = await saveSettings({
          primary_country: "ch",
          fallback_market: "fr-ch",
          languages: [{ code: "de", medusa_locale: "de-DE", html_lang: "de-CH" }],
        });
        expect(saved.status).toBe(200);
        expect(saved.data.settings).toEqual({ primary_country: "ch", fallback_market: "fr-ch" });
        expect(saved.data.default_region_id).toBe(switzerland.id);
        expect(saved.data.map).toMatchObject({ primaryCountry: "ch", fallbackMarket: "fr-ch" });
        expect(saved.data.map.languages).toContainEqual({
          code: "de",
          medusaLocale: "de-DE",
          htmlLang: "de-CH",
        });
        expect(await storeDefaultRegion(container)).toBe(switzerland.id);
        expect(saved.data.problems).toEqual([]);
      });

      it("warns when the store's default region is changed away from the primary country's", async () => {
        const container = getContainer();
        const { regionId } = await seedStore(container);
        expect((await get()).problems.map((p: { code: string }) => p.code)).toEqual([]);
        await saveSettings({ primary_country: "cy" });
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data: stores } = await query.graph({ entity: "store", fields: ["id"] });
        const { data: regions } = await query.graph({
          entity: "region",
          fields: ["id"],
          filters: { currency_code: "usd" },
        });
        await updateStoresWorkflow(container).run({
          input: { selector: { id: stores[0]!.id }, update: { default_region_id: regions[0]!.id } },
        });
        const { problems } = await get();
        expect(problems.map((p: { code: string }) => p.code)).toEqual(["default_region_differs"]);
        // Saving the primary country again puts it right.
        expect(await storeDefaultRegion(container)).toBe(regions[0]!.id);
        await saveSettings({ primary_country: "cy" });
        expect(await storeDefaultRegion(container)).toBe(regionId);
        expect((await get()).problems).toEqual([]);
      });

      it("warns when the primary country leaves every region, and when a used locale is removed", async () => {
        const container = getContainer();
        const { regionId } = await seedStore(container);
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data } = await query.graph({
          entity: "region",
          fields: ["countries.iso_2"],
          filters: { id: regionId },
        });
        const kept = (data[0]!.countries ?? []).flatMap((c) =>
          c?.iso_2 && c.iso_2 !== "cy" ? [c.iso_2] : [],
        );
        await updateRegionsWorkflow(container).run({
          input: { selector: { id: regionId }, update: { countries: kept } },
        });
        const { data: stores } = await query.graph({ entity: "store", fields: ["id"] });
        await updateStoresWorkflow(container).run({
          input: {
            selector: { id: stores[0]!.id },
            update: { supported_locales: [{ locale_code: "en-US" }, { locale_code: "fr-FR" }] },
          },
        });
        const overview = await get();
        const codes = overview.problems.map((p: { code: string }) => p.code);
        expect(codes).toContain("primary_country_not_in_region");
        expect(codes).toContain("language_locale_gone");
        // Cyprus keeps its row but is out of the map.
        expect(overview.map.countries.some((c: { code: string }) => c.code === "cy")).toBe(false);
        expect((await markets(container).readCountries()).some((c) => c.code === "cy")).toBe(true);
      });

      describe("refusals", () => {
        it("refuses a country in no region, with the reason", async () => {
          await seedStore(getContainer());
          const response = await saveCountry("br", { enabled: false });
          expect(response.status).toBe(400);
          expect(response.data.problems).toEqual([
            expect.objectContaining({ code: "country_not_in_region" }),
          ]);
          expect(response.data.message).toContain("Settings → Regions");
          expect((await markets(getContainer()).readCountries()).some((c) => c.code === "br")).toBe(
            false,
          );
        });

        it("refuses a language the store has no locale for, an open country without a language and a bad zone, all at once", async () => {
          const container = getContainer();
          const { regionId } = await seedStore(container);
          await addAustria(container, regionId);
          const response = await saveCountry("at", {
            enabled: true,
            languages: ["it"],
            time_zone: "Mars/Olympus",
          });
          expect(response.status).toBe(400);
          expect(response.data.problems.map((p: { code: string }) => p.code).sort()).toEqual([
            "language_not_in_store",
            "time_zone_invalid",
          ]);
          const none = await saveCountry("at", { enabled: true });
          expect(none.data.problems.map((p: { code: string }) => p.code)).toEqual([
            "country_open_without_language",
          ]);
        });

        it("refuses closing the primary country, and a primary country that is not open", async () => {
          const container = getContainer();
          const { regionId } = await seedStore(container);
          await addAustria(container, regionId);
          const closing = await saveCountry("cy", { enabled: false });
          expect(closing.status).toBe(400);
          expect(closing.data.problems.map((p: { code: string }) => p.code)).toEqual([
            "primary_country_closed",
          ]);
          expect(
            (await markets(container).readCountries()).find((c) => c.code === "cy")?.enabled,
          ).toBe(true);

          const notOpen = await saveSettings({ primary_country: "at" });
          expect(notOpen.status).toBe(400);
          expect(notOpen.data.problems[0]).toMatchObject({ code: "primary_country_not_open" });
          expect((await markets(container).readSettings()).primary_country).toBe("cy");
        });

        it("refuses a fallback market that is not an open country-language pair", async () => {
          await seedStore(getContainer());
          for (const fallback_market of ["es-es", "el-us", "en_us"]) {
            const response = await saveSettings({ fallback_market });
            expect(response.status).toBe(400);
            expect(response.data.problems).toHaveLength(1);
          }
          expect((await markets(getContainer()).readSettings()).fallback_market).toBe("en-us");
        });

        it("refuses a language mapped to a locale the store lacks, and a duplicate domain", async () => {
          await seedStore(getContainer());
          const locale = await saveSettings({
            languages: [{ code: "de", medusa_locale: "de-CH" }],
          });
          expect(locale.status).toBe(400);
          expect(locale.data.problems[0]).toMatchObject({ code: "language_locale_unknown" });

          expect((await saveCountry("cy", { domain: "shop.example" })).status).toBe(200);
          const duplicate = await saveCountry("de", { domain: "SHOP.example" });
          expect(duplicate.status).toBe(400);
          expect(duplicate.data.problems[0]).toMatchObject({ code: "domain_duplicate" });
        });

        it("rejects a body the validator does not know, or an empty one", async () => {
          await seedStore(getContainer());
          expect((await saveCountry("cy", { timezone: "UTC" })).status).toBe(400);
          expect((await saveCountry("cy", {})).status).toBe(400);
          expect((await saveSettings({})).status).toBe(400);
        });
      });

      describe("compensation", () => {
        it("puts a country's old rows back when a step after the write fails", async () => {
          const container = getContainer();
          const { regionId } = await seedStore(container);
          await addAustria(container, regionId);
          const before = await markets(container).readCountries();
          const languagesBefore = await markets(container).readLanguages();
          await addStoreLocales(container, ["it-IT"]);

          // The event is the step after the write; the bus refusing it fails the run.
          const emit = failOnMarketsEvent(container);
          await expect(
            saveMarketCountryWorkflow(container).run({
              input: { code: "at", enabled: true, languages: ["it"], time_zone: "Europe/Vienna" },
            }),
          ).rejects.toMatchObject({ message: expect.stringContaining("bus down") });
          emit.mockRestore();

          // The new country row and the new language row are gone again.
          expect(await markets(container).readCountries()).toEqual(before);
          expect(await markets(container).readLanguages()).toEqual(languagesBefore);

          // A row the run changed gets its old values back.
          const mock = failOnMarketsEvent(container);
          await expect(
            saveMarketCountryWorkflow(container).run({
              input: { code: "ch", languages: ["de"], time_zone: "Europe/Berlin" },
            }),
          ).rejects.toMatchObject({ message: expect.stringContaining("bus down") });
          mock.mockRestore();
          expect(await markets(container).readCountries()).toEqual(before);
        });

        it("keeps nothing of a write that fails halfway, with no compensation to undo it", async () => {
          const container = getContainer();
          const { regionId } = await seedStore(container);
          await addAustria(container, regionId);
          await addStoreLocales(container, ["it-IT"]);
          // Cyprus takes the domain first, so a second country asking for it hits the unique index.
          expect((await saveCountry("cy", { domain: "shop.example" })).status).toBe(200);
          const countriesBefore = await markets(container).readCountries();
          const languagesBefore = await markets(container).readLanguages();

          // Two admins save at nearly the same time: the plan of the second one read the rows
          // before the first one's write, so it finds no duplicate. The plan reads the countries
          // through `readCountries`, once; the answer here is what it would have seen.
          const service = markets(container);
          const original = service.readCountries.bind(service);
          const stale = jest
            .spyOn(service, "readCountries")
            .mockImplementationOnce(async () =>
              (await original()).map((row) => ({ ...row, domain: null })),
            );
          // The `it` language row is written first (a new one), the country second, and that fails.
          const response = await saveCountry("at", {
            enabled: true,
            languages: ["de", "it"],
            domain: "shop.example",
          });
          stale.mockRestore();

          // The unique index refuses it, and Medusa answers that as invalid data.
          expect(response.status).toBe(400);
          expect(response.data.message).toContain("already exists");
          // The language row the failed save created before the country is not left behind.
          expect(await markets(container).readLanguages()).toEqual(languagesBefore);
          expect(await markets(container).readCountries()).toEqual(countriesBefore);
        });

        it("puts the settings, the language rows and the store's default region back", async () => {
          const container = getContainer();
          await seedStore(container);
          await saveSettings({ primary_country: "cy" });
          const settingsBefore = await markets(container).readSettings();
          const languagesBefore = await markets(container).readLanguages();
          const regionBefore = await storeDefaultRegion(container);
          const overview = await get();
          const gb = overview.regions.find((r: { name: string }) => r.name === "United Kingdom");

          const emit = failOnMarketsEvent(container);
          await expect(
            saveMarketSettingsWorkflow(container).run({
              input: {
                primary_country: "gb",
                fallback_market: "en-gb",
                languages: [{ code: "en", medusa_locale: "en-US", html_lang: "en-GB" }],
              },
            }),
          ).rejects.toMatchObject({ message: expect.stringContaining("bus down") });
          emit.mockRestore();

          expect(gb.id).not.toBe(regionBefore);
          expect(await markets(container).readSettings()).toEqual(settingsBefore);
          expect(await markets(container).readLanguages()).toEqual(languagesBefore);
          expect(await storeDefaultRegion(container)).toBe(regionBefore);
        });
      });

      describe("who may call", () => {
        it("answers /store/markets with the publishable key and refuses it without", async () => {
          const { publishableKey } = await seedStore(getContainer());
          const without = await api.get("/store/markets", anyStatus);
          expect(without.status).toBe(400);
          expect(without.data.message).toMatch(/publishable/i);
          const wrong = await api.get("/store/markets", {
            headers: { "x-publishable-api-key": "pk_nope" },
            ...anyStatus,
          });
          expect([400, 401]).toContain(wrong.status);
          const ok = await api.get("/store/markets", {
            headers: { "x-publishable-api-key": publishableKey },
          });
          expect(ok.status).toBe(200);
          expect(Object.keys(ok.data)).toEqual(["markets"]);
        });

        it("answers /admin/markets to an admin only", async () => {
          const container = getContainer();
          await seedStore(container);
          for (const response of [
            await api.get("/admin/markets", anyStatus),
            await api.post("/admin/markets/countries/cy", { enabled: true }, anyStatus),
            await api.post("/admin/markets/settings", { primary_country: "cy" }, anyStatus),
          ]) {
            expect(response.status).toBe(401);
          }
          // A secret API key is an admin credential to Medusa's own `/admin` middleware.
          const { result } = await createApiKeysWorkflow(container).run({
            input: { api_keys: [{ title: "markets-test", type: "secret", created_by: "" }] },
          });
          const basic = Buffer.from(`${result[0]!.token}:`).toString("base64");
          expect(
            (await api.get("/admin/markets", { headers: { authorization: `Basic ${basic}` } }))
              .status,
          ).toBe(200);
          expect((await api.get("/admin/markets", await auth())).status).toBe(200);
        });
      });
    });
  },
});
