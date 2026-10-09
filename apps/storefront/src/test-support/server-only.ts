// Vitest's stand-in for the `server-only` package, which throws when it is imported outside
// Next's server bundle. `vitest.config.ts` aliases it here so the data layer can be tested.
export {};
