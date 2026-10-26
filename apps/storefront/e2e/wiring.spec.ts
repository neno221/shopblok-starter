import { expect, test, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";

// T16, moved to the home by T51 (SETUP.md "Home (T51)"): the facts the M0 wiring page printed, now
// read off the shop's own home for every market: the market's language in `<html lang>` and the
// switcher's current option, the region's currency in the new arrivals' prices, the product titles
// in the market's language, and the market map at `/next/markets`. It runs against `next start`
// after `pnpm bootstrap` and `pnpm build`, with Medusa up (playwright.config.ts).
//
// The catalog is the demo seed that `pnpm bootstrap` runs (apps/backend/src/scripts/lib/
// demo-catalog.ts): eight products, each with one price per currency and a title in el, de and fr.
// The table below repeats it on purpose, so a change to the seed fails here and gets looked at.
// The carousel shows the newest products, and which come first depends on the order the database
// created them in, so the test checks every card it finds against the whole table.

type Language = "en" | "el" | "de" | "fr";
type Currency = "eur" | "usd" | "gbp" | "chf";

type DemoProduct = {
  titles: Record<Language, string>;
  prices: Record<Currency, number>;
};

const PRODUCTS: DemoProduct[] = [
  {
    titles: {
      en: "Classic Tee",
      el: "Κλασικό μπλουζάκι",
      de: "Klassisches T-Shirt",
      fr: "T-shirt classique",
    },
    prices: { eur: 25, usd: 28, gbp: 22, chf: 26 },
  },
  {
    titles: {
      en: "Heritage Hoodie",
      el: "Φούτερ με κουκούλα Heritage",
      de: "Heritage-Hoodie",
      fr: "Sweat à capuche Heritage",
    },
    prices: { eur: 59, usd: 64, gbp: 51, chf: 58 },
  },
  {
    titles: {
      en: "Everyday Joggers",
      el: "Παντελόνι φόρμας Everyday",
      de: "Everyday-Jogginghose",
      fr: "Jogging Everyday",
    },
    prices: { eur: 49, usd: 54, gbp: 43, chf: 48 },
  },
  {
    titles: {
      en: "Linen Shorts",
      el: "Λινό σορτς",
      de: "Leinenshorts",
      fr: "Short en lin",
    },
    prices: { eur: 39, usd: 42, gbp: 34, chf: 38 },
  },
  {
    titles: {
      en: "Canvas Cap",
      el: "Καπέλο από καμβά",
      de: "Canvas-Kappe",
      fr: "Casquette en toile",
    },
    prices: { eur: 22, usd: 24, gbp: 19, chf: 22 },
  },
  {
    titles: {
      en: "Everyday Tote Bag",
      el: "Τσάντα tote Everyday",
      de: "Everyday-Tragetasche",
      fr: "Sac cabas Everyday",
    },
    prices: { eur: 18, usd: 20, gbp: 16, chf: 18 },
  },
  {
    titles: {
      en: "Ceramic Mug",
      el: "Κεραμική κούπα",
      de: "Keramiktasse",
      fr: "Tasse en céramique",
    },
    prices: { eur: 14, usd: 16, gbp: 12, chf: 14 },
  },
  {
    titles: {
      en: "Dotted Notebook",
      el: "Σημειωματάριο με τελείες",
      de: "Notizbuch gepunktet",
      fr: "Carnet pointé",
    },
    prices: { eur: 12, usd: 14, gbp: 10, chf: 12 },
  },
];

type Market = {
  path: string;
  key: string;
  htmlLang: string;
  /** The language of the product titles: `de-CH` shoppers get German, `fr-CH` French (D8). */
  language: Language;
  currency: Currency;
};

const MARKETS: Market[] = [
  { path: "/", key: "el-cy", htmlLang: "el-CY", language: "el", currency: "eur" },
  {
    path: "/us",
    key: "en-us",
    htmlLang: "en-US",
    language: "en",
    currency: "usd",
  },
  {
    path: "/gb",
    key: "en-gb",
    htmlLang: "en-GB",
    language: "en",
    currency: "gbp",
  },
  {
    path: "/de",
    key: "de-de",
    htmlLang: "de-DE",
    language: "de",
    currency: "eur",
  },
  {
    path: "/fr",
    key: "fr-fr",
    htmlLang: "fr-FR",
    language: "fr",
    currency: "eur",
  },
  {
    path: "/ch",
    key: "de-ch",
    htmlLang: "de-CH",
    language: "de",
    currency: "chf",
  },
  {
    path: "/ch/fr",
    key: "fr-ch",
    htmlLang: "fr-CH",
    language: "fr",
    currency: "chf",
  },
];

/** The price as the market's language writes it: `12,00 €` in el-CY, `$14.00` in en-US, `CHF 12.00` in de-CH. */
function price(amount: number, currency: Currency, htmlLang: string): string {
  return new Intl.NumberFormat(htmlLang, { style: "currency", currency }).format(amount);
}

/** The demo product a card's title names in the market's language, if any. */
const productTitled = (market: Market, title: string) =>
  PRODUCTS.find((product) => product.titles[market.language] === title);

/** The new arrivals' cards as `[title, price text]`. */
async function carouselCards(page: Page): Promise<[string, string][]> {
  const cards = page.locator('[data-slot="product-carousel"] [data-slot="product-card"]');
  await expect(cards.first()).toBeVisible();
  return cards.evaluateAll((all) =>
    all.map((card) => [
      card.querySelector('[data-slot="product-card-title"]')?.textContent?.trim() ?? "",
      card.querySelector('[data-slot="price-block"]')?.textContent?.trim() ?? "",
    ]),
  );
}

/** The market the header's switcher marks as the current one: its link's `href`. */
async function currentInSwitcher(page: Page): Promise<string | null> {
  await page.locator('header [data-slot="market-switcher-trigger"]').first().click();
  const current = page.locator('[data-slot="market-switcher-link"][aria-current="true"]');
  await expect(current).toHaveCount(1);
  return current.getAttribute("href");
}

test.describe("the home: language, currency and translated products for every market", () => {
  for (const market of MARKETS) {
    test(`${market.path} is ${market.htmlLang}: ${market.currency.toUpperCase()}, titles in ${market.language}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      const response = await page.goto(market.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", market.htmlLang);
      await expect(page.locator('[data-slot="home-template"]')).toHaveCount(1);
      await expect(page.locator('[data-slot="error-template"]')).toHaveCount(0);

      const cards = await carouselCards(page);
      expect(cards.length, "the eight demo products").toBe(PRODUCTS.length);
      for (const [title, text] of cards) {
        const product = productTitled(market, title);
        expect(product, `"${title}" is a demo product's ${market.language} title`).toBeDefined();
        const expected = price(product!.prices[market.currency], market.currency, market.htmlLang);
        expect(text, `${title} in ${market.currency.toUpperCase()}`).toContain(expected);
      }
      expect(new Set(cards.map(([title]) => title)).size, "different products").toBe(cards.length);

      expect(await currentInSwitcher(page)).toBe(market.path);
    });
  }

  test("/next/markets is the map the homes follow: each market's country and language", async ({
    request,
  }) => {
    const response = await request.get("/next/markets");
    expect(response.status()).toBe(200);
    const map = (await response.json()) as {
      countries: { code: string; enabled: boolean; languages: string[] }[];
    };
    for (const market of MARKETS) {
      const [language, country] = market.key.split("-");
      const entry = map.countries.find((each) => each.code === country);
      expect(entry?.enabled, `${country} is open`).toBe(true);
      expect(entry?.languages, `${country} has ${language}`).toContain(language);
    }
  });
});

