// A class that appears nowhere else in the repo's scanned sources. apps/storefront/e2e/styles-fonts.spec.ts
// looks for its rule in the built stylesheet: if `@source "../"` in globals.css stops covering this
// package, the rule disappears and the spec fails. Delete this file once an atom (T21) gives that
// spec a real class to look for.
export const SOURCE_PROBE_CLASS = "min-w-[37.5rem]";
