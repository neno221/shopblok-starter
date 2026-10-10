/**
 * S2 prototype (not for main, D13): per-locale search over Medusa 2.21's Search Module, M0 plan
 * §6 S2, tests T1 to T9. One app runs five index definitions over the same data, so each
 * candidate is tested on identical products:
 *
 *   s2_pg_a   candidate A on search-postgres      s2_ms_a   A on Meilisearch
 *   s2_pg_ap  candidate A' on search-postgres     s2_ms_ap  A' on Meilisearch
 *                                                 s2_ms_b   candidate B on Meilisearch
 *
 * Run (the compose stack up, `pnpm bootstrap` done, from the repo root):
 *
 *   DB_HOST=localhost DB_PORT=15432 DB_USERNAME=postgres DB_PASSWORD=postgres \
 *     pnpm --filter @shopblok/backend test:integration:http search-locale
 *
 * `S2_REPORT=<file>` writes every recorded result as JSON; `S2_T8_PRODUCTS` sets the size of
 * T8's catalog (1000). Tests that only record a result (the plan marks T3 informational for
 * Postgres, T8 and T9's Mongolian case as "recorded") call `record()`; every other check is an
 * `expect`.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  deleteTranslationsWorkflow,
  updateStoresWorkflow,
  updateTranslationsWorkflow,
  batchTranslationsWorkflow,
} from "@medusajs/medusa/core-flows";
import { writeFileSync } from "fs";
import type { MedusaContainer } from "@medusajs/framework/types";

import {
  localizedFields,
  localizedSearchOptions,
  S2_INDEXES,
  type S2Index,
} from "../../src/search/helpers/s2-shared";
import {
  createCatalog,
  createCategory,
  generatedText,
  createProduct,
  INDEX_PREFIX,
  KNITWEAR_CATEGORY,
  LINEN_SHIRT,
  readyIndexes,
  resync,
  type Seeded,
  seedStore,
  settle,
  SHIRTS_CATEGORY,
  until,
  WOOL_SWEATER,
} from "./search-locale.fixtures";

jest.setTimeout(900_000);

type Recorded = { test: string; index: string; outcome: string; detail?: unknown };
const recorded: Recorded[] = [];
const record = (test: string, index: string, outcome: string, detail?: unknown) => {
  recorded.push({ test, index, outcome, detail });
};

/**
 * Changes one translation the way the admin does: by id, as `batchTranslationsWorkflow` does.
 * `updateTranslationsWorkflow` with a `selector` (the form its own docs show first) throws in
 * its event step in 2.21.2, because the service returns one object there and the workflow calls
 * `.map` on it, so it never emits `translation.updated`.
 */
async function changeTranslation(
  container: MedusaContainer,
  referenceId: string,
  locale: string,
  changes: Record<string, string>,
) {
  const service = container.resolve(Modules.TRANSLATION);
  const [existing] = await service.listTranslations({
    reference_id: referenceId,
    locale_code: locale,
  });

  await updateTranslationsWorkflow(container).run({
    input: {
      translations: [
        { id: existing!.id, translations: { ...(existing!.translations as object), ...changes } },
      ],
    },
  });
}

const MEILI = process.env.MEILISEARCH_HOST ?? "http://localhost:7701";
const MEILI_KEY = process.env.MEILISEARCH_API_KEY ?? "";