// T46 (D62), on the home since T51: the copy comes from next-intl, which reads the market from the
// `[market]` root param, and the money from `formatMoney` with the market's lang value. `/` is
// Cyprus: Greek words, and the euro written the Greek way (`14,00 €`: comma, space, sign after),
// not `€14.00`. A price from a thousand up has a grouping separator, which the demo catalog's
// prices (all below 1000) do not exercise today (PR 70 review, item 5).
const GREEK_EURO = /^[\d.]+,\d{2}\s€$/;
const AMERICAN_DOLLAR = /^\$[\d,]+\.\d{2}$/;

/** The cards' prices alone: the price block's amount, without a "from" or a tax line. */
const amounts = (page: Page) =>
  page
    .locator('[data-slot="product-carousel"] [data-slot="price-block"] [data-slot="price"]')
    .allTextContents();

test("/ is in Greek and writes the euro the Greek way", async ({ page }) => {
  await page.goto("/");
  const words = catalogs.el.templates.home;
  await expect(page.getByRole("heading", { level: 2, name: words.newArrivals })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: words.categories })).toBeVisible();
  const prices = await amounts(page);
  expect(prices.length).toBeGreaterThan(0);
  for (const text of prices)
    expect(text.trim(), "Greek euro: 14,00 €, 1.400,00 € from a thousand").toMatch(GREEK_EURO);
});

test("/us is in English and writes the dollar the American way", async ({ page }) => {
  await page.goto("/us");
  const words = catalogs.en.templates.home;
  await expect(page.getByRole("heading", { level: 2, name: words.newArrivals })).toBeVisible();
  const prices = await amounts(page);
  expect(prices.length).toBeGreaterThan(0);
  for (const text of prices)
    expect(text.trim(), "American dollar: $28.00, $1,400.00 from a thousand").toMatch(
      AMERICAN_DOLLAR,
    );
});
