/**
 * S2 prototype (not for main, D13). What `search-locale.spec.ts` seeds: the store through the
 * real `seed-markets.ts`, a few categories and products with their translations, and a
 * generated catalog for T8. Everything is written through core-flows workflows.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  batchTranslationsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createShippingProfilesWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

import seedMarkets from "../../src/scripts/seed-markets";

/**
 * The spike's environment. It has to be in `process.env` before the test runner loads
 * `medusa-config.ts`, which happens before the runner applies its own `env` option, so it is set
 * here, at import. A value from the shell wins. `REDIS_URL` is blanked (the in-memory modules),
 * because `apps/backend/.env` points it at the dev stack's Redis and the queues there are shared
 * with a running dev server; `S2_REDIS=<url>` opts back in.
 */
export const INDEX_PREFIX = process.env.S2_INDEX_PREFIX ?? `r${Math.random().toString(16).slice(2, 6)}`;

for (const [key, value] of Object.entries({
  S2_SPIKE: "true",
  S2_INDEX_PREFIX: INDEX_PREFIX,
  S2_LOCALES: "en-US,el-GR,de-DE,fr-FR,pt-BR,mn-MN",
  MEILISEARCH_HOST: "http://localhost:7701",
  MEILISEARCH_API_KEY: "shopblok-local-dev-master-key",
})) {
  process.env[key] ??= value;
}

process.env.REDIS_URL = process.env.S2_REDIS ?? "";

/** The six languages of S2: D8's four, and the two D17 asks about (T9). */
export const LOCALES = ["en-US", "el-GR", "de-DE", "fr-FR", "pt-BR", "mn-MN"] as const;
export type Locale = (typeof LOCALES)[number];

type Text = { title: string; description: string };

export const LINEN_SHIRT: Record<Locale, Text> = {
  "en-US": { title: "Linen shirt", description: "A breathable shirt made of pure linen." },
  "el-GR": { title: "Λινό πουκάμισο", description: "Ένα δροσερό πουκάμισο από καθαρό λινό." },
  "de-DE": { title: "Leinenhemd", description: "Ein luftiges Hemd aus reinem Leinen." },
  "fr-FR": { title: "Chemise en lin", description: "Une chemise légère en pur lin." },
  "pt-BR": { title: "Camisa de linho", description: "Uma camisa leve de puro linho." },
  "mn-MN": {
    title: "Маалинган цамц",
    description: "Цэвэр маалинган даавуугаар хийсэн хөнгөн цамц.",
  },
};

export const WOOL_SWEATER: Record<Locale, Text> = {
  "en-US": { title: "Wool sweater", description: "A warm sweater knitted from merino wool." },
  "el-GR": { title: "Μάλλινο πουλόβερ", description: "Ένα ζεστό πουλόβερ από μαλλί μερινό." },
  "de-DE": { title: "Wollpullover", description: "Ein warmer Pullover aus Merinowolle." },
  "fr-FR": { title: "Pull en laine", description: "Un pull chaud tricoté en laine mérinos." },
  "pt-BR": { title: "Suéter de lã", description: "Um suéter quente de lã merino." },
  "mn-MN": { title: "Ноосон цамц", description: "Мерино ноосоор нэхсэн дулаан цамц." },
};

export const SHIRTS_CATEGORY: Record<Locale, string> = {
  "en-US": "Shirts",
  "el-GR": "Πουκάμισα",
  "de-DE": "Hemden",
  "fr-FR": "Chemises",
  "pt-BR": "Camisas",
  "mn-MN": "Цамцнууд",
};

export const KNITWEAR_CATEGORY: Record<Locale, string> = {
  "en-US": "Knitwear",
  "el-GR": "Πλεκτά",
  "de-DE": "Strickwaren",
  "fr-FR": "Maille",
  "pt-BR": "Malhas",
  "mn-MN": "Нэхмэл",
};

const TRANSLATED: Locale[] = ["el-GR", "de-DE", "fr-FR", "pt-BR", "mn-MN"];

export type Seeded = {
  salesChannelId: string;
  shippingProfileId: string;
  publishableKey: string;
  regionId: string;
};

