// Ours (T33, SETUP.md "Discovery and site-wide molecules (T33)"; PR 43 review, item 12). Which ISO
// 3166-1 alpha-2 codes `country-flag-icons` draws, with no React and no flag in it: the package's
// root module is the list of codes alone, and the React set is imported as a type, which
// TypeScript erases. A client component (MarketSwitcher's) can check a code with this and still
// never pull the flags in; only `flag.tsx`, a server component, imports them (D49).
import { hasFlag } from "country-flag-icons";
import type * as flags from "country-flag-icons/react/3x2";

/** A code of the 3x2 set, in upper case (`CY`). */
type FlagCode = keyof typeof flags;

/** Whether the set has a flag for this ISO 3166-1 alpha-2 code (either case). */
function isFlagCode(code: string): code is FlagCode | Lowercase<FlagCode> {
  const upper = code.toUpperCase();
  // The package also lists regions such as `BQ-BO`, which are not alpha-2 codes.
  return /^[A-Z]{2}$/.test(upper) && hasFlag(upper);
}

export { isFlagCode };
export type { FlagCode };
