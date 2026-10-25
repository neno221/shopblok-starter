// The message catalogs for the specs. Playwright's loader cannot import `@shopblok/i18n`: its index
// pulls in `address-formats.json`, which Node's ESM loader wants an `import … with { type: "json" }`
// for. The catalog modules themselves import nothing at run time, so the specs take them directly.
import { de } from "../../../../packages/i18n/src/messages/de";
import { el } from "../../../../packages/i18n/src/messages/el";
import { en } from "../../../../packages/i18n/src/messages/en";
import { fr } from "../../../../packages/i18n/src/messages/fr";

export const catalogs = { en, el, de, fr };
