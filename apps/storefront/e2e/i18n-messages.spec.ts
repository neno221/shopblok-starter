import { expect, test, type Page } from "@playwright/test";
import { catalogs } from "./support/catalogs";

// T46 (D62): what the browser receives of the message catalogs. `NextIntlClientProvider` given no
// `messages` sends all of them, and a client component that imports `catalogs` puts all four in its
// JavaScript (`error.tsx` did until T46: one chunk of 91 KB on every page). The layout hands the
// provider `pick(messages, SHELL_MESSAGES)` instead, so a page carries the shell's namespaces and
// the namespaces of the islands it renders, never a catalog.
//
// It reads what a browser gets for a market's home: the document, whose inline script holds the
// provider's `messages` prop as a React Server Components payload, and every script the page loads
// (`resourceType() === "script"`), the first-load chunks and any that hydration asks for. Run it
// against `next start` after `next build`, like the other suites (playwright.config.ts).

/**
 * Namespaces of molecules and organisms, and the design-system chrome: none of them belongs to the
 * wiring page or the shell, so a key here in what the client receives means a catalog came with it.
 * Distinctive names, so that no library's chunk holds one by chance (a baseline build of `/` found
 * each of them in the chunk that held the four catalogs, and in no other).
 */
const FOREIGN_KEYS = [
  "cartLineItem",
  "productCard",
  "savedPaymentMethodCard",
  "shippingEstimator",
  "returnRequestForm",
  "mobileNavDrawer",
  "cookieConsent",
  "checkoutSteps",
  "paymentMethodsManager",
  "verificationNotice",
  "quickCartDropdown",
  "designSystem",
];

/** What the shell sends, and so what the scan must find (it is a scan of the right bytes). */
const SHELL_KEYS = ["backendUnavailable", "backendHint"];

const MARKETS = [
  { path: "/", language: "el" },
  { path: "/us", language: "en" },
  { path: "/ch/fr", language: "fr" },
  { path: "/de", language: "de" },
] as const;

type Received = { document: string; scripts: { url: string; text: string }[] };

async function receive(page: Page, path: string): Promise<Received> {
  const bodies: Promise<{ url: string; text: string }>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") {
      bodies.push(response.text().then((text) => ({ url: response.url(), text })));
    }
  });
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  const document = (await response?.text()) ?? "";
  await page.waitForLoadState("networkidle");
  return { document, scripts: await Promise.all(bodies) };
}

test.describe("the client receives the shell's messages and no catalog (D62)", () => {
  for (const market of MARKETS) {
    test(`${market.path}: the picked messages are there, the molecules and organisms are not`, async ({
      page,
    }) => {
      const { document, scripts } = await receive(page, market.path);
      const everything = [{ url: "the document", text: document }, ...scripts];
      expect(scripts.length, "the page loads its scripts").toBeGreaterThan(3);

      // The scan reads the right bytes: the shell's two messages are in the document's payload, in
      // the market's language (JSON in an inline script writes non-ASCII as it is).
      const shell = catalogs[market.language].wiring.backendHint;
      expect(document, "the provider's messages reach the document").toContain(SHELL_KEYS[0]);
      expect(document).toContain(SHELL_KEYS[1]);
      expect(document).toContain(JSON.stringify(shell).slice(1, -1));

      for (const { url, text } of everything) {
        for (const key of FOREIGN_KEYS) {
          expect(text.includes(key), `${key} is in ${url}`).toBe(false);
        }
      }
    });
  }

  test("the other languages' messages are not sent either", async ({ page }) => {
    // `/` is Greek: none of the shell's English, German or French sentences arrive with it.
    const { document, scripts } = await receive(page, "/");
    for (const text of [document, ...scripts.map((script) => script.text)]) {
      for (const other of ["en", "de", "fr"] as const) {
        expect(text).not.toContain(JSON.stringify(catalogs[other].wiring.backendHint).slice(1, -1));
      }
    }
  });
});
