// S3 PROTOTYPE. Fills the many-localized-fields collection: DOCS documents, each written in four
// languages (so every document has four locale rows and four versions). Idempotent.
//   S3_DOCS=50 NODE_ENV=production payload run spike/s3/seed.ts     (S3_RICH=1, PAYLOAD_DATABASE_URL set)
import config from "@payload-config";
import { getPayload } from "payload";
import { richData, SEED_LOCALES } from "./content.ts";

const DOCS = Number(process.env["S3_DOCS"] ?? 50);
const payload = await getPayload({ config });
const collection = "s3-rich" as never;
const existing = await payload.count({ collection });
const started = performance.now();
let made = 0;
for (let n = existing.totalDocs + 1; n <= DOCS; n++) {
  const created = (await payload.create({ collection, locale: "en", data: richData("en", n) as never })) as unknown as {
    id: number;
    sections: { id: string }[];
  };
  for (const locale of SEED_LOCALES.slice(1)) {
    await payload.update({ collection, id: created.id, locale, data: richData(locale, n, created.sections) as never });
  }
  made++;
}
const total = await payload.count({ collection });
console.log(JSON.stringify({ seed: { docs: total.totalDocs, made, ms: Math.round(performance.now() - started) } }));
process.exit(0);
