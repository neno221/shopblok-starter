import { expect, test } from "@playwright/test";
import { catalogs } from "./support/catalogs";

// T16: the wiring page (`[market]/page.tsx`, SETUP.md "Medusa DAL and the wiring page (T12)") for
// every market: the market's language and region, the currency of the prices, and the product
// titles in the language of the market. It runs against `next start` after `pnpm bootstrap` and
// `pnpm build`, with Medusa up (playwright.config.ts).
//
// The catalog is the demo seed that `pnpm bootstrap` runs (apps/backend/src/scripts/lib/
// demo-catalog.ts): eight products, each with one price per currency and a title in el, de and fr.
// The table below repeats it on purpose, so a change to the seed fails here and gets looked at.
// The page shows four products and which four depends on the order the database created them in,
// so the test checks every row it finds against the whole table, not against fixed rows.

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
  region: string;
  currency: Currency;
};

const MARKETS: Market[] = [
  { path: "/", key: "el-cy", htmlLang: "el-CY", language: "el", region: "Europe", currency: "eur" },
  {
    path: "/us",
    key: "en-us",
    htmlLang: "en-US",
    language: "en",
    region: "United States",
    currency: "usd",
  },
  {
    path: "/gb",
    key: "en-gb",
    htmlLang: "en-GB",
    language: "en",
    region: "United Kingdom",
    currency: "gbp",
  },
  {
    path: "/de",
    key: "de-de",
    htmlLang: "de-DE",
    language: "de",
    region: "Europe",
    currency: "eur",
  },
  {
    path: "/fr",
    key: "fr-fr",
    htmlLang: "fr-FR",
    language: "fr",
    region: "Europe",
    currency: "eur",
  },
  {
    path: "/ch",
    key: "de-ch",
    htmlLang: "de-CH",
    language: "de",
    region: "Switzerland",
    currency: "chf",
  },
  {
    path: "/ch/fr",
    key: "fr-ch",
    htmlLang: "fr-CH",
    language: "fr",
    region: "Switzerland",
    currency: "chf",
  },
];

/** The currencies the backend sells in (`apps/backend/src/config/markets.ts`), as the page lists them. */
const PRICE_CURRENCIES = "CHF, EUR, GBP, USD";

/** The price as the market's language writes it: `12,00 €` in el-CY, `$14.00` in en-US, `CHF 12.00` in de-CH. */
function price(amount: number, currency: Currency, htmlLang: string): string {
  return new Intl.NumberFormat(htmlLang, { style: "currency", currency }).format(amount);
}

/** Every `title — price` line the page may show for a market. */
function expectedRows(market: Market): Set<string> {
  return new Set(
    PRODUCTS.map(
      (product) =>
        `${product.titles[market.language]} — ${price(product.prices[market.currency], market.currency, market.htmlLang)}`,
    ),
  );
}

test.describe("the wiring page: language, region, currency and translated products", () => {
  for (const market of MARKETS) {
    test(`${market.path} is ${market.htmlLang}: ${market.region}, ${market.currency.toUpperCase()}, titles in ${market.language}`, async ({
      page,
    }) => {
      const response = await page.goto(market.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", market.htmlLang);
      await expect(page.getByTestId("market")).toHaveText(market.key);
      await expect(page.getByTestId("language")).toHaveText(market.htmlLang);

      // The rest streams in behind `connection()`; the region is the first thing it renders.
      await expect(page.getByTestId("region")).toHaveText(market.region);
      await expect(page.getByTestId("currency")).toHaveText(market.currency.toUpperCase());
      await expect(page.getByTestId("price-currencies")).toHaveText(PRICE_CURRENCIES);
      // Drafts are not counted; what the number is depends on what the admin suite is doing.
      await expect(page.getByTestId("pages")).toHaveText(/^\d+$/);

      await expect(page.getByTestId("product")).toHaveCount(4);
      const allowed = expectedRows(market);
      const rows = (await page.getByTestId("product").allInnerTexts()).map((row) => row.trim());
      for (const row of rows) {
        expect(
          allowed,
          `"${row}" is a demo product in ${market.language} priced in ${market.currency}`,
        ).toContain(row);
      }
      expect(new Set(rows).size, "four different products").toBe(4);

      await expect(page.getByTestId("error-state")).toHaveCount(0);
      await expect(page.getByTestId("no-region")).toHaveCount(0);
      await expect(page.getByTestId("no-products")).toHaveCount(0);
    });
  }
});

// T46 (D62): the page's copy now comes from next-intl, which reads the market from the `[market]`
// root param; the money still comes from `formatMoney` with the market's lang value. `/` is Cyprus:
// Greek words, and the euro written the Greek way (`14,00 €`: comma, space, sign after), not `€14.00`.
test("/ is in Greek and writes the euro the Greek way", async ({ page }) => {
  await page.goto("/");
  const { wiring } = catalogs.el;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(wiring.title);
  await expect(page.getByText(wiring.currency, { exact: true })).toBeVisible();
  await expect(page.getByTestId("currency")).toHaveText("EUR");
  await expect(page.getByTestId("product")).toHaveCount(4);
  for (const row of await page.getByTestId("product").allInnerTexts()) {
    expect(row.trim(), "Greek euro: 14,00 €").toMatch(/ — \d+,\d{2}\s€$/);
  }
});

test("/us is in English and writes the dollar the American way", async ({ page }) => {
  await page.goto("/us");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(catalogs.en.wiring.title);
  await expect(page.getByTestId("product")).toHaveCount(4);
  for (const row of await page.getByTestId("product").allInnerTexts()) {
    expect(row.trim(), "American dollar: $28.00").toMatch(/ — \$\d+\.\d{2}$/);
  }
});
