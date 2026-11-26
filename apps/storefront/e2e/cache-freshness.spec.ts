import { expect, test } from "@playwright/test";
import { appEnv, appEnvOrBlank } from "./support/app-env";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "./support/medusa-admin";
import { clearKeys, countKeys } from "./support/redis";
import { base } from "./support/server";

// T112 (M7 D149, SETUP.md "Caching and the reconcile (T112)"): whether Medusa's caching module
// (`MEDUSA_FF_CACHING=true` on Redis, as `.env.example`, CI and staging run it) ever serves a stale
// answer. T93's check, kept: one product's title and its first variant's US price change in turns
// through Medusa's Admin API, 20 of each, and after each change the test reads
//
// - `/store/products` until it has the change, at most 5 s (the Store API reads Medusa caches, and
//   the module clears them from an event-bus subscriber, after the Admin API has answered: the
//   first read can come before that clear, which is no stale answer; one that lasts is, since an
//   entry nobody clears lives an hour),
// - for a price, a new cart's line price (Medusa caches the cart's reads of variants and prices),
// - the product page in `/us` until it shows the change (the storefront's revalidation re-renders
//   it from Medusa, so a stale answer there would stay on the page), at most 30 s,
// - `/store/products` again once the page has it, once: the storefront is told only after the
//   event's entries are cleared (`clearMedusaCache` in the backend's `lib/storefront-revalidate.ts`).
//
// First it checks that the module caches at all: a Store API read leaves the Redis provider's
// `mc:` keys behind. The first stale answer ends the run and fails the test, which
// prints the table as an annotation. The title and the price are put back afterwards (`afterAll`,
// also after a timeout). The default run has one worker, so no other suite reads the product
// meanwhile. Mutations (SETUP): the caching module's event subscription removed, so that nothing
// is ever cleared, with the backend's own clear before the storefront's POST taken out too, fails
// it; so does Medusa started without the flag while the spec expects it.

const HANDLE = "demo-heritage-hoodie";
const MARKET = "us";
const ROUNDS = 20;
const PAGE_WAIT_MS = 30_000;
/**
 * How long the Store API may still answer the old value after the Admin API's answer: the event
 * bus's worker picks the change's events up and the module clears their entries. Measured in
 * milliseconds (the table prints it); far below the hour an entry nobody clears lives.
 */
const STORE_WAIT_MS = 5_000;

type Price = { id: string; amount: number; currency_code: string; rules?: Record<string, string> };
type Variant = { id: string; prices: Price[] };
/** Puts the product's title and price back; `afterAll` runs it even after a timeout. */
let restore: (() => Promise<unknown>) | undefined;
test.afterAll(async () => {
  await restore?.();
});

type Row = {
  change: string;
  /** Milliseconds until the Store API had the change, or undefined when it did not in time. */
  storeMs?: number;
  /** How many Store API reads that took: more than one is the module's clear coming late. */
  storeReads: number;
  cart?: boolean;
  pageMs?: number;
  storeAfter: boolean;
};