/** The real market seed, then the two extra locales the store needs for T9. */
export async function seedStore(container: MedusaContainer): Promise<Seeded> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // The default shipping profile comes from one of Medusa's migration scripts, which the test
  // runner does not run.
  const { data: existingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { type: "default" },
  });

  if (!existingProfiles.length) {
    await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    });
  }

  await seedMarkets({ container, args: [] } as never);
  const { data: stores } = await query.graph({
    entity: "store",
    fields: [
      "id",
      "default_sales_channel_id",
      "supported_locales.locale_code",
    ],
    pagination: { take: 1 },
  });
  const store = stores[0]!;
  const existing = (store.supported_locales ?? []).flatMap((l) => (l?.locale_code ? [l.locale_code] : []));

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_locales: [...new Set([...existing, ...LOCALES])].map((locale_code) => ({
          locale_code,
        })),
      },
    },
  });

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { type: "default" },
  });
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["token", "title"],
    filters: { type: "publishable" },
  });
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    filters: { currency_code: "eur" },
  });

  return {
    salesChannelId: store.default_sales_channel_id!,
    shippingProfileId: profiles[0]!.id,
    publishableKey: keys[0]!.token as string,
    regionId: regions[0]!.id,
  };
}

/**
 * Fills every index and waits until each has an active version. The runner boots the app twice
 * and drops the first instance's connections while its startup seed is still running, so the
 * seed of the first index can fail with "Connection ended unexpectedly" (seen with `product`);
 * an explicit `reindex` is what makes the starting point deterministic.
 */
export async function readyIndexes(container: MedusaContainer): Promise<void> {
  const search = container.resolve(Modules.SEARCH);

  await ensureTextSearchConfiguration(container);

  await search.reindex();

  const { value } = await until(
    async () => {
      const indexes = await search.listIndexes();

      return indexes.every((index) => index.status === "ready") ? indexes : undefined;
    },
    { timeoutMs: 60_000, what: "every search index to be ready" },
  );

  expect(value.length).toBeGreaterThan(0);
}

/**
 * Waits until the index handlers are quiet: none is running and none started for 2 s. The
 * handlers of the events a seed emits run one index after the other, for several seconds, and
 * the runner snapshots the database right after `beforeAll`.
 */
export async function settle(): Promise<void> {
  const activity = () =>
    (globalThis as { __s2Activity?: { running: number; lastStart: number } }).__s2Activity;

  await until(
    async () => {
      const now = activity();

      return !now || (now.running === 0 && Date.now() - now.lastStart > 2000) ? true : undefined;
    },
    { timeoutMs: 900_000, intervalMs: 100, what: "the search handlers to go quiet" },
  );
}

/**
 * Puts every index back in line with the database. The runner restores the database before each
 * test, but Meilisearch is outside it and keeps what an earlier test wrote.
 */
export async function resync(container: MedusaContainer, productIds: string[]): Promise<void> {
  await container
    .resolve(Modules.SEARCH)
    .ingest({ name: "product.updated", data: productIds.map((id) => ({ id })) });
  await settle();
}

/**
 * The Postgres provider creates one text-search configuration, `medusa_search_english`
 * (unaccent, then the English stemmer), in its migration. Its `language` option names
 * `medusa_search_<language>`, which has to exist: for any other language somebody runs
 * `CREATE TEXT SEARCH CONFIGURATION`. `S2_PG_LANGUAGE=greek` makes the run use that language,
 * built here from PostgreSQL's own `greek` configuration (`S2_PG_UNACCENT=false` leaves the
 * unaccent step out, which is how T2 is shown to be able to fail).
 */
async function ensureTextSearchConfiguration(container: MedusaContainer): Promise<void> {
  const language = process.env.S2_PG_LANGUAGE?.trim();

  if (!language || language === "english") {
    return;
  }

  if (!/^[a-z_]+$/.test(language)) {
    throw new Error(`Unexpected S2_PG_LANGUAGE ${language}`);
  }

  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const dictionary = language === "simple" ? "simple" : `${language}_stem`;
  const mapping = process.env.S2_PG_UNACCENT === "false" ? dictionary : `unaccent, ${dictionary}`;

  await pg.raw(`CREATE TEXT SEARCH CONFIGURATION medusa_search_${language} (COPY = ${language})`);
  await pg.raw(
    `ALTER TEXT SEARCH CONFIGURATION medusa_search_${language} ALTER MAPPING FOR hword, hword_part, word WITH ${mapping}`,
  );
}

export async function createCategory(
  container: MedusaContainer,
  names: Record<Locale, string>,
  handle: string,
): Promise<string> {
  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [{ name: names["en-US"], handle, is_active: true }],
    },
  });
  const id = result[0]!.id;

  await batchTranslationsWorkflow(container).run({
    input: {
      create: TRANSLATED.map((locale_code) => ({
        reference: "product_category",
        reference_id: id,
        locale_code,
        translations: { name: names[locale_code] },
      })),
      update: [],
      delete: [],
    },
  });

  return id;
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
  input: { handle: string; text: Record<Locale, Text>; categoryId: string; translate?: Locale[] },
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

  await batchTranslationsWorkflow(container).run({
    input: {
      create: (input.translate ?? TRANSLATED).map((locale_code) => ({
        reference: "product",
        reference_id: id,
        locale_code,
        translations: {
          title: input.text[locale_code].title,
          description: input.text[locale_code].description,
        },
      })),
      update: [],
      delete: [],
    },
  });

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

