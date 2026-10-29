import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Payload } from "payload";
import sharp from "sharp";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** M3's hero picture (`public/home/hero.svg`), which the seeded Home's hero shows (D80). */
const HERO_SVG = path.resolve(dirname, "../../../public/home/hero.svg");

const KEY = "home-hero";

/** What the picture shows, in the seeded languages (`media.alt` is required). */
const ALT: Record<string, string> = {
  en: "A stack of folded knitwear beside a vase with green stems",
  el: "Στοίβα από διπλωμένα πλεκτά δίπλα σε ένα βάζο με πράσινα κλαδιά",
  de: "Ein Stapel gefalteter Strickwaren neben einer Vase mit grünen Zweigen",
  fr: "Une pile de tricots pliés à côté d’un vase aux tiges vertes",
};

/**
 * The Home hero's picture in `media` (T65): `hero.svg` rasterised to WebP by `sharp`, since `media`
 * refuses SVG (it can carry script). Uploaded once, found again by its `seedKey`; an editor's
 * changes to it (a new file, other alt text) stay. Its id, for the hero block.
 */
export async function seedHeroImage(payload: Payload): Promise<number> {
  const { docs } = await payload.find({
    collection: "media",
    where: { seedKey: { equals: KEY } },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  });
  const stored = docs[0];
  if (stored !== undefined) return stored.id;
  const data = await sharp(await readFile(HERO_SVG))
    .webp({ quality: 85 })
    .toBuffer();
  const created = await payload.create({
    collection: "media",
    locale: "en",
    data: { alt: ALT["en"] ?? "", seedKey: KEY },
    file: { data, mimetype: "image/webp", name: "hero.webp", size: data.length },
    overrideAccess: true,
    context: { disableRevalidate: true },
  });
  for (const [locale, alt] of Object.entries(ALT)) {
    if (locale === "en") continue;
    await payload.update({
      collection: "media",
      id: created.id,
      locale: locale as never,
      data: { alt },
      overrideAccess: true,
      context: { disableRevalidate: true },
    });
  }
  return created.id;
}
