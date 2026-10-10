// How often each cached loader of the test-only routes really ran in this process; a cache hit does
// not move it. Kept on `globalThis` because the routes that read and the route that reports are
// separate bundles.
type Runs = Record<string, number>;
const holder = globalThis as typeof globalThis & { __e2eRuns?: Runs };
export const runs: Runs = (holder.__e2eRuns ??= {});

export function bump(key: string): number {
  runs[key] = (runs[key] ?? 0) + 1;
  return runs[key];
}