// ---- T8: a generated catalog -------------------------------------------------------------

const ADJECTIVES: Record<string, string[]> = {
  "en-US": ["Soft", "Classic", "Light", "Warm", "Relaxed", "Slim", "Washed", "Everyday", "Heritage", "Coastal"],
  "el-GR": ["Απαλό", "Κλασικό", "Ελαφρύ", "Ζεστό", "Χαλαρό", "Στενό", "Πλυμένο", "Καθημερινό", "Παραδοσιακό", "Παράκτιο"],
  "de-DE": ["Weiches", "Klassisches", "Leichtes", "Warmes", "Lässiges", "Schmales", "Gewaschenes", "Alltägliches", "Traditionelles", "Küsten"],
  "fr-FR": ["Doux", "Classique", "Léger", "Chaud", "Décontracté", "Ajusté", "Délavé", "Quotidien", "Traditionnel", "Côtier"],
};
const NOUNS: Record<string, string[]> = {
  "en-US": ["shirt", "sweater", "jacket", "scarf", "trousers", "dress", "skirt", "coat", "cap", "tote bag"],
  "el-GR": ["πουκάμισο", "πουλόβερ", "μπουφάν", "κασκόλ", "παντελόνι", "φόρεμα", "φούστα", "παλτό", "καπέλο", "τσάντα"],
  "de-DE": ["Hemd", "Pullover", "Jacke", "Schal", "Hose", "Kleid", "Rock", "Mantel", "Mütze", "Tasche"],
  "fr-FR": ["chemise", "pull", "veste", "écharpe", "pantalon", "robe", "jupe", "manteau", "casquette", "sac"],
};

const T8_LOCALES = ["el-GR", "de-DE", "fr-FR"] as const;

/** A product's four texts, deterministic from its number. */
export function generatedText(n: number) {
  const text = (locale: keyof typeof ADJECTIVES) => {
    const adjective = ADJECTIVES[locale]![n % 10]!;
    const noun = NOUNS[locale]![Math.floor(n / 10) % 10]!;
    const model = String(n).padStart(4, "0");

    return {
      title: `${adjective} ${noun} ${model}`,
      description:
        `${adjective} ${noun}, model ${model}. ` +
        `Made for every day, in a fabric that lasts: ${noun} ${adjective} ${model}.`,
    };
  };

  return {
    "en-US": text("en-US"),
    "el-GR": text("el-GR"),
    "de-DE": text("de-DE"),
    "fr-FR": text("fr-FR"),
  };
}

/**
 * Creates `count` products with translations in el-GR, de-DE and fr-FR, 100 per workflow run.
 * The translations go in through the module service: `batchTranslationsWorkflow` emits one
 * `translation.created` event per row, and every index re-reads and rewrites the whole product
 * for each one, so 1,000 products x 3 locales is 3,000 events and over an hour of handlers
 * (measured: about 200 ms per index and event). T8 times a reindex, not that backlog.
 */
export async function createCatalog(
  container: MedusaContainer,
  seeded: Seeded,
  categoryIds: string[],
  count: number,
): Promise<void> {
  const batch = 100;
  const translations = container.resolve(Modules.TRANSLATION);

  for (let start = 0; start < count; start += batch) {
    const numbers = Array.from({ length: Math.min(batch, count - start) }, (_, i) => start + i);
    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: numbers.map((n) => {
          const text = generatedText(n);

          return {
            title: text["en-US"].title,
            description: text["en-US"].description,
            handle: `generated-${n}`,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: seeded.shippingProfileId,
            category_ids: [categoryIds[n % categoryIds.length]!],
            sales_channels: [{ id: seeded.salesChannelId }],
            options: [{ title: "Size", values: ["S", "M"] }],
            variants: ["S", "M"].map((size) => ({
              title: size,
              options: { Size: size },
              manage_inventory: false,
              prices: PRICES,
            })),
          };
        }),
      },
    });

    await translations.createTranslations(
      result.flatMap((product, i) => {
        const text = generatedText(numbers[i]!);

        return T8_LOCALES.map((locale_code) => ({
          reference: "product",
          reference_id: product.id,
          locale_code,
          translations: text[locale_code],
        }));
      }),
    );
  }
}
