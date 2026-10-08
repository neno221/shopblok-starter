// Compiles under every tsconfig preset: `pnpm typecheck` runs tsc over this file with each one.
// It imports nothing relative, because the node preset needs `./x.ts` and the others reject it.
export type Locale = "en" | "el" | "de" | "fr";

export const LOCALES = ["en", "el", "de", "fr"] as const satisfies readonly Locale[];

const greetings = {
  en: "Hello",
  el: "Γεια σας",
  de: "Hallo",
  fr: "Bonjour",
} satisfies Record<Locale, string>;

export function greet(locale: Locale): string {
  return greetings[locale];
}

// noUncheckedIndexedAccess: an indexed read is `T | undefined`, so the fallback is required.
export function firstLocale(): Locale {
  const [first] = LOCALES;
  return first ?? "en";
}

// ES2023 library method
export function sortedGreetings(): string[] {
  return LOCALES.map(greet).toSorted((a, b) => a.localeCompare(b));
}
