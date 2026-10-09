// For tests only: Medusa's own list of locale codes, read from the backend's install.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

/**
 * The codes in `defaultLocales` of the `@medusajs/translation` that the backend installs
 * (`dist/loaders/defaults.js`). The storefront can't import that package, so `locales.test.ts` and
 * `medusa-locales.test.ts` compare their own copies with it.
 */
export function medusaLocaleCodes(): string[] {
  const store = path.join(repoRoot, "node_modules/.pnpm");
  const folders = readdirSync(store).filter((entry) => entry.startsWith("@medusajs+translation@"));
  // Exactly one: with two installed, which one Medusa loads is not for a test to guess.
  if (folders.length !== 1) {
    throw new Error(`expected one @medusajs/translation in ${store}, found ${folders.length}`);
  }
  const file = path.join(
    store,
    folders[0]!,
    "node_modules/@medusajs/translation/dist/loaders/defaults.js",
  );
  return [...readFileSync(file, "utf8").matchAll(/code: "([^"]+)"/g)].map((match) => match[1]!);
}
