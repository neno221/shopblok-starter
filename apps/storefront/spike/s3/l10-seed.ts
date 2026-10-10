// S3 PROTOTYPE. A database with content for L10 and L11, on the shipping schema (no S3 collection):
// an admin, `markets` for four languages and PAGES pages written in en, el, de and fr (published).
//   NODE_ENV=production PAYLOAD_DATABASE_URL=… payload run spike/s3/l10-seed.ts
import config from "@payload-config";
import { getPayload } from "payload";

const PAGES = Number(process.env["S3_PAGES"] ?? 20);
const payload = await getPayload({ config });
const users = await payload.count({ collection: "users" });
if (users.totalDocs === 0) {
  await payload.create({ collection: "users", data: { email: "owner@example.com", password: "correct-horse-battery", role: "admin" } });
}
await payload.updateGlobal({
  slug: "markets",
  data: {
    countries: [
      { code: "cy", enabled: true, languages: ["el"] },
      { code: "us", enabled: true, languages: ["en"] },
      { code: "de", enabled: true, languages: ["de"] },
      { code: "fr", enabled: true, languages: ["fr"] },
    ],
    languages: [
      { code: "en", medusaLocale: "en-US" },
      { code: "el", medusaLocale: "el-GR" },
      { code: "de", medusaLocale: "de-DE" },
      { code: "fr", medusaLocale: "fr-FR" },
    ],
    primaryCountry: "cy",
    fallbackMarket: "en-us",
  } as never,
});
const titles: Record<string, string> = { en: "About us", el: "Σχετικά με εμάς", de: "Über uns", fr: "À propos" };
const have = await payload.count({ collection: "pages" });
for (let n = have.totalDocs + 1; n <= PAGES; n++) {
  const created = await payload.create({ collection: "pages", locale: "en", data: { title: `${titles["en"]} ${n}`, slug: `about-${n}`, _status: "published" } });
  for (const locale of ["el", "de", "fr"] as const) {
    await payload.update({ collection: "pages", id: created.id, locale, data: { title: `${titles[locale]} ${n}`, slug: `${locale}-about-${n}`, _status: "published" } });
  }
}
console.log(JSON.stringify({ l10Seed: { pages: (await payload.count({ collection: "pages" })).totalDocs } }));
process.exit(0);
