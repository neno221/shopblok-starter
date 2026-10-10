// S3 PROTOTYPE. Deterministic content for the many-localized-fields collection, in four languages.
export const SEED_LOCALES = ["en", "el", "de", "fr"] as const;
export type SeedLocale = (typeof SEED_LOCALES)[number];

const LOREM: Record<SeedLocale, string> = {
  en: "Linen shirt in a relaxed cut, washed for softness, with mother of pearl buttons and a curved hem. ",
  el: "Λινό πουκάμισο με χαλαρή γραμμή, πλυμένο για απαλότητα, με φυσικά κουμπιά και καμπύλη τελείωμα. ",
  de: "Leinenhemd in lockerem Schnitt, gewaschen für mehr Weichheit, mit Perlmuttknöpfen und rundem Saum. ",
  fr: "Chemise en lin à la coupe décontractée, lavée pour plus de douceur, avec des boutons en nacre. ",
};

const fill = (locale: SeedLocale, n: number, length: number): string =>
  `${locale} ${n} ${LOREM[locale].repeat(Math.ceil(length / LOREM[locale].length))}`.slice(0, length);

/** One document's data in one language. `rows` are the existing array row ids (none for the first). */
export function richData(locale: SeedLocale, n: number, rows?: { id: string }[]) {
  const data: Record<string, unknown> = {
    title: fill(locale, n, 60),
    slug: `${locale}-doc-${n}`,
    summary: fill(locale, n, 300),
    body: fill(locale, n, 1200),
    seo: { metaTitle: fill(locale, n, 55), metaDescription: fill(locale, n, 150) },
    _status: "published",
  };
  for (let i = 1; i <= 24; i++) data[`text${String(i).padStart(2, "0")}`] = fill(locale, n * 100 + i, 40);
  const count = rows?.length ?? 6;
  data["sections"] = Array.from({ length: count }, (_, i) => ({
    ...(rows?.[i] ? { id: rows[i].id } : {}),
    heading: fill(locale, n * 10 + i, 40),
    text: fill(locale, n * 10 + i, 400),
  }));
  return data;
}
