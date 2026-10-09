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

// The two @ts-expect-error lines fail `tsc` when the flag behind them is dropped from the presets.
export function firstLocale(locales: Locale[]): Locale {
  // @ts-expect-error noUncheckedIndexedAccess: an indexed read is `Locale | undefined`
  return locales[0];
}

// @ts-expect-error strict (noImplicitAny): a parameter without a type is an error
export const identity = (value) => value;

// ES2023 library method
export function sortedGreetings(): string[] {
  return LOCALES.map(greet).toSorted((a, b) => a.localeCompare(b));
}
