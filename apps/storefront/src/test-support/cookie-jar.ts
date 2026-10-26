import { vi } from "vitest";

/** A cookie as `cookies().set` received it. */
export type SetCookie = { name: string; value: string; options: Record<string, unknown> };

/**
 * A stand-in for `next/headers`' `cookies()`: what the request carries (`values`) and what the
 * code set (`writes`, in order). `set` also updates `values`, as the real store does for later
 * reads in the same request. Use with `vi.mock("next/headers", () => ({ cookies: jar.cookies }))`.
 */
export function createCookieJar(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const writes: SetCookie[] = [];
  const store = {
    get: (name: string) => (values.has(name) ? { name, value: values.get(name) ?? "" } : undefined),
    set: (name: string, value: string, options: Record<string, unknown> = {}) => {
      writes.push({ name, value, options });
      if (options.maxAge === 0) values.delete(name);
      else values.set(name, value);
    },
  };
  return {
    values,
    writes,
    cookies: vi.fn(async () => store),
    reset(next: Record<string, string> = {}) {
      values.clear();
      for (const [name, value] of Object.entries(next)) values.set(name, value);
      writes.length = 0;
    },
  };
}
