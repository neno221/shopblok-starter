// Ours (T34, D48). Writes `src/address-formats.json` from the pinned `lib-address`'s copy of
// Google's address metadata (`countries/XX.json`, one file per country): the fields AddressForm uses,
// without Google's defaults (`src/address-metadata.ts`). Run it after an upgrade of `lib-address`:
// `pnpm --filter @shopblok/i18n address-formats`. A test fails until it has been run.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { compactAll, serializeAll, type GoogleAddressData } from "../src/address-metadata.ts";

const packageDir = path.resolve(import.meta.dirname, "..");
const countriesDir = path.join(
  path.dirname(
    createRequire(path.join(packageDir, "package.json")).resolve("lib-address/package.json"),
  ),
  "countries",
);

const countries = readdirSync(countriesDir)
  .filter((name) => /^[A-Z]{2}\.json$/.test(name))
  .map(
    (name) => JSON.parse(readFileSync(path.join(countriesDir, name), "utf8")) as GoogleAddressData,
  );

const out = path.join(packageDir, "src", "address-formats.json");
writeFileSync(out, serializeAll(compactAll(countries)));
console.log(`${countries.length} countries written to ${path.relative(process.cwd(), out)}`);