async function meili<T = any>(method: string, path: string): Promise<T> {
  const response = await fetch(`${MEILI}${path}`, {
    method,
    headers: MEILI_KEY ? { authorization: `Bearer ${MEILI_KEY}` } : {},
  });

  return (await response.json()) as T;
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("S2: search per locale", () => {
      let seeded: Seeded;
      let linenId: string;
      let sweaterId: string;
      let shirtsCategoryId: string;
      let headers: Record<string, string>;

      /** `/store/search`, as a storefront would call it for one locale. */
      const searchStore = async (
        index: S2Index,
        q: string,
        locale: string,
        extra: {
          search_options?: Record<string, unknown>;
          facets?: unknown[];
          fields?: string[];
          raw?: boolean;
        } = {},
      ) => {
        const response = await api.post(
          "/store/search",
          {
            entity: index.name,
            filters: q ? { q } : {},
            ...(extra.fields ? { fields: extra.fields } : {}),
            search_options: {
              ...(extra.raw ? {} : localizedSearchOptions(index, locale)),
              ...(extra.facets ? { facets: extra.facets } : {}),
              ...(extra.search_options ?? {}),
            },
          },
          { headers, validateStatus: () => true },
        );

        return response;
      };

      const hitIds = async (index: S2Index, q: string, locale: string, extra = {}) => {
        const response = await searchStore(index, q, locale, extra);

        if (response.status !== 200) {
          throw new Error(
            `${index.name} q=${q} locale=${locale}: HTTP ${response.status} ${JSON.stringify(response.data)}`,
          );
        }

        return (response.data.results[0].hits as { id: string }[]).map((hit) => hit.id);
      };

      beforeAll(async () => {
        const container = getContainer();

        await readyIndexes(container);
        seeded = await seedStore(container);
        headers = { "x-publishable-api-key": seeded.publishableKey };

        shirtsCategoryId = await createCategory(container, SHIRTS_CATEGORY, "shirts");
        const knitwearId = await createCategory(container, KNITWEAR_CATEGORY, "knitwear");

        linenId = await createProduct(container, seeded, {
          handle: "linen-shirt",
          text: LINEN_SHIRT,
          categoryId: shirtsCategoryId,
        });
        sweaterId = await createProduct(container, seeded, {
          handle: "wool-sweater",
          text: WOOL_SWEATER,
          categoryId: knitwearId,
        });

        // The workflows' events are handled in the background, one index after the other. Wait
        // for them, then ingest once more so the indexes hold the finished products.
        await settle();
        await resync(container, [linenId, sweaterId]);
      });

      afterAll(async () => {
        if (process.env.S2_REPORT) {
          writeFileSync(process.env.S2_REPORT, JSON.stringify(recorded, null, 2));
        }

        console.log(`S2 RESULTS\n${recorded.map((r) => JSON.stringify(r)).join("\n")}`);

        // Meilisearch is shared with the dev stack: leave nothing of this run behind.
        const { results } = await meili<{ results: { uid: string }[] }>("GET", "/indexes?limit=1000");

        for (const { uid } of results.filter(({ uid }) => uid.startsWith(`${INDEX_PREFIX}_`))) {
          await meili("DELETE", `/indexes/${uid}`);
        }
      });

      // ---- T1 ----------------------------------------------------------------------------

      describe("T1: each locale finds the shirt by its own words", () => {
        const cases = [
          ["el-GR", "πουκάμισο"],
          ["de-DE", "Leinenhemd"],
          ["fr-FR", "chemise"],
          ["en-US", "shirt"],
        ] as const;

        for (const index of S2_INDEXES) {
          it(`${index.name}`, async () => {
            for (const [locale, q] of cases) {
              const ids = await hitIds(index, q, locale);

              expect({ locale, q, hit: ids.includes(linenId) }).toEqual({ locale, q, hit: true });
              // The sweater has none of these words: a match on it would mean a loose query.
              expect(ids).not.toContain(sweaterId);
            }

            record("T1", index.name, "pass");
          });
        }
      });

      // ---- T2 ----------------------------------------------------------------------------

      describe("T2: accents and tonos are ignored", () => {
        const cases = [
          ["el-GR", "πουκαμισο"],
          ["el-GR", "ΠΟΥΚΑΜΙΣΟ"],
          ["fr-FR", "legere"],
          ["fr-FR", "LÉGÈRE"],
        ] as const;

        for (const index of S2_INDEXES) {
          it(`${index.name}`, async () => {
            for (const [locale, q] of cases) {
              const ids = await hitIds(index, q, locale);

              expect({ locale, q, hit: ids.includes(linenId) }).toEqual({ locale, q, hit: true });
            }

            record("T2", index.name, "pass");
          });
        }
      });

      // ---- T3 ----------------------------------------------------------------------------

      describe("T3: isolation, a German word does not hit Greek", () => {
        for (const index of S2_INDEXES) {
          it(`${index.name}`, async () => {
            const leaks = (await hitIds(index, "Leinenhemd", "el-GR")).includes(linenId);

            record("T3", index.name, leaks ? "leaks" : "isolated");

            // Required for Meilisearch with B; informational everywhere else (plan, T3). A' holds
            // every language in one field, so it leaks by design.
            if (index.name === "s2_ms_b") {
              expect(leaks).toBe(false);
            }
          });
        }

        // Meilisearch isolates a language by itself when it is sent a language hint, so the
        // provider's own restriction to the locale's attributes is only tested by a locale with no
        // hint: Mongolian is not among the languages Meilisearch accepts.
        for (const index of S2_INDEXES.filter((i) => i.variant !== "ap")) {
          it(`${index.name} isolates a locale Meilisearch has no language for (mn-MN)`, async () => {
            const german = (await hitIds(index, "Leinenhemd", "mn-MN")).includes(linenId);
            const own = (await hitIds(index, "Маалинган", "mn-MN")).includes(linenId);

            expect({ german, own }).toEqual({ german: false, own: true });
          });
        }

        it("the Meilisearch provider isolates candidate A through `locales` alone", async () => {
          const index = S2_INDEXES.find((i) => i.name === "s2_ms_a")!;
          const leaks = (await hitIds(index, "Leinenhemd", "el-GR")).includes(linenId);
          const own = (await hitIds(index, "Leinenhemd", "de-DE")).includes(linenId);

          expect({ leaks, own }).toEqual({ leaks: false, own: true });
        });
      });

      // ---- T5 ----------------------------------------------------------------------------

      describe("T5: category facets", () => {
        const expectedLabel = {
          "el-GR": ["Πουκάμισα", "Πλεκτά"],
          "de-DE": ["Hemden", "Strickwaren"],
          "fr-FR": ["Chemises", "Maille"],
        } as const;

        for (const index of S2_INDEXES) {
          it(`${index.name}`, async () => {
            for (const [locale, labels] of Object.entries(expectedLabel)) {
              const field =
                index.variant === "a"
                  ? localizedFields(locale).category
                  : index.variant === "b"
                    ? "category"
                    : "category_ids";
              const response = await searchStore(index, "", locale, {
                facets: [{ field, type: "value" }],
              });

              expect({ locale, status: response.status }).toEqual({ locale, status: 200 });

              const facet = response.data.results[0].facets?.[field];
              const values = (facet?.values ?? []) as { value: string; count: number }[];

              expect({ locale, has: values.length }).toEqual({ locale, has: 2 });

              if (index.variant === "ap") {
                // IDs: the storefront labels them with the categories it fetches in the locale.
                const categories = await api.get(
                  `/store/product-categories?${values.map((v) => `id[]=${v.value}`).join("&")}&fields=id,name`,
                  { headers: { ...headers, "x-medusa-locale": locale } },
                );
                const names = (categories.data.product_categories as { name: string }[]).map(
                  (c) => c.name,
                );

                expect({ locale, names: names.sort() }).toEqual({ locale, names: [...labels].sort() });
              } else {
                expect({ locale, labels: values.map((v) => v.value).sort() }).toEqual({
                  locale,
                  labels: [...labels].sort(),
                });
              }
            }

            record("T5", index.name, index.variant === "ap" ? "ids, labelled by the storefront" : "labels in the locale");
          });
        }
      });

      // ---- T6 ----------------------------------------------------------------------------

      describe("T6: hits come back translated, with prices, from one extra call", () => {
        const cases = [
          ["el-GR", "πουκάμισο", "Λινό πουκάμισο"],
          ["de-DE", "Leinenhemd", "Leinenhemd"],
          ["fr-FR", "chemise", "Chemise en lin"],
        ] as const;

        for (const index of S2_INDEXES) {
          it(`${index.name}`, async () => {
            for (const [locale, q, title] of cases) {
              const ids = await hitIds(index, q, locale);

              expect(ids).toContain(linenId);

              const response = await api.get(
                `/store/products?${ids.map((id) => `id[]=${id}`).join("&")}` +
                  `&region_id=${seeded.regionId}&fields=id,title,*variants.calculated_price`,
                { headers: { ...headers, "x-medusa-locale": locale } },
              );
              const product = (response.data.products as any[]).find((p) => p.id === linenId);

              expect({ locale, title: product.title }).toEqual({ locale, title });
              expect(product.variants[0].calculated_price.calculated_amount).toBe(49);
            }

            record("T6", index.name, "pass");
          });
        }
      });

      // ---- T9 ----------------------------------------------------------------------------

      describe("T9: a language outside en/el/de/fr (pt-BR, mn-MN)", () => {
        for (const index of S2_INDEXES) {
          it(`${index.name}`, async () => {
            const portuguese = await hitIds(index, "Camisa", "pt-BR");

            expect(portuguese).toContain(linenId);
            expect(await hitIds(index, "linho", "pt-BR")).toContain(linenId);

            // Mongolian: found by its own words (exact lexemes)?
            const exact = (await hitIds(index, "Маалинган", "mn-MN")).includes(linenId);
            const second = (await hitIds(index, "цамц", "mn-MN")).includes(linenId);
            const upper = (await hitIds(index, "МААЛИНГАН", "mn-MN")).includes(linenId);
            // ...and by a misspelling, which on Postgres is the trigram index's job?
            const typo = (
              await hitIds(index, "Маалингин", "mn-MN", { search_options: { typo_tolerance: true } })
            ).includes(linenId);
            const typoOff = (await hitIds(index, "Маалингин", "mn-MN")).includes(linenId);

            record("T9", index.name, "pt-BR found", {
              "mn-MN exact": exact,
              "mn-MN second word": second,
              "mn-MN uppercase": upper,
              "mn-MN one-letter typo, typo_tolerance on": typo,
              "mn-MN one-letter typo, typo_tolerance off": typoOff,
            });

            expect(exact).toBe(true);
            expect(second).toBe(true);
          });
        }
      });

      // ---- T10 (beyond the plan's list) --------------------------------------------------

      describe("T10: the request's locale reaches the search, through a middleware", () => {
        const cases = [
          ["el-GR", "πουκάμισο"],
          ["de-DE", "Leinenhemd"],
          ["fr-FR", "chemise"],
        ] as const;

        for (const index of S2_INDEXES) {
          it(`${index.name}`, async () => {
            for (const [locale, q] of cases) {
              // No search_options at all: only `x-medusa-locale`, as a storefront sends it.
              const response = await api.post(
                "/store/search",
                { entity: index.name, filters: { q } },
                { headers: { ...headers, "x-medusa-locale": locale }, validateStatus: () => true },
              );

              expect({ locale, status: response.status }).toEqual({ locale, status: 200 });
              expect(response.data.results[0].hits.map((h: { id: string }) => h.id)).toContain(
                linenId,
              );
            }

            // And isolation follows the header on the candidates that isolate.
            if (index.variant !== "ap") {
              const response = await api.post(
                "/store/search",
                { entity: index.name, filters: { q: "Leinenhemd" } },
                { headers: { ...headers, "x-medusa-locale": "el-GR" } },
              );

              expect(response.data.results[0].hits.map((h: { id: string }) => h.id)).not.toContain(
                linenId,
              );
            }

            record("T10", index.name, "pass");
          });
        }
      });

      // ---- T4 ----------------------------------------------------------------------------

      describe("T4: a translation change is searchable within 10 s, through events", () => {
        // The runner restores the database before each test; Meilisearch keeps what the last one
        // wrote. Re-sync, so every test starts with the indexes and the database in agreement.
        beforeEach(async () => {
          await resync(getContainer(), [linenId, sweaterId]);
        });

        it("translation.updated on a product title, on every index at once", async () => {
          const container = getContainer();
          const word = "Κλασικό";
          const probe = async (index: S2Index) => (await hitIds(index, word, "el-GR")).includes(linenId);

          for (const index of S2_INDEXES) {
            expect({ index: index.name, before: await probe(index) }).toEqual({
              index: index.name,
              before: false,
            });
          }

          await changeTranslation(container, linenId, "el-GR", {
            title: `Λινό πουκάμισο ${word}`,
          });

          const timings = await Promise.all(
            S2_INDEXES.map(async (index) => {
              const { elapsedMs } = await until(() => probe(index), {
                timeoutMs: 10_000,
                intervalMs: 50,
                what: `${index.name} to find the updated Greek title`,
              });

              return [index.name, elapsedMs] as const;
            }),
          );

          for (const [name, ms] of timings) {
            record("T4 product translation.updated", name, "pass", { ms });
          }
        });

        it("translation.updated on a category name reaches the products in it", async () => {
          const container = getContainer();
          const word = "Γιορτής";
          const probe = async (index: S2Index) => (await hitIds(index, word, "el-GR")).includes(linenId);
          // A' puts category names in its one text field; A and B in the locale's own fields.
          const targets = S2_INDEXES;

          await changeTranslation(container, shirtsCategoryId, "el-GR", {
            name: `Πουκάμισα ${word}`,
          });

          // Category names are searchable only through `option_values` and the text field of A';
          // check the facet label, which is what the storefront shows.
          const labelOf = async (index: S2Index) => {
            const field =
              index.variant === "a"
                ? localizedFields("el-GR").category
                : index.variant === "b"
                  ? "category"
                  : undefined;

            if (!field) {
              return (await probe(index)) ? "found" : undefined;
            }

            const response = await searchStore(index, "", "el-GR", { facets: [{ field }] });
            const values = (response.data.results[0].facets?.[field]?.values ?? []) as { value: string }[];

            return values.some((v) => v.value === `Πουκάμισα ${word}`) ? "found" : undefined;
          };

          const timings = await Promise.all(
            targets.map(async (index) => {
              const { elapsedMs } = await until(() => labelOf(index), {
                timeoutMs: 10_000,
                what: `${index.name} to show the updated category name`,
              });

              return [index.name, elapsedMs] as const;
            }),
          );

          for (const [name, ms] of timings) {
            record("T4 category translation.updated", name, "pass", { ms });
          }
        });

        it("translation.deleted removes a locale's text from the index (recorded)", async () => {
          const container = getContainer();
          const word = "Γιορτής";
          const query = container.resolve(ContainerRegistrationKeys.QUERY);

          // What the index shows for the category: its labels (A, B), or whether the removed
          // word still hits (A'). A check that only says "no label contains the word" would pass
          // on an empty facet, so the labels have to be the two categories.
          const seen = async (index: S2Index) => {
            if (index.variant === "ap") {
              return { hit: (await hitIds(index, word, "el-GR")).includes(linenId) };
            }

            const field = index.variant === "a" ? localizedFields("el-GR").category : "category";
            const response = await searchStore(index, "", "el-GR", { facets: [{ field }] });

            return {
              labels: (
                (response.data.results[0].facets?.[field]?.values ?? []) as { value: string }[]
              )
                .map((v) => v.value)
                .sort(),
            };
          };
          // The database was restored for this test: put the Greek category name in first, and
          // wait until every index shows it, so that its removal is a change to observe.
          await changeTranslation(container, shirtsCategoryId, "el-GR", { name: `Πουκάμισα ${word}` });
          await Promise.all(
            S2_INDEXES.map((index) =>
              until(
                async () => {
                  const state = await seen(index);

                  return state.labels ? state.labels.some((l) => l.includes(word)) || undefined : state.hit || undefined;
                },
                { timeoutMs: 10_000, what: `${index.name} to show the Greek category name` },
              ),
            ),
          );

          const { data } = await query.graph({
            entity: "translations",
            fields: ["id"],
            filters: { reference_id: shirtsCategoryId, locale_code: "el-GR" },
          });

          expect(data).toHaveLength(1);
          await deleteTranslationsWorkflow(container).run({ input: { ids: data.map((t) => t.id) } });

          // Gone means the English fallback is back for the category (A, B), or the word no longer
          // hits (A').
          const isGone = (state: { hit?: boolean; labels?: string[] }) =>
            state.labels ? state.labels.join("|") === ["Shirts", "Πλεκτά"].sort().join("|") : state.hit === false;

          await Promise.all(
            S2_INDEXES.map(async (index) => {
              let last: unknown;
              const outcome = await until(
                async () => {
                  last = await seen(index);

                  return isGone(last as never) ? true : undefined;
                },
                { timeoutMs: 10_000, what: `${index.name} to drop the deleted category name` },
              ).catch(() => undefined);

              record("T4 translation.deleted", index.name, outcome ? "pass" : "still stale after 10 s", {
                ms: outcome?.elapsedMs,
                lastSeen: last,
              });
            }),
          );
        });
      });

      // ---- T7 ----------------------------------------------------------------------------

      describe("T7: a language added in settings, without a code change", () => {
        beforeEach(async () => {
          await resync(getContainer(), [linenId, sweaterId]);
        });

        it("it-IT: what is searchable without any restart", async () => {
          const container = getContainer();
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
                supported_locales: [...new Set([...current, "it-IT"])].map((locale_code) => ({
                  locale_code,
                })),
              },
            },
          });
          await batchTranslationsWorkflow(container).run({
            input: {
              create: [
                {
                  reference: "product",
                  reference_id: linenId,
                  locale_code: "it-IT",
                  translations: {
                    title: "Camicia di lino",
                    description: "Una camicia leggera di puro lino.",
                  },
                },
              ],
              update: [],
              delete: [],
            },
          });

          // Polled in parallel, so each time is measured from the same moment.
          const outcomes = await Promise.all(
            S2_INDEXES.map(async (index) => {
              const outcome = await until(
                async () => {
                  const response = await searchStore(index, "Camicia", "it-IT");

                  if (response.status !== 200) {
                    return { status: response.status, message: response.data?.message as string };
                  }

                  return (response.data.results[0].hits as { id: string }[]).some(
                    (h) => h.id === linenId,
                  )
                    ? { status: 200, message: "found" }
                    : undefined;
                },
                { timeoutMs: 6_000, what: `${index.name} to find the Italian title` },
              ).catch(() => ({ value: { status: 200, message: "not found" }, elapsedMs: 6_000 }));

              return { index, outcome };
            }),
          );

          for (const { index, outcome } of outcomes) {
            record("T7 it-IT without restart", index.name, outcome.value.message, {
              status: outcome.value.status,
              ms: outcome.elapsedMs,
            });

            // A' and B follow the store's locales when they build a document: no restart.
            if (index.variant !== "a") {
              expect(outcome.value.message).toBe("found");
            }
          }
        });
      });

      // ---- T8 (last: it drops the other Meilisearch indexes to measure one at a time) ------

      describe("T8: cost of 1,000 products x 4 locales", () => {
        it("index size and reindex time for each candidate", async () => {
          // Creating the catalog, letting the stock index's handlers finish, and three reindexes
          // of each of six indexes take about half an hour.
          const container = getContainer();
          const search = container.resolve(Modules.SEARCH);
          const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
          const count = Number(process.env.S2_T8_PRODUCTS ?? 1000);

          const categories = await Promise.all(
            ["Tops", "Bottoms", "Outerwear", "Accessories"].map((name, i) =>
              createCategory(
                container,
                {
                  "en-US": name,
                  "el-GR": name,
                  "de-DE": name,
                  "fr-FR": name,
                  "pt-BR": name,
                  "mn-MN": name,
                },
                `t8-${i}`,
              ),
            ),
          );

          const started = Date.now();

          // With the handlers running, creating the 1,000 products took 698 s in the first run
          // (six indexes re-reading every product for every event); muted, the creation is cheap.
          (globalThis as { __s2Mute?: boolean }).__s2Mute = true;
          await createCatalog(container, seeded, categories, count);
          await settle();
          (globalThis as { __s2Mute?: boolean }).__s2Mute = false;
          record("T8", "catalog", "created", { products: count, ms: Date.now() - started, handlersMuted: true });

          // The product events of the creation are still being handled, one index after the other.
          // Time nothing until they are done.
          await settle();

          const sizeOfPostgres = async (name: string) => {
            const rows: { table_name: string }[] = await pg.raw(
              `select table_name from search_postgres_index where name like ? order by name desc limit 1`,
              [`${INDEX_PREFIX}_${name}_v%`],
            ).then((result: any) => result.rows);

            const [{ size, rows: n }] = (
              await pg.raw(
                `select pg_total_relation_size(quote_ident(?)) as size, (select count(*) from "${rows[0]!.table_name}") as rows`,
                [rows[0]!.table_name],
              )
            ).rows;

            return { bytes: Number(size), documents: Number(n) };
          };

          // The stock `product` index has its own handlers, which neither the mute nor `settle()`
          // covers: wait until it holds every product, or its backlog is timed as a reindex.
          const stockCount = async () => {
            const { rows } = await pg.raw(
              "select document_count from search_postgres_index where name like ? order by name desc limit 1",
              [`${INDEX_PREFIX}_product_v%`],
            );

            return Number(rows[0]?.document_count ?? 0);
          };
          let steadyFor = 0;
          let lastCount = -1;

          await until(
            async () => {
              const now = await stockCount();

              steadyFor = now === lastCount ? steadyFor + 1 : 0;
              lastCount = now;
              await new Promise((resolve) => setTimeout(resolve, 2000));

              return steadyFor >= 3 && now >= count ? true : undefined;
            },
            { timeoutMs: 900_000, intervalMs: 0, what: "the stock product index to catch up" },
          );

          // No statement running on the database for three polls in a row.
          const quietDatabase = async () => {
            let quiet = 0;

            await until(
              async () => {
                const { rows } = await pg.raw(
                  "select count(*)::int as n from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() and state = 'active'",
                );

                quiet = rows[0].n === 0 ? quiet + 1 : 0;
                await new Promise((resolve) => setTimeout(resolve, 1000));

                return quiet >= 3 ? true : undefined;
              },
              { timeoutMs: 300_000, intervalMs: 0, what: "the database to be quiet" },
            );
          };

          // The stock index's handlers still run for minutes after its document count is right
          // (the first run of the first attempt took 263 s and the third 4 s): wait for 15 s of
          // nothing running before the first measurement.
          await (async () => {
            let quiet = 0;

            await until(
              async () => {
                const { rows } = await pg.raw(
                  "select count(*)::int as n from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() and state = 'active'",
                );

                quiet = rows[0].n === 0 ? quiet + 1 : 0;
                await new Promise((resolve) => setTimeout(resolve, 1000));

                return quiet >= 15 ? true : undefined;
              },
              { timeoutMs: 1_800_000, intervalMs: 0, what: "15 s without a running statement" },
            );
          })();

          // Every candidate is searched right after its reindex: documents that were written to
          // the wrong place would still be counted by the sizes below.
          const searchableAfterReindex = async (name: string) => {
            const index = S2_INDEXES.find((i) => i.name === name);

            if (!index) {
              return undefined;
            }

            const model = String(count - 1).padStart(4, "0");
            const english = await hitIds(index, model, "en-US");
            const greek = await hitIds(index, generatedText(count - 1)["el-GR"].title.split(" ").slice(-1)[0]!, "el-GR");

            expect({ name, english: english.length, greek: greek.length }).toEqual({
              name,
              english: 1,
              greek: expect.any(Number),
            });
            expect(greek.length).toBeGreaterThan(0);

            return { english: english.length, greek: greek.length };
          };

          for (const name of ["product", "s2_pg_a", "s2_pg_ap"]) {
            const runs: { ms: number }[] = [];

            // Three runs, all recorded: in this harness a Postgres reindex waits on the app's
            // connection pool far more than on the database (pg_stat_activity is idle in most
            // samples), so the spread says more than any one run.
            for (let run = 0; run < 3; run++) {
              await quietDatabase();

              const t0 = Date.now();

              await search.reindex({ index: name });
              runs.push({ ms: Date.now() - t0 });
            }

            record("T8", name, "reindexed", {
              runsMs: runs.map((r) => r.ms),
              ...(await sizeOfPostgres(name)),
              searchable: await searchableAfterReindex(name),
            });
          }

          for (const name of ["s2_ms_a", "s2_ms_b", "s2_ms_ap"]) {
            const mine = `${INDEX_PREFIX}_${name}_v`;
            const runs: { ms: number; addedBytes: number }[] = [];
            let newestIndexes: [string, { numberOfDocuments: number; rawDocumentDbSize: number }][] = [];

            for (let run = 0; run < 3; run++) {
              // Alone in Meilisearch: drop the other candidates' indexes (and, on the second run,
              // the version before the last), then measure what one reindex adds to the used size.
              const { results } = await meili<{ results: { uid: string }[] }>("GET", "/indexes?limit=1000");
              const versionOf = (uid: string) => Number(/_v(\d+)/.exec(uid)?.[1] ?? 0);
              const newestBefore = Math.max(0, ...results.filter((i) => i.uid.startsWith(mine)).map((i) => versionOf(i.uid)));

              for (const { uid } of results.filter(
                (i) => !i.uid.startsWith(mine) || versionOf(i.uid) < newestBefore,
              )) {
                await meili("DELETE", `/indexes/${uid}`);
              }

              await until(
                async () => ((await meili<{ results: unknown[] }>("GET", "/tasks?statuses=enqueued,processing")).results.length ? undefined : true),
                { timeoutMs: 60_000, what: "Meilisearch to be idle" },
              );

              const before = (await meili<{ usedDatabaseSize: number }>("GET", "/stats")).usedDatabaseSize;
              const t0 = Date.now();

              await search.reindex({ index: name });

              const ms = Date.now() - t0;
              const stats = await meili<{
                usedDatabaseSize: number;
                indexes: Record<string, { numberOfDocuments: number; rawDocumentDbSize: number }>;
              }>("GET", "/stats");
              const latest = Object.entries(stats.indexes).filter(([uid]) => uid.startsWith(mine));
              const newest = Math.max(...latest.map(([uid]) => versionOf(uid)));

              newestIndexes = latest.filter(([uid]) => versionOf(uid) === newest);
              runs.push({ ms, addedBytes: stats.usedDatabaseSize - before });
            }

            record("T8", name, "reindexed", {
              runs,
              indexes: newestIndexes.map(([uid, i]) => [uid.slice(uid.indexOf(name) + name.length + 1), i.numberOfDocuments, i.rawDocumentDbSize]),
              searchable: await searchableAfterReindex(name),
            });
          }

          expect(recorded.filter((r) => r.test === "T8" && r.outcome === "reindexed").length).toBe(6);
        }, 4_000_000);
      });
    });
  },
});