test("Medusa's caching serves no stale answer in 40 changes (T112, D149)", async () => {
  test.setTimeout(240_000);
  // With the flag off nothing is cached, and no change could be stale: the check says nothing then.
  test.skip(
    appEnvOrBlank("backend", "MEDUSA_FF_CACHING").toLowerCase() !== "true",
    "MEDUSA_FF_CACHING is not true in the backend's environment (CI's e2e-smoke sets it)",
  );
  const medusa = medusaUrl();
  const token = await medusaAdminToken(medusa);
  const key = appEnv("storefront", "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
  const store = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${medusa}${path}`, {
      method,
      headers: { "x-publishable-api-key": key, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    expect(response.status, `${method} ${path}: ${await response.clone().text()}`).toBeLessThan(
      300,
    );
    return (await response.json()) as T;
  };

  const { products } = await medusaAdminApi<{
    products: { id: string; title: string; variants: Variant[] }[];
  }>(
    medusa,
    token,
    "GET",
    `/admin/products?handle=${HANDLE}&fields=id,title,*variants,*variants.prices`,
  );
  const product = products[0]!;
  // Medusa lists the variants in no fixed order: the one with the lowest id, every run the same.
  const variant = [...product.variants].sort((a, b) => (a.id < b.id ? -1 : 1))[0]!;
  const { regions } = await store<{
    regions: { id: string; currency_code: string; countries: { iso_2: string }[] }[];
  }>("GET", "/store/regions?fields=id,currency_code,*countries");
  const region = regions.find((each) => each.countries.some((c) => c.iso_2 === MARKET))!;
  // The variant's plain price in the region's currency (no rules): the one a cart in it pays.
  const plainPrice = (each: Variant) =>
    each.prices.find(
      (price) =>
        price.currency_code === region.currency_code && Object.keys(price.rules ?? {}).length === 0,
    );
  const price = plainPrice(variant)!;
  expect(price, `${HANDLE}'s first variant has a ${region.currency_code} price`).toBeDefined();
  const originalTitle = product.title;
  const originalAmount = price.amount;
  // The page shows the product's lowest price, so each change goes below every variant's.
  const lowest = Math.min(
    ...product.variants.flatMap((each) => {
      const amount = plainPrice(each)?.amount;
      return amount === undefined ? [] : [amount];
    }),
  );

  const setTitle = (title: string) =>
    medusaAdminApi(medusa, token, "POST", `/admin/products/${product.id}`, { title });
  const setAmount = (amount: number) =>
    medusaAdminApi(medusa, token, "POST", `/admin/products/${product.id}/variants/${variant.id}`, {
      prices: variant.prices.map((each) => ({
        id: each.id,
        amount: each.id === price.id ? amount : each.amount,
        currency_code: each.currency_code,
      })),
    });

  const storeRead = async () => {
    const { products: found } = await store<{
      products: {
        title: string;
        variants: { id: string; calculated_price?: { calculated_amount: number } }[];
      }[];
    }>(
      "GET",
      `/store/products?handle=${HANDLE}&region_id=${region.id}&fields=title,*variants.calculated_price`,
    );
    const read = found[0]!;
    return {
      title: read.title,
      amount: read.variants.find((each) => each.id === variant.id)?.calculated_price
        ?.calculated_amount,
    };
  };
  const cartAmount = async () => {
    const { cart } = await store<{ cart: { id: string } }>("POST", "/store/carts", {
      region_id: region.id,
    });
    const { cart: filled } = await store<{
      cart: { items: { variant_id: string; unit_price: number }[] };
    }>("POST", `/store/carts/${cart.id}/line-items`, { variant_id: variant.id, quantity: 1 });
    return filled.items.find((item) => item.variant_id === variant.id)?.unit_price;
  };
  const formatted = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: region.currency_code.toUpperCase(),
    }).format(amount);
  /**
   * Milliseconds until the Store API's read passes `fresh` (undefined when it did not in time), and
   * the number of reads.
   */
  const storeHas = async (fresh: (read: Awaited<ReturnType<typeof storeRead>>) => boolean) => {
    const start = Date.now();
    let reads = 0;
    while (Date.now() - start < STORE_WAIT_MS) {
      reads++;
      if (fresh(await storeRead())) return { storeMs: Date.now() - start, storeReads: reads };
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return { storeMs: undefined, storeReads: reads };
  };
  /** Milliseconds until the product page shows `text`, or undefined when it did not in time. */
  const pageShows = async (text: string) => {
    const start = Date.now();
    while (Date.now() - start < PAGE_WAIT_MS) {
      const response = await fetch(`${base()}/${MARKET}/products/${HANDLE}`);
      if (response.ok && (await response.text()).includes(text)) return Date.now() - start;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return undefined;
  };

  restore = async () => {
    await setTitle(originalTitle);
    await setAmount(originalAmount);
  };

  // The module must really cache, or the 40 changes prove nothing (T93 found it caching nothing:
  // a start-up error it swallowed). A Store API read writes the caching-redis provider's `mc:` keys.
  // They are cleared first: an earlier run's live an hour in the compose stack's Redis, and would
  // let a Medusa without the module through (PR 150 review, item 4).
  const redisUrl = appEnv("backend", "REDIS_URL");
  await clearKeys(redisUrl, "mc:*");
  expect(await countKeys(redisUrl, "mc:*")).toBe(0);
  await storeRead();
  expect(
    await countKeys(redisUrl, "mc:*"),
    "Medusa's caching module wrote nothing to Redis after a Store API read: it is not running (see the backend's log, or start it with LOG_LEVEL=debug)",
  ).toBeGreaterThan(0);

  // This run's own titles: a page an earlier run left stale can never pass for this one's change.
  const run = Date.now().toString(36);
  const rows: Row[] = [];
  const isStale = (row: Row) =>
    row.storeMs === undefined || row.cart === false || row.pageMs === undefined || !row.storeAfter;
  for (let i = 1; i <= ROUNDS; i++) {
    const title = `${originalTitle} check ${run}-${String(i).padStart(2, "0")}`;
    await setTitle(title);
    const store = await storeHas((read) => read.title === title);
    const pageMs = await pageShows(title);
    const after = await storeRead();
    rows.push({
      change: `title ${i}`,
      ...store,
      pageMs,
      storeAfter: after.title === title,
    });
    if (isStale(rows.at(-1)!)) break;

    // A cent less each round, below the lowest: "$63.93" is on no other part of the page (a whole
    // dollar may be).
    const amount = Math.round(lowest * 100 - i) / 100;
    await setAmount(amount);
    const storePrice = await storeHas((read) => read.amount === amount);
    const cart = (await cartAmount()) === amount;
    const pagePriceMs = await pageShows(formatted(amount));
    const afterPrice = await storeRead();
    rows.push({
      change: `price ${i} (${formatted(amount)})`,
      ...storePrice,
      cart,
      pageMs: pagePriceMs,
      storeAfter: afterPrice.amount === amount,
    });
    // The first stale answer ends the run: each one waits out the page's 30 s.
    if (isStale(rows.at(-1)!)) break;
  }

  const mark = (fresh: boolean | undefined) =>
    fresh === undefined ? "-" : fresh ? "fresh" : "STALE";
  const ms = (value: number | undefined) => (value === undefined ? "STALE" : `${value} ms`);
  const table = rows.map(
    (row) =>
      `${row.change}: Store API ${ms(row.storeMs)} (${row.storeReads} ${row.storeReads === 1 ? "read" : "reads"}), cart ${mark(row.cart)}, page ${ms(row.pageMs)}, Store API after ${mark(row.storeAfter)}`,
  );
  test.info().annotations.push({ type: "cache-check", description: table.join("\n") });
  const stale = rows.filter(isStale);
  expect(
    stale.map((row) => row.change),
    table.join("\n"),
  ).toEqual([]);
  expect(rows).toHaveLength(ROUNDS * 2);
});
