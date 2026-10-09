import { cacheLife, cacheTag } from "next/cache";

/**
 * A `cacheLife` profile: one of Next's built-in names (the table in the `cacheLife` docs), or an
 * inline `{ stale, revalidate, expire }` in seconds. Add the names of `cacheLife` profiles from
 * `next.config.ts` here if the app ever defines some.
 */
export type CacheLifeProfile =
  | "default"
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "max"
  | { stale?: number; revalidate?: number; expire?: number };

// `cacheLife` is declared as one overload per profile name, and TypeScript does not accept a union
// for them; at run time it takes any of the values above.
const setLife = cacheLife as unknown as (profile: CacheLifeProfile) => void;

export type CachedOptions = {
  /**
   * The entry's name, and so the first part of its key. Unique per function: every wrapped function
   * shares the one `"use cache"` function below, which Next keys by its location, its arguments
   * and nothing else.
   */
  name: string;
  /** Tags `revalidateTag` can invalidate, e.g. `medusa:regions` (SPEC §8.3). */
  tags: readonly string[];
  life: CacheLifeProfile;
};

type Loader = (...args: never[]) => Promise<unknown>;

const loaders = new Map<string, Loader>();

/**
 * The only `"use cache"` function the data layer has. It takes plain data, so Next can build the
 * cache key from it: the name, the tags and the life are arguments, and so are the wrapped
 * function's own. The plan's first text had the wrapper close over the function instead
 * (`cached(fn, opts)` returning `async (...args) => { "use cache"; … fn(...args) }`); Next refuses
 * that when the wrapper is created, in `next dev` (T12 tried it): `Functions cannot be passed
 * directly to Client Components unless you explicitly expose it by marking it with "use server"`,
 * because a captured variable becomes part of the cache key.
 */
async function run(
  name: string,
  tags: string[],
  life: CacheLifeProfile,
  args: unknown[],
): Promise<unknown> {
  "use cache";
  cacheTag(...tags);
  setLife(life);
  const load = loaders.get(name);
  if (load === undefined) throw new Error(`cached("${name}") was never created in this process`);
  return load(...(args as never[]));
}

/**
 * Wraps a data function in `"use cache"` + `cacheTag` + `cacheLife` (T12, SPEC §8.3), so a call is
 * served from the cache and a tag invalidates it. This is the only file that knows how the data
 * layer caches: S1's fallback (`cacheComponents: false`) swaps `run` for
 * `unstable_cache(load, [name], { tags, revalidate })` and nothing else changes.
 *
 * The function's arguments and its result must be serializable (plain objects, arrays, strings,
 * numbers, `undefined`/`null`), and its arguments are the rest of the cache key: pass the region
 * and the locale in, never read them from a request inside (SPEC §8.3). A call that throws caches
 * nothing.
 */
export function cached<Args extends unknown[], Result>(
  load: (...args: Args) => Promise<Result>,
  { name, tags, life }: CachedOptions,
): (...args: Args) => Promise<Result> {
  loaders.set(name, load as unknown as Loader);
  const tagList = [...tags];
  return (...args) => run(name, tagList, life, args) as Promise<Result>;
}
